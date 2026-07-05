using Tabibi.Application.Auth.Contracts;

namespace Tabibi.Application.Auth.Contracts
{
    public interface IJwtTokenGenerator
    {
        string GenerateJwtToken(IdentityUserInfo user, IReadOnlyList<string> roles);
        string GenerateRefreshToken();
    }
}
