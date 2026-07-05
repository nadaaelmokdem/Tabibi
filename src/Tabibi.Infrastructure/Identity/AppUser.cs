using Microsoft.AspNetCore.Identity;

namespace Tabibi.Infrastructure.Identity
{
    /// <summary>
    /// Deliberately lives in Infrastructure, not Domain: it extends IdentityUser,
    /// which is an ASP.NET Core Identity (persistence/framework) concern. The
    /// Application layer only ever sees the framework-agnostic IdentityUserInfo
    /// record via IIdentityService.
    /// </summary>
    public class AppUser : IdentityUser
    {
        public required string FullName { get; set; }

        public string? GoogleId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
