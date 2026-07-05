using Tabibi.Application.Auth.DTOs;
using Tabibi.Application.Common;

namespace Tabibi.Application.Auth.Contracts
{
    public interface IAuthService
    {
        Task<Result> LogoutAsync(string refreshToken);
        Task<Result<EmailCheckResult>> CheckMailAsync(string email, bool isDoctor);
        Task<Result<AuthResult>> LoginAsync(LoginRequest request);
        Task<Result<AuthResult>> RegisterAsync(SignupRequest request);
        Task<Result> AddToRoleAsync(string email, string role);
    }

    public interface ITokenRefreshService
    {
        Task<TokenRefreshResult?> RefreshTokenAsync(string oldRefreshToken);
    }
}
