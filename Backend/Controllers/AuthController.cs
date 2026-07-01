using Microsoft.AspNetCore.Mvc;
using Tabibi.DTOs;
using Tabibi.Extensions;
using Tabibi.Services;
using LoginRequest = Tabibi.DTOs.LoginRequest;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(
        AuthService authService,
        TokenService tokenService) : ControllerBase
    {      

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] SignupRequest signupRequest)
        {
            var res = await authService.Register(signupRequest);
            if (!res.IsSuccess)
                return BadRequest(res.ErrorMessage);

            Response.Cookies.SetRefreshTokenCookie(res.Data!.RefreshToken);

            return Ok(new
            {
                user = res.Data.User,
                token = res.Data.Token
            });
        }

        [HttpPost("add-to-role")]
        public async Task<IActionResult> AddToRole([FromBody] AddToRoleDTO addToRoleDTO)
        {
            var result = await authService.AddToRole(addToRoleDTO.Email, addToRoleDTO.Role);

            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Created();
        }



        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var res = await authService.Login(req);
            if (!res.IsSuccess)
                return NotFound("Invalid Email Or Password");

            Response.Cookies.SetRefreshTokenCookie(res.Data!.RefreshToken);

            return Ok(new { 
                user = res.Data.User,
                token = res.Data.Token
            });

        }


        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                Request.Cookies.TryGetValue("X-Refresh-Token", out var token);
                Response.Cookies.DeleteRefreshTokenCookie();
                var res = await authService.Logout(token ?? "");
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
            if (string.IsNullOrEmpty(currentToken)) return BadRequest("Invalid Token");

            var result = await tokenService.RefreshTokenAsync(currentToken);
            if (result is null) return Unauthorized("Invalid Token");

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7)
            };

            Response.Cookies.Append("X-Refresh-Token", result.NewRefreshToken, cookieOptions);

            return Ok(new { token = result.JwtToken });
        }
    }
}
