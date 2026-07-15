using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Core.Models
{

    public class Appointment
    {
        [Key]
        public long AppointmentId { get; set; }

        public long PatientId { get; set; }
        public long DoctorId { get; set; }

        public DateTime ScheduledAt { get; set; }
        public int DurationMins { get; set; } = 30;

        [Required]
        public ConsultationType ConsultationType { get; set; } = ConsultationType.Chat;

        public AppointmentStatus Status { get; set; } = AppointmentStatus.Confirmed;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Price { get; set; } = 0;

        public string? Notes { get; set; }

        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Online;

        public long? SessionId { get; set; }

        // Navigation
        [ForeignKey(nameof(PatientId))]
        public PatientProfile Patient { get; set; } = null!;

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = null!;

        [ForeignKey(nameof(SessionId))]
        public ChatSession? ChatSession { get; set; }

        public Payment? Payment { get; set; }
        public DoctorReview? Review { get; set; }
    }

    public enum ConsultationType { Chat = 0, VideoCall = 1, Clinic = 2 }
    public enum AppointmentStatus { Confirmed = 1, Completed = 2, Cancelled = 3, Pending = 4 }
    public enum PaymentMethod { Online = 1, OnSite = 2 }

}