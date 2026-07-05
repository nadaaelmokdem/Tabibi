using Tabibi.Domain.Enums;

namespace Tabibi.Domain.Entities
{
    public class Appointment
    {
        public int AppointmentId { get; set; }

        public int PatientId { get; set; }
        public int DoctorId { get; set; }

        public DateTime ScheduledAt { get; set; }
        public int DurationMins { get; set; } = 30;

        public ConsultationType ConsultationType { get; set; } = ConsultationType.Chat;

        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

        public decimal Price { get; set; } = 0;

        public string? ChiefComplaint { get; set; }

        public string? Notes { get; set; }

        public int? SessionId { get; set; }

        // Navigation
        public PatientProfile Patient { get; set; } = null!;
        public DoctorProfile Doctor { get; set; } = null!;
        public ChatSession? ChatSession { get; set; }
        public Prescription? Prescription { get; set; }
        public Payment? Payment { get; set; }
        public DoctorReview? Review { get; set; }
    }
}
