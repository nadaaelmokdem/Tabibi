using Microsoft.AspNetCore.Identity;
using Tabibi.Models;
using static Tabibi.Services.AuthService;

namespace Tabibi.Services
{
    public class TokenService(ITokenStore _tokenStore, UserManager<AppUser> userManager,  AuthUtils authUtils)
    {
        private async Task<TokenRefreshResult?> GenerateResultAsync(string userId, string refreshToken)
{
    var user = await userManager.FindByIdAsync(userId);
    if (user is null) return null;

    var roles = await userManager.GetRolesAsync(user);
    var jwtToken = authUtils.GenerateJwtToken(user, roles);
    return new TokenRefreshResult(refreshToken, jwtToken);
}

        public async Task<TokenRefreshResult?> RefreshTokenAsync(string oldRefreshToken)
        {
            TimeSpan tokenLifetime = TimeSpan.FromDays(7);
            TimeSpan gracePeriod = TimeSpan.FromSeconds(30);

            var activeReplacement = await _tokenStore.GetActiveReplacementAsync(oldRefreshToken);
            if (activeReplacement is not null)
            {
                var existingUserId = await _tokenStore.GetUserIdByTokenAsync(activeReplacement);
                return existingUserId is not null ? await GenerateResultAsync(existingUserId, activeReplacement) : null;
            }

            var userId = await _tokenStore.GetUserIdByTokenAsync(oldRefreshToken);
            if (userId is null) return null;

            var newToken = authUtils.GenerateRefreshToken();
            bool success = await _tokenStore.TryRotateTokenAsync(oldRefreshToken, newToken, userId, tokenLifetime, gracePeriod);

            if (success)
            {
                return await GenerateResultAsync(userId, newToken);
            }

            return null;
        }
    }
}
