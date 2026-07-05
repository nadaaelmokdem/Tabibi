using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.DTOs;

namespace Tabibi.Application.Auth.Services
{
    public class TokenRefreshService(
        IRefreshTokenStore refreshTokenStore,
        IIdentityService identityService,
        IJwtTokenGenerator tokenGenerator) : ITokenRefreshService
    {
        private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);
        private static readonly TimeSpan GracePeriod = TimeSpan.FromSeconds(30);

        public async Task<TokenRefreshResult?> RefreshTokenAsync(string oldRefreshToken)
        {
            // A client may retry with a token that was *just* rotated (e.g. two tabs
            // refreshing concurrently); honor the grace-period replacement instead of
            // rejecting a technically-valid-but-superseded token.
            var activeReplacement = await refreshTokenStore.GetActiveReplacementAsync(oldRefreshToken);
            if (activeReplacement is not null)
            {
                var existingUserId = await refreshTokenStore.GetUserIdByTokenAsync(activeReplacement);
                return existingUserId is not null
                    ? await GenerateResultAsync(existingUserId, activeReplacement)
                    : null;
            }

            var userId = await refreshTokenStore.GetUserIdByTokenAsync(oldRefreshToken);
            if (userId is null)
                return null;

            var newToken = tokenGenerator.GenerateRefreshToken();
            var rotated = await refreshTokenStore.TryRotateTokenAsync(
                oldRefreshToken, newToken, userId, RefreshTokenLifetime, GracePeriod);

            return rotated ? await GenerateResultAsync(userId, newToken) : null;
        }

        private async Task<TokenRefreshResult?> GenerateResultAsync(string userId, string refreshToken)
        {
            var user = await identityService.FindByIdAsync(userId);
            if (user is null)
                return null;

            var roles = await identityService.GetRolesAsync(userId);
            var jwtToken = tokenGenerator.GenerateJwtToken(user, roles);
            return new TokenRefreshResult { NewRefreshToken = refreshToken, JwtToken = jwtToken };
        }
    }
}
