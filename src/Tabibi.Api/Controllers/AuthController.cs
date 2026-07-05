using Microsoft.AspNetCore.Mvc;
using Tabibi.Api.Extensions;
using Tabibi.Application.Auth.Contracts;
using Tabibi.Application.Auth.DTOs;

namespace Tabibi.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(
        IAuthService authService,
        ITokenRefreshService tokenRefreshService) : ControllerBase
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] SignupRequest request)
        {
            var result = await authService.RegisterAsync(request);
            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            Response.Cookies.SetRefreshTokenCookie(result.Data!.RefreshToken);
            Response.Cookies.SetAccessTokenCookie(result.Data!.Token);

            return Ok(new { user = result.Data.User });
        }

        [HttpPost("add-to-role")]
        public async Task<IActionResult> AddToRole([FromBody] AddToRoleRequest request)
        {
            var result = await authService.AddToRoleAsync(request.Email, request.Role);

            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Created();
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await authService.LoginAsync(request);
            if (!result.IsSuccess)
                return NotFound("Invalid Email Or Password");

            Response.Cookies.SetRefreshTokenCookie(result.Data!.RefreshToken);
            Response.Cookies.SetAccessTokenCookie(result.Data!.Token);

            return Ok(new { user = result.Data.User });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                Request.Cookies.TryGetValue("X-Refresh-Token", out var token);
                Response.Cookies.DeleteRefreshTokenCookie();
                Response.Cookies.DeleteAccessTokenCookie();
                await authService.LogoutAsync(token ?? "");
                return Ok("Logged out successfully");
            }
            catch
            {
                return BadRequest("User is not logged in!");
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> Refresh()
        {
            Request.Cookies.TryGetValue("X-Refresh-Token", out var currentToken);
            if (string.IsNullOrEmpty(currentToken))
                return BadRequest("Invalid Token");

            var result = await tokenRefreshService.RefreshTokenAsync(currentToken);
            if (result is null)
                return Unauthorized("Invalid Token");

            Response.Cookies.Append("X-Refresh-Token", result.NewRefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7)
            });
            Response.Cookies.SetAccessTokenCookie(result.JwtToken);

            return Ok();
        }
    }
}
