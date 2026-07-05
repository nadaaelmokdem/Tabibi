namespace Tabibi.Domain.Entities
{
    public class SymptomAnalysis
    {
        public int AnalysisId { get; set; }

        public int SessionId { get; set; }

        /// <summary>raw keywords JSON</summary>
        public string? SymptomsJson { get; set; }

        public string? SuggestedSpecialty { get; set; }

        /// <summary>EMERGENCY / URGENT / ROUTINE / SELF_CARE</summary>
        public string? UrgencyLevel { get; set; }

        public decimal AiConfidenceScore { get; set; }

        public int? RoutedDoctorId { get; set; }

        public string? Disclaimer { get; set; }

        public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

        public ChatSession Session { get; set; } = null!;
        public DoctorProfile? RoutedDoctor { get; set; }
    }
}
