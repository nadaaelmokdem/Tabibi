namespace Tabibi.DTOs
{
    public class LoginDTO
    {
        public required UserResponse User { get; set; }
        public required string Token { get; set; }
        public required string RefreshToken { get; set; }
    }
}
