namespace Tabibi.Extensions
{
    public static class CookieExtensions
    {
        private const string RefreshTokenCookieName = "X-Refresh-Token";
        private const string AccessTokenCookieName = "X-Access-Token";

        private static bool UseSecureCookies =>
            //!string.Equals(
            //    Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            //    "Development",
            //    StringComparison.OrdinalIgnoreCase);
            true;

        public static void SetRefreshTokenCookie(this IResponseCookies cookies, string token, int days = 7)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = UseSecureCookies,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(days)
            };

            cookies.Append(RefreshTokenCookieName, token, cookieOptions);
        }

        public static void DeleteRefreshTokenCookie(this IResponseCookies cookies)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = UseSecureCookies,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(-1)
            };

            cookies.Append(RefreshTokenCookieName, "", cookieOptions);
        }

        public static void SetAccessTokenCookie(this IResponseCookies cookies, string token, int minutes = 60)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = UseSecureCookies,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddMinutes(minutes)
            };

            cookies.Append(AccessTokenCookieName, token, cookieOptions);
        }

        public static void DeleteAccessTokenCookie(this IResponseCookies cookies)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = UseSecureCookies,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(-1)
            };

            cookies.Append(AccessTokenCookieName, "", cookieOptions);
        }
    }
}
