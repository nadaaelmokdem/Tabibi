namespace Tabibi.Domain.Entities
{
    public class Prescription
    {
        public int PrescriptionId { get; set; }

        public int AppointmentId { get; set; }

        public string? Diagnosis { get; set; }

        public string? Notes { get; set; }

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpiresAt { get; set; }

        /// <summary>link to generated PDF</summary>
        public string? PdfUrl { get; set; }

        public Appointment Appointment { get; set; } = null!;
        public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
    }
}
