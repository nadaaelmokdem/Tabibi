using Microsoft.AspNetCore.Identity;
using Tabibi.DTOs;
using Tabibi.Shared;
using Tabibi.Extensions;
using Tabibi.Models;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Tabibi.Services
{
    public class AuthService(ITokenStore tokenStore, SignInManager<AppUser> signInManager,
        UserManager<AppUser> userManager, AuthUtils authUtils)
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
            if (signupRequest.Role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
            {
                user.DoctorProfile = new();
                await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                await userManager.UpdateAsync(user);
            }
            else if (signupRequest.Role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
            {
                user.PatientProfile = new();
                await userManager.AddToRoleAsync(user, UserRoles.Patient);
                await userManager.UpdateAsync(user);
            }
            else
            {
                return ServiceResult<LoginDTO?>.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
            }

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
                    Token = authUtils.GenerateJwtToken(user , roles),
                    RefreshToken = refreshToken,
                });
            }
            return ServiceResult<LoginDTO?>.Failure(string.Join(", ", res.Errors.Select(e => e.Description)));
        }

        public async Task<ServiceResult> AddToRole(string email, string role)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
                return ServiceResult.Failure("User doesn't exist!");

            IdentityResult? res;

            if (role.Equals(UserRoles.Doctor, StringComparison.CurrentCultureIgnoreCase))
            {
                user.DoctorProfile = new();
                res = await userManager.AddToRoleAsync(user, UserRoles.Doctor);
                await userManager.UpdateAsync(user);
            }
            else if (role.Equals(UserRoles.Patient, StringComparison.CurrentCultureIgnoreCase))
            {
                user.PatientProfile = new();
                res = await userManager.AddToRoleAsync(user, UserRoles.Patient);
                await userManager.UpdateAsync(user);
            }
            else
            {
                return ServiceResult.Failure("Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
            }

            if (res.Succeeded)
            {
                return ServiceResult.Success();
            }
            return ServiceResult.Failure(string.Join(", ", res.Errors.Select(e => e.Description)));

        }
    }
}
