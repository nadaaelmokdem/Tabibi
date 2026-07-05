namespace Tabibi.Domain.Entities
{
    public class DoctorSpecialty
    {
        public int Id { get; set; }

        public int DoctorId { get; set; }
        public int SpecialtyId { get; set; }

        public decimal ClinicPrice { get; set; }
        public bool IsClinicEnabled { get; set; } = true;

        public decimal ChatPrice { get; set; }
        public bool IsChatEnabled { get; set; } = true;

        public decimal VideoPrice { get; set; }
        public bool IsVideoEnabled { get; set; } = true;

        public decimal CallPrice { get; set; }
        public bool IsCallEnabled { get; set; } = true;

        // Navigation
        public DoctorProfile Doctor { get; set; } = null!;
        public Specialty Specialty { get; set; } = null!;
    }
}
