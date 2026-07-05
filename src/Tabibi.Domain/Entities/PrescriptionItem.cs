namespace Tabibi.Domain.Entities
{
    public class PrescriptionItem
    {
        public int ItemId { get; set; }

        public int PrescriptionId { get; set; }

        public string MedicationName { get; set; } = "";

        /// <summary>e.g. "500mg"</summary>
        public string? Dosage { get; set; }

        /// <summary>e.g. "Twice daily"</summary>
        public string? Frequency { get; set; }

        public int DurationDays { get; set; }

        public string? Instructions { get; set; }

        public Prescription Prescription { get; set; } = null!;
    }
}
