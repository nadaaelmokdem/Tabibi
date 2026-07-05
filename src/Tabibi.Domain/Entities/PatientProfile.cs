using Tabibi.Domain.Enums;

namespace Tabibi.Domain.Entities
{
    /// <summary>
    /// The patient-specific profile data that supplements an identity user account.
    /// Deliberately holds only a UserId string reference rather than a navigation
    /// property to the identity user, so the Domain layer never needs to know
    /// about ASP.NET Identity.
    /// </summary>
    public class PatientProfile
    {
        public int PatientId { get; set; }

        public string UserId { get; set; } = "";

        public string? Address { get; set; }

        public int? Age { get; set; }

        public double? Weight { get; set; }

        public double? Height { get; set; }

        public GenderTypes? Gender { get; set; }

        public string? EmergencyContact { get; set; }

        // Navigation (to other Domain entities only - never to AppUser)
        public ICollection<ChatSession> ChatSessions { get; set; } = new List<ChatSession>();
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
