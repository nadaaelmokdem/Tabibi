using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.DTOs;

namespace Tabibi.Application.Auth.Services
{
    internal static class AuthMappings
    {
        public static UserResponse ToUserResponse(this IdentityUserInfo user, IReadOnlyList<string> roles, bool isVerified = false)
        {
            return new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                Roles = roles.ToList(),
                IsVerified = isVerified
            };
        }
    }
}
