using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Core.Models
{
    public class PatientQuota
    {
        [Key]
        public long QuotaId { get; set; }

        [Required]
        public long PatientId { get; set; }

        public int AvailableAiMessages { get; set; } = 15;
        public int AvailablePremiumAiMessages { get; set; } = 0;
        public DateTime LastAiMessageReset { get; set; } = DateTime.UtcNow;

        public int AvailableFreeGpMessages { get; set; } = 2;
        public DateTime LastFreeGpMessageReset { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(PatientId))]
        public PatientProfile Patient { get; set; } = null!;
    }
}

