namespace Tabibi.Application.Common
{
    /// <summary>
    /// IMPORTANT: These string values are persisted in the AspNetRoles table of the
    /// existing database. They must not change during the refactor even though
    /// "Patient" -> "User" looks like a naming inconsistency - it is intentional
    /// and pre-existing, preserved here to avoid a breaking migration.
    /// </summary>
    public static class ApplicationRoles
    {
        public const string Patient = "User";
        public const string Doctor = "Doctor";
        public const string Admin = "Admin";
    }
}
