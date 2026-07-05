using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.DTOs;
using Tabibi.Application.Common;
using Tabibi.Domain.Entities;
using Tabibi.Domain.Repositories;

namespace Tabibi.Application.Auth.Services
{
    public class AuthService(
        IIdentityService identityService,
        IJwtTokenGenerator tokenGenerator,
        IRefreshTokenStore refreshTokenStore,
        IPatientProfileRepository patientProfileRepository,
        IDoctorProfileRepository doctorProfileRepository,
        IUnitOfWork unitOfWork) : IAuthService
    {
        private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);

        public async Task<Result> LogoutAsync(string refreshToken)
        {
            if (await refreshTokenStore.RevokeTokenAsync(refreshToken))
                return Result.Success();

            return Result.Failure("User is not logged in!");
        }

        public async Task<Result<EmailCheckResult>> CheckMailAsync(string email, bool isDoctor)
        {
            var user = await identityService.FindByEmailAsync(email);
            if (user is null)
                return Result<EmailCheckResult>.Failure("Email doesn't exist!", EmailCheckResult.NotFound);

            var expectedRole = isDoctor ? ApplicationRoles.Doctor : ApplicationRoles.Patient;
            if (await identityService.IsInRoleAsync(user.Id, expectedRole))
                return Result<EmailCheckResult>.Success(EmailCheckResult.Ok);

            return Result<EmailCheckResult>.Failure("Unauthorized user!", EmailCheckResult.WrongRole);
        }

        public async Task<Result<AuthResult>> LoginAsync(LoginRequest request)
        {
            var user = await identityService.FindByEmailAsync(request.Email);
            if (user is null)
                return Result<AuthResult>.Failure("User is not registered!");

            var outcome = await identityService.CheckPasswordAsync(user.Id, request.Password);
            if (outcome != PasswordCheckOutcome.Succeeded)
                return Result<AuthResult>.Failure("Incorrect username or password!");

            var roles = await identityService.GetRolesAsync(user.Id);
            var isVerified = await GetDoctorVerificationStatusAsync(user.Id, roles);
            var userResponse = user.ToUserResponse(roles, isVerified);

            var authResult = await IssueTokensAsync(user, userResponse);
            return Result<AuthResult>.Success(authResult);
        }

        public async Task<Result<AuthResult>> RegisterAsync(SignupRequest request)
        {
            if (string.IsNullOrEmpty(request.Email))
                return Result<AuthResult>.Failure("Email is required!");

            if (string.IsNullOrEmpty(request.PhoneNumber))
                return Result<AuthResult>.Failure("Phone number is required!");

            var (createResult, userId) = await identityService.CreateUserAsync(
                new NewIdentityUser(request.Email, request.FullName, request.Password, request.PhoneNumber));

            if (!createResult.Succeeded || userId is null)
                return Result<AuthResult>.Failure(string.Join(", ", createResult.Errors));

            try
            {
                await unitOfWork.ExecuteInTransactionAsync(async ct =>
                {
                    var identityResult = await AssignRoleAndCreateProfileAsync(userId, request.Role);
                    if (!identityResult.Succeeded)
                        throw new TransactionAbortedException(string.Join(", ", identityResult.Errors));

                    await unitOfWork.SaveChangesAsync(ct);
                    return true;
                });
            }
            catch (TransactionAbortedException ex)
            {
                return Result<AuthResult>.Failure(ex.Message);
            }

            var user = await identityService.FindByIdAsync(userId)
                ?? throw new InvalidOperationException("User vanished immediately after creation.");

            var roles = await identityService.GetRolesAsync(userId);
            var isVerified = await GetDoctorVerificationStatusAsync(userId, roles);
            var userResponse = user.ToUserResponse(roles, isVerified);

            var authResult = await IssueTokensAsync(user, userResponse);
            return Result<AuthResult>.Success(authResult);
        }

        public async Task<Result> AddToRoleAsync(string email, string role)
        {
            var user = await identityService.FindByEmailAsync(email);
            if (user is null)
                return Result.Failure("User doesn't exist!");

            try
            {
                await unitOfWork.ExecuteInTransactionAsync(async ct =>
                {
                    var identityResult = await AssignRoleAndCreateProfileAsync(user.Id, role);
                    if (!identityResult.Succeeded)
                        throw new TransactionAbortedException(string.Join(", ", identityResult.Errors));

                    await unitOfWork.SaveChangesAsync(ct);
                    return true;
                });
            }
            catch (TransactionAbortedException ex)
            {
                return Result.Failure(ex.Message);
            }

            return Result.Success();
        }

        /// <summary>
        /// Assigns the identity role and ensures the matching profile row exists.
        /// Throws <see cref="TransactionAbortedException"/> for an unrecognised role so the
        /// caller's transaction rolls back cleanly instead of committing a half-done state.
        /// </summary>
        private async Task<IdentityOperationResult> AssignRoleAndCreateProfileAsync(string userId, string role)
        {
            if (role.Equals(ApplicationRoles.Doctor, StringComparison.OrdinalIgnoreCase))
            {
                var result = await identityService.AddToRoleAsync(userId, ApplicationRoles.Doctor);
                if (result.Succeeded && !await doctorProfileRepository.ExistsForUserAsync(userId))
                    doctorProfileRepository.Add(new DoctorProfile { UserId = userId });

                return result;
            }

            if (role.Equals(ApplicationRoles.Patient, StringComparison.OrdinalIgnoreCase))
            {
                var result = await identityService.AddToRoleAsync(userId, ApplicationRoles.Patient);
                if (result.Succeeded && !await patientProfileRepository.ExistsForUserAsync(userId))
                    patientProfileRepository.Add(new PatientProfile { UserId = userId });

                return result;
            }

            throw new TransactionAbortedException(
                "Incorrect role, valid options: (doctor, user) or keep the parameter empty!");
        }

        private async Task<bool> GetDoctorVerificationStatusAsync(string userId, IReadOnlyList<string> roles)
        {
            if (!roles.Contains(ApplicationRoles.Doctor))
                return false;

            var doctor = await doctorProfileRepository.GetByUserIdAsync(userId);
            return doctor?.IsVerified ?? false;
        }

        private async Task<AuthResult> IssueTokensAsync(IdentityUserInfo user, UserResponse userResponse)
        {
            var refreshToken = tokenGenerator.GenerateRefreshToken();
            await refreshTokenStore.StoreTokenAsync(refreshToken, user.Id, RefreshTokenLifetime);

            var roles = userResponse.Roles;
            return new AuthResult
            {
                User = userResponse,
                Token = tokenGenerator.GenerateJwtToken(user, roles),
                RefreshToken = refreshToken
            };
        }
    }
}
