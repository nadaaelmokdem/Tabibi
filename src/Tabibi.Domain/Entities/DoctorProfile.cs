namespace Tabibi.Domain.Entities
{
    public class DoctorProfile
    {
        public int DoctorId { get; set; }

        public string UserId { get; set; } = "";

        public string? LicenseNumber { get; set; }

        public string? NationalIdNumber { get; set; }

        public string? ClinicLocation { get; set; }

        public string? ClinicPhoneNumber { get; set; }

        public string? LicenseProofUrl { get; set; }

        public string? IdProofUrl { get; set; }

        public string? DegreeProofUrl { get; set; }

        public DateTime? LicenseExpiryDate { get; set; }

        public int? YearsOfExperience { get; set; }

        public string? Bio { get; set; }

        public string? ProfilePictureUrl { get; set; }

        public decimal AverageRating { get; set; } = 0;

        public bool IsVerified { get; set; } = false;

        public bool IsAvailableNow { get; set; } = false;

        // Navigation (Domain entities only)
        public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
        public ICollection<DoctorAvailability> Availabilities { get; set; } = new List<DoctorAvailability>();
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
