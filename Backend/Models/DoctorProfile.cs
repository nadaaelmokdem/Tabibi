using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace Tabibi.Models
{
 
        public class DoctorProfile
        {
            [Key]
            public int DoctorId { get; set; }

            [Required]
            public string UserId { get; set; } = "";

            public string? LicenseNumber { get; set; }

            public string? NationalIdNumber { get; set; }

            public string? ClinicLocation { get; set; }

            public string? ClinicPhoneNumber { get; set; }

            public string? LicenseProofUrl { get; set; }

            public string? IdProofUrl { get; set; }
            public string? DegreeProofUrl { get; set; }

            public DateTime? LicenseExpiryDate { get; set; } = null;

            public int? YearsOfExperience { get; set; } = null;

            public string? Bio { get; set; }
            public string? ProfilePictureUrl { get; set; }

            public string? OldLicenseNumber { get; set; }
            public string? OldNationalIdNumber { get; set; }
            public string? OldLicenseProofUrl { get; set; }
            public string? OldIdProofUrl { get; set; }
            public string? OldDegreeProofUrl { get; set; }
            public DateTime? OldLicenseExpiryDate { get; set; }

            [Column(TypeName = "decimal(3,2)")]
            public decimal AverageRating { get; set; } = 0;

            public int ReviewCount { get; set; } = 0;

            public DoctorVerificationStatus VerificationStatus { get; set; } = DoctorVerificationStatus.Pending;
            public string? AdminComment { get; set; }
            public DateTime? ReviewedAt { get; set; }

            [NotMapped]
            public bool IsVerified => VerificationStatus == DoctorVerificationStatus.Approved;
            public bool IsAvailableNow { get; set; } = false;

            [Column(TypeName = "decimal(10,2)")]
            public decimal ClinicPrice { get; set; }
            public bool IsClinicEnabled { get; set; } = true;

            [Column(TypeName = "decimal(10,2)")]
            public decimal ChatPrice { get; set; }
            public bool IsChatEnabled { get; set; } = true;

            [Column(TypeName = "decimal(10,2)")]
            public decimal VideoCallPrice { get; set; }
            public bool IsVideoCallEnabled { get; set; } = true;

            // Navigation
            [ForeignKey(nameof(UserId))]
            public AppUser User { get; set; } = null!;

            public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
            public ICollection<DoctorOldSpecialty> OldSpecialties { get; set; } = new List<DoctorOldSpecialty>();
            public ICollection<DoctorAvailability> Availabilities { get; set; } = new List<DoctorAvailability>();
            public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        }
    }
