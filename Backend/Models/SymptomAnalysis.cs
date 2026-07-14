using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{
  
        public class SymptomAnalysis
        {
            [Key]
            public int AnalysisId { get; set; }

            public int SessionId { get; set; }

            public string? SymptomsJson { get; set; }         // raw keywords JSON

            [MaxLength(100)]
            public string? SuggestedSpecialty { get; set; }

            [MaxLength(20)]
            public string? UrgencyLevel { get; set; }          // EMERGENCY / URGENT / ROUTINE / SELF_CARE

            [Column(TypeName = "decimal(5,2)")]
            public decimal AiConfidenceScore { get; set; }

            public int? RoutedDoctorId { get; set; }

            [MaxLength(500)]
            public string? Disclaimer { get; set; }

            public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

            // Navigation
            [ForeignKey(nameof(SessionId))]
            public ChatSession Session { get; set; } = null!;

            [ForeignKey(nameof(RoutedDoctorId))]
            public DoctorProfile? RoutedDoctor { get; set; }
        }
    }

