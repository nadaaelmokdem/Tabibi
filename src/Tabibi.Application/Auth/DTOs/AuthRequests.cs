using Tabibi.Application.Common;

namespace Tabibi.Application.Auth.DTOs
{
    public class LoginRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class SignupRequest
    {
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
        public string Role { get; set; } = ApplicationRoles.Patient;
    }

    public class AddToRoleRequest
    {
        public required string Email { get; set; }
        public required string Role { get; set; }
    }

    public class CheckMailRequest
    {
        public required string Email { get; set; }
        public bool IsDoctor { get; set; }
    }
}
