using Microsoft.AspNetCore.Identity;
using Tabibi.Application.Auth.Contracts;
using Tabibi.Infrastructure.Identity;

namespace Tabibi.Infrastructure.Identity
{
    public class IdentityService(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager) : IIdentityService
    {
        public async Task<IdentityUserInfo?> FindByEmailAsync(string email)
        {
            var user = await userManager.FindByEmailAsync(email);
            return user is null ? null : ToUserInfo(user);
        }

        public async Task<IdentityUserInfo?> FindByIdAsync(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            return user is null ? null : ToUserInfo(user);
        }

        public async Task<PasswordCheckOutcome> CheckPasswordAsync(string userId, string password)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
                return PasswordCheckOutcome.Failed;

            var result = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);

            if (result.Succeeded) return PasswordCheckOutcome.Succeeded;
            if (result.IsLockedOut) return PasswordCheckOutcome.LockedOut;
            if (result.IsNotAllowed) return PasswordCheckOutcome.NotAllowed;
            return PasswordCheckOutcome.Failed;
        }

        public async Task<IReadOnlyList<string>> GetRolesAsync(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
                return Array.Empty<string>();

            var roles = await userManager.GetRolesAsync(user);
            return roles.ToList();
        }

        public async Task<bool> IsInRoleAsync(string userId, string role)
        {
            var user = await userManager.FindByIdAsync(userId);
            return user is not null && await userManager.IsInRoleAsync(user, role);
        }

        public async Task<(IdentityOperationResult Result, string? UserId)> CreateUserAsync(NewIdentityUser newUser)
        {
            var user = new AppUser
            {
                UserName = newUser.Email,
                Email = newUser.Email,
                FullName = newUser.FullName,
                PhoneNumber = newUser.PhoneNumber,
                EmailConfirmed = false,
                PhoneNumberConfirmed = false
            };

            var result = await userManager.CreateAsync(user, newUser.Password);
            if (!result.Succeeded)
                return (IdentityOperationResult.Failure(result.Errors.Select(e => e.Description).ToArray()), null);

            return (IdentityOperationResult.Success(), user.Id);
        }

        public async Task<IdentityOperationResult> AddToRoleAsync(string userId, string role)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
                return IdentityOperationResult.Failure("User not found.");

            var result = await userManager.AddToRoleAsync(user, role);
            return result.Succeeded
                ? IdentityOperationResult.Success()
                : IdentityOperationResult.Failure(result.Errors.Select(e => e.Description).ToArray());
        }

        private static IdentityUserInfo ToUserInfo(AppUser user) => new(
            user.Id,
            user.Email ?? "",
            user.FullName,
            user.PhoneNumber ?? "",
            user.IsActive,
            user.CreatedAt);
    }
}
