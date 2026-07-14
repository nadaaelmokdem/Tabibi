using System.ComponentModel.DataAnnotations;

namespace Tabibi.DTOs
{
    public class DoctorProfileBulkUpdateDTO
    {
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

        public decimal ClinicPrice { get; set; }
        public bool IsClinicEnabled { get; set; } = true;

        public decimal ChatPrice { get; set; }
        public bool IsChatEnabled { get; set; } = true;

        public decimal VideoCallPrice { get; set; }
        public bool IsVideoCallEnabled { get; set; } = true;

        public List<string> Specialties { get; set; } = new List<string>();
    }
}
