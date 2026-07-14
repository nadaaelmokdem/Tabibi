using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{

    public class Appointment
    {
        [Key]
        public int AppointmentId { get; set; }

        public int PatientId { get; set; }
        public int DoctorId { get; set; }

        public DateTime ScheduledAt { get; set; }
        public int DurationMins { get; set; } = 30;

        [Required]
        public ConsultationType ConsultationType { get; set; } = ConsultationType.Chat;

        public AppointmentStatus Status { get; set; } = AppointmentStatus.Confirmed;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Price { get; set; } = 0;

        [MaxLength(500)]
        public string? ChiefComplaint { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Online;

        public int? SessionId { get; set; }  // Link to ChatSession if applicable

        // Navigation
        [ForeignKey(nameof(PatientId))]
        public PatientProfile Patient { get; set; } = null!;

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = null!;

        [ForeignKey(nameof(SessionId))]
        public ChatSession? ChatSession { get; set; }

        public Prescription? Prescription { get; set; }
        public Payment? Payment { get; set; }
        public DoctorReview? Review { get; set; }
    }

    public enum ConsultationType { Chat = 0, VideoCall = 1, Clinic = 2 }
    public enum AppointmentStatus { Confirmed = 1, Completed = 2, Cancelled = 3, Pending = 4 }
    public enum PaymentMethod { Online = 1, OnSite = 2 }

}
