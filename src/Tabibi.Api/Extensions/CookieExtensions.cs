namespace Tabibi.Api.Extensions
{
    public static class CookieExtensions
    {
        private const string RefreshTokenCookieName = "X-Refresh-Token";
        private const string AccessTokenCookieName = "X-Access-Token";

        public static void SetRefreshTokenCookie(this IResponseCookies cookies, string token, int days = 7)
        {
            cookies.Append(RefreshTokenCookieName, token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(days)
            });
        }

        public static void DeleteRefreshTokenCookie(this IResponseCookies cookies)
        {
            cookies.Append(RefreshTokenCookieName, "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(-1)
            });
        }

        public static void SetAccessTokenCookie(this IResponseCookies cookies, string token, int minutes = 60)
        {
            cookies.Append(AccessTokenCookieName, token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddMinutes(minutes)
            });
        }

        public static void DeleteAccessTokenCookie(this IResponseCookies cookies)
        {
            cookies.Append(AccessTokenCookieName, "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(-1)
            });
        }
    }
}
