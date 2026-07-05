using System.Security.Claims;

namespace Tabibi.Extensions
{
    public static class IdentityUserExtensions
    {
        public static string? GetId(this ClaimsPrincipal user)
        {
            return user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? 
                   user.FindFirst("sub")?.Value;
        }
    }
}
