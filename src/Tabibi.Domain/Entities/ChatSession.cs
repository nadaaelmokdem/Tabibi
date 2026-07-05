using Tabibi.Domain.Enums;

namespace Tabibi.Domain.Entities
{
    public class ChatSession
    {
        public int SessionId { get; set; }

        public int PatientId { get; set; }
        public int DoctorId { get; set; }

        public ConsultationType ConsultationType { get; set; } = ConsultationType.Chat;

        public bool IsFreeMessage { get; set; } = true;

        /// <summary>null = pending, true = accepted, false = declined</summary>
        public bool? DoctorAccepted { get; set; }

        /// <summary>null for free message</summary>
        public decimal? Price { get; set; }

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }

        public DateTime? DoctorResponseAt { get; set; }

        public SessionStatus Status { get; set; } = SessionStatus.Active;

        /// <summary>AI-generated summary</summary>
        public string? SessionSummary { get; set; }

        // Navigation
        public PatientProfile Patient { get; set; } = null!;
        public DoctorProfile Doctor { get; set; } = null!;
        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public SymptomAnalysis? SymptomAnalysis { get; set; }
        public Payment? Payment { get; set; }
    }
}
