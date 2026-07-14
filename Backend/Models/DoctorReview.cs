using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{
  
        public class DoctorReview
        {
            [Key]
            public int ReviewId { get; set; }

            public int AppointmentId { get; set; }

            [Range(1, 5)]
            public int Rating { get; set; }

            [MaxLength(1000)]
            public string? Comment { get; set; }

            public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

            // Navigation
            [ForeignKey(nameof(AppointmentId))]
            public Appointment Appointment { get; set; } = null!;

        }
    }
