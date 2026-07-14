using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Tabibi.Models
{
  
        public class ChatSession
        {
            [Key]
            public int SessionId { get; set; }

            [Required]
            public int PatientId { get; set; }

            public int? DoctorId { get; set; }


            [Required]
            public ConsultationType ConsultationType { get; set; } = ConsultationType.Chat;

            [Required]
            public bool IsFreeMessage { get; set; } = true;

            public bool IsFollowUp { get; set; } = false;
            public bool IsCompanyPaid { get; set; } = false;

            [Column(TypeName = "decimal(10,2)")]
            public decimal? Price { get; set; } = null;  // null for free message

            public DateTime StartedAt { get; set; } = DateTime.UtcNow;
            public DateTime? EndedAt { get; set; }

            [Column(TypeName = "datetime2")]
            public DateTime? DoctorResponseAt { get; set; }

            public SessionStatus Status { get; set; } = SessionStatus.Active;

            public string? SessionSummary { get; set; }   // AI-generated summary

            // Navigation
            [ForeignKey(nameof(PatientId))]
            public PatientProfile Patient { get; set; } = null!;

            [ForeignKey(nameof(DoctorId))]
            public DoctorProfile? Doctor { get; set; }


            public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
            public SymptomAnalysis? SymptomAnalysis { get; set; }
            public Payment? Payment { get; set; }
        }

        public enum SessionStatus { Active, Completed, Abandoned }
        //public enum ConsultationType { Chat, Video, Call, Clinic }
    }

