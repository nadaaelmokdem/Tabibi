namespace Tabibi.DTOs
{
    public class DoctorProfileDTO
    {
        public int DoctorId { get; set; }
        public string UserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
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
        public decimal AverageRating { get; set; }
        public bool IsVerified { get; set; }
        public string VerificationStatus { get; set; } = "Pending";
        public string? AdminComment { get; set; }
        public bool IsAvailableNow { get; set; }

        public decimal ClinicPrice { get; set; }
        public bool IsClinicEnabled { get; set; }
        public decimal ChatPrice { get; set; }
        public bool IsChatEnabled { get; set; }
        public decimal VideoCallPrice { get; set; }
        public bool IsVideoCallEnabled { get; set; }

        public ICollection<SpecialtyDTO> Specialties { get; set; } = new List<SpecialtyDTO>();    }
}
