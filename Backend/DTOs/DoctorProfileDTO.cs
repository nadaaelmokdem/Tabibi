namespace Tabibi.DTOs
{
    /// <summary>
    /// DTO for Doctor Profile with specialty-based pricing
    /// </summary>
    public class DoctorProfileDTO
    {
        public int DoctorId { get; set; }
        public string UserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string LicenseNumber { get; set; } = "";
        public string NationalIdNumber { get; set; } = "";
        public string ClinicLocation { get; set; } = "";
        public string ClinicPhoneNumber { get; set; } = "";
        public string LicenseProofUrl { get; set; } = "";
        public DateTime? LicenseExpiryDate { get; set; }
        public int YearsOfExperience { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public decimal AverageRating { get; set; }
        public bool IsVerified { get; set; }
        public bool IsAvailableNow { get; set; }

        /// <summary>
        /// List of specialties the doctor offers with custom pricing for each
        /// </summary>
        public ICollection<SpecialtyPriceDTO> Specialties { get; set; } = new List<SpecialtyPriceDTO>();
    }
}
