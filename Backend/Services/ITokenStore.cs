namespace Tabibi.Services
{
    public interface ITokenStore
    {
        Task<string?> GetUserIdByTokenAsync(string token);
        Task<string?> GetActiveReplacementAsync(string token);
        Task<bool> TryRotateTokenAsync(string oldToken, string newToken, string userId, TimeSpan lifetime, TimeSpan gracePeriod);
        Task<bool> StoreTokenAsync(string token, string userId, TimeSpan lifetime);
        Task<bool> RevokeTokenAsync(string token);
        Task CleanupExpiredTokensAsync();
    }
}
