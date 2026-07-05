using Microsoft.AspNetCore.Identity;
using Tabibi.DTOs;
using Tabibi.Shared;
using Tabibi.Extensions;
using Tabibi.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Tabibi.Data;

namespace Tabibi.Services
{
    public class AuthService(ITokenStore tokenStore, SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager, AuthUtils authUtils, AppDbContext dbContext)
    {
        public record TokenRefreshResult(string NewRefreshToken, string JwtToken);

        public async Task<ServiceResult> Logout(string token)
        {
            if (await tokenStore.RevokeTokenAsync(token))
            {
                return ServiceResult.Success();
            }
            return ServiceResult.Failure("User is not logged in!");
        }

        public async Task<ServiceResult<EmailResultEnum>> CheckMail(string mail, bool isDoctor = false)
        {
            var user = await userManager.FindByEmailAsync(mail);
            if (user is null)
                return ServiceResult<EmailResultEnum>.Failure("Email doesn't exist!", EmailResultEnum.NotFound);

            var roleEnum = isDoctor == false ? UserRoles.Patient : UserRoles.Doctor;
            if (await userManager.IsInRoleAsync(user, roleEnum))
            {
                return ServiceResult<EmailResultEnum>.Success(EmailResultEnum.Ok); ;
            }
            return ServiceResult<EmailResultEnum>.Failure("Unauthorized user!", EmailResultEnum.WrongRole);
        }

        public async Task<ServiceResult<LoginDTO?>> Login(LoginRequest req)
        {
            var user = await userManager.FindByEmailAsync(req.Email);
            if (user is null)
                return ServiceResult<LoginDTO?>.Failure("User is not registered!");

            var res = await signInManager.CheckPasswordSignInAsync(user, req.Password, true);
            if (res.Succeeded)
            {
                var roles = await userManager.GetRolesAsync(user);
                var userResponse = user.ToResponse();
                userResponse.Roles = roles.ToList();

                var refreshToken = authUtils.GenerateRefreshToken();
                TimeSpan tokenLifetime = TimeSpan.FromDays(7);
                await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);

                return ServiceResult<LoginDTO?>.Success(new LoginDTO
                {
                    User = userResponse,
Token = authUtils.GenerateJwtToken(user, roles),
                    RefreshToken = refreshToken
                });
            }
            return ServiceResult<LoginDTO?>.Failure("Incorrect username or password!");
        }


        public async Task<ServiceResult<LoginDTO?>> Register(SignupRequest signupRequest)
        {
            if (string.IsNullOrEmpty(signupRequest.Email))
            {
                return ServiceResult<LoginDTO?>.Failure("Email is required!");
            }
            if (string.IsNullOrEmpty(signupRequest.PhoneNumber))
            {
                return ServiceResult<LoginDTO?>.Failure("Phone number is required!");
            }
            var user = new AppUser
            {
                UserName = signupRequest.Email,
                FullName = signupRequest.FullName,
                Email = signupRequest.Email,
                EmailConfirmed = false,
                PhoneNumber = signupRequest.PhoneNumber,
                PhoneNumberConfirmed = false
            };

            var res = await userManager.CreateAsync(user, signupRequest.Password);
            if (!res.Succeeded)
            {
                return ServiceResult<LoginDTO?>.Failure(string.Join(", ", res.Errors.Select(e => e.Description)));
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync();
            try
            {
                if (signupRequest.Role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
                {
                    await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                    dbContext.DoctorProfiles.Add(new DoctorProfile { UserId = user.Id });
                }
                else if (signupRequest.Role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
                {
                    await userManager.AddToRoleAsync(user, UserRoles.Patient);
                    dbContext.PatientProfiles.Add(new PatientProfile { UserId = user.Id });
                }
                else
                {
                    await transaction.RollbackAsync();
                    return ServiceResult<LoginDTO?>.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
                }

                await dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            var roles = await userManager.GetRolesAsync(user);
            var userResponse = user.ToResponse();
            userResponse.Roles = roles.ToList();

            var refreshToken = authUtils.GenerateRefreshToken();
            TimeSpan tokenLifetime = TimeSpan.FromDays(7);
            await tokenStore.StoreTokenAsync(refreshToken, user.Id, tokenLifetime);
            return ServiceResult<LoginDTO?>.Success(new LoginDTO
            {
                User = userResponse,
                Token = authUtils.GenerateJwtToken(user , roles),
                RefreshToken = refreshToken,
            });
        }

        public async Task<ServiceResult> AddToRole(string email, string role)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
                return ServiceResult.Failure("User doesn't exist!");

            IdentityResult? res = null;

            using var transaction = await dbContext.Database.BeginTransactionAsync();
            try
            {
                if (role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
                {
                    res = await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                    if (res.Succeeded && !dbContext.DoctorProfiles.Any(p => p.UserId == user.Id))
                    {
                        dbContext.DoctorProfiles.Add(new DoctorProfile { UserId = user.Id });
                    }
                }
                else if (role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
                {
                    res = await userManager.AddToRoleAsync(user, UserRoles.Patient);
                    if (res.Succeeded && !dbContext.PatientProfiles.Any(p => p.UserId == user.Id))
                    {
                        dbContext.PatientProfiles.Add(new PatientProfile { UserId = user.Id });
                    }
                }
                else
                {
                    await transaction.RollbackAsync();
                    return ServiceResult.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
                }

                if (res != null && res.Succeeded)
                {
                    await dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return ServiceResult.Success();
                }
                else
                {
                    await transaction.RollbackAsync();
                    return ServiceResult.Failure(res != null ? string.Join(", ", res.Errors.Select(e => e.Description)) : "Role assignment failed");
                }
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

        }
    }
}
