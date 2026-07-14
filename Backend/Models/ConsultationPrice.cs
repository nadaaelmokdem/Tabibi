using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tabibi.Models
{
    public class ConsultationPrice
    {
        [Key]
        public int PriceId { get; set; }

        [Required]
        public int DoctorId { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal ClinicPrice { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal ChatPrice { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal VideoCallPrice { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = null!;

        public decimal GetPrice(ConsultationType type)
        {
            return type switch
            {
                ConsultationType.Chat => ChatPrice,
                ConsultationType.VideoCall => VideoCallPrice,
                ConsultationType.Clinic => ClinicPrice,
                _ => 0
            };
        }
    }
}
