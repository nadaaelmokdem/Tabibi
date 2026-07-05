namespace Tabibi.Application.Auth.DTOs
{
    public class UserResponse
    {
        public string Id { get; set; } = "";
        public string Email { get; set; } = "";
        public string FullName { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new();
        public bool IsVerified { get; set; }
    }

    public class AuthResult
    {
        public required UserResponse User { get; set; }
        public required string Token { get; set; }
        public required string RefreshToken { get; set; }
    }

    public enum EmailCheckResult { Ok, NotFound, WrongRole }

    public class TokenRefreshResult
    {
        public required string NewRefreshToken { get; set; }
        public required string JwtToken { get; set; }
    }
}
