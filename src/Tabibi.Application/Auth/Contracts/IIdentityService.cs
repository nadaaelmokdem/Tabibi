namespace Tabibi.Application.Auth.Contracts
{
    /// <summary>
    /// Minimal read model of an identity user, decoupled from ASP.NET Core Identity's
    /// IdentityUser/AppUser so the Application layer has zero dependency on it.
    /// </summary>
    public record IdentityUserInfo(
        string Id,
        string Email,
        string FullName,
        string PhoneNumber,
        bool IsActive,
        DateTime CreatedAt);

    public record NewIdentityUser(
        string Email,
        string FullName,
        string Password,
        string PhoneNumber);

    public record IdentityOperationResult(bool Succeeded, IReadOnlyList<string> Errors)
    {
        public static IdentityOperationResult Success() => new(true, Array.Empty<string>());
        public static IdentityOperationResult Failure(params string[] errors) => new(false, errors);
    }

    public enum PasswordCheckOutcome { Succeeded, Failed, LockedOut, NotAllowed }

    /// <summary>
    /// Port defined by Application, implemented by Infrastructure on top of
    /// UserManager&lt;AppUser&gt; / SignInManager&lt;AppUser&gt; / RoleManager&lt;IdentityRole&gt;.
    /// </summary>
    public interface IIdentityService
    {
        Task<IdentityUserInfo?> FindByEmailAsync(string email);
        Task<IdentityUserInfo?> FindByIdAsync(string userId);
        Task<PasswordCheckOutcome> CheckPasswordAsync(string userId, string password);
        Task<IReadOnlyList<string>> GetRolesAsync(string userId);
        Task<bool> IsInRoleAsync(string userId, string role);
        Task<(IdentityOperationResult Result, string? UserId)> CreateUserAsync(NewIdentityUser newUser);
        Task<IdentityOperationResult> AddToRoleAsync(string userId, string role);
    }
}
