using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{
 
        public class PrescriptionItem
        {
            [Key]
            public int ItemId { get; set; }

            public int PrescriptionId { get; set; }

            [Required, MaxLength(200)]
            public string MedicationName { get; set; } = "";

            [MaxLength(100)]
            public string? Dosage { get; set; }       // e.g. "500mg"

            [MaxLength(100)]
            public string? Frequency { get; set; }    // e.g. "Twice daily"

            public int DurationDays { get; set; }

            [MaxLength(500)]
            public string? Instructions { get; set; }

            // Navigation
            [ForeignKey(nameof(PrescriptionId))]
            public Prescription Prescription { get; set; } = null!;
        }
    }
