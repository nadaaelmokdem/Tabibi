using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Core.Models
{
    public class VideoCallSession
    {
        [Key]
        public long SessionId { get; set; }

        [Required]
        public long PatientId { get; set; }

        public long DoctorId { get; set; }

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }
        public DateTime? ActualStartedAt { get; set; }

        public SessionStatus Status { get; set; } = SessionStatus.Active;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Price { get; set; }

        public string? MeetingLink { get; set; }

        // Navigation
        [ForeignKey(nameof(PatientId))]
        public PatientProfile Patient { get; set; } = null!;

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = null!;

        public Appointment? Appointment { get; set; }
    }
}
