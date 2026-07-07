namespace Tabibi.Shared
{
  public static class UserRoles
  {
      public const string Patient = "User";
      public const string Doctor = "Doctor";
      public const string Admin = "Admin";

      // Maps Identity role names to the lowercase "userType" string the frontend
      // routes on (ProtectedRoute compares against "user"/"doctor"/"admin").
      // Admin takes priority in case an account somehow holds multiple roles.
      public static string ToUserType(IList<string> roles)
      {
          if (roles.Contains(Admin)) return "admin";
          if (roles.Contains(Doctor)) return "doctor";
          return "user";
      }
  }
}
