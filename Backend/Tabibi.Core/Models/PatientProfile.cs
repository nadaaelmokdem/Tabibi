using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Core.Models
{
    public class PatientProfile
    {
        [Key]
        public long PatientId { get; set; }

        [Required]
        public string UserId { get; set; } = "";

        public string? Address { get; set; }

        public int? Age { get; set; }

        public double? Weight { get; set; }
        public double? Height { get; set; }

        [MaxLength(10)]
        public GenderTypes? Gender { get; set; }

        public string? ProfilePictureUrl { get; set; }

        [MaxLength(200)]
        public string? EmergencyContact { get; set; }

        // Navigation
        [ForeignKey(nameof(UserId))]
        public AppUser User { get; set; } = null!;

        public ICollection<ChatSession> ChatSessions { get; set; } = new List<ChatSession>();
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public PatientQuota? Quota { get; set; }
    }

    public enum GenderTypes { Male, Female }
}

