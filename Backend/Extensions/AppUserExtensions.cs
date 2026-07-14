using Tabibi.DTOs;
using Tabibi.Models;
using Tabibi.Shared;

namespace Tabibi.Extensions
{
    public static class AppUserExtensions
    {
        public static UserResponse ToResponse(this AppUser user)
        {
            return new UserResponse
            {
                Id = user.Id,
                Email = user.Email ?? "",
                FullName = user.FullName!,
                PhoneNumber = user.PhoneNumber!,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }
    }
}
