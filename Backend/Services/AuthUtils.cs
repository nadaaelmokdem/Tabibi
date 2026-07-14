using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Services
{
    public class AuthUtils(IConfiguration configuration)
    {
        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

       public string GenerateJwtToken(AppUser user, IList<string> roles)
{
    var secret = configuration["JwtSettings:Secret"];
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret ?? ""));
    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new List<Claim>
    {
        new Claim("sub", user.Id),
        new Claim("email", user.Email ?? ""),
        new Claim("name", user.FullName!),
        new Claim("phone", user.PhoneNumber ?? "")
    };

    foreach (var role in roles)
    {
        claims.Add(new Claim(ClaimTypes.Role, role));
    }

    var token = new JwtSecurityToken(
        issuer: configuration["JwtSettings:ValidIssuer"],
        audience: configuration["JwtSettings:ValidAudience"],
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(
            int.Parse(configuration["JwtSettings:DurationInMinutes"] ?? "60")),
        signingCredentials: credentials
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}
    }
}
