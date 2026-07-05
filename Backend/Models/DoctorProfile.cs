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

            [Required]
            public string LicenseNumber { get; set; } = "";

            [Required]
            public string NationalIdNumber { get; set; } = "";

            [Required]
            public string ClinicLocation { get; set; } = "";

            [Required]
            public string ClinicPhoneNumber { get; set; } = "";

            [Required]
            public string LicenseProofUrl { get; set; } = "";

            public DateTime? LicenseExpiryDate { get; set; } = null;

            public int YearsOfExperience { get; set; }

            public string? Bio { get; set; }
            public string? ProfilePictureUrl { get; set; }

            [Column(TypeName = "decimal(3,2)")]
            public decimal AverageRating { get; set; } = 0;

            public DoctorVerificationStatus VerificationStatus { get; set; } = DoctorVerificationStatus.Pending;
            public string? AdminComment { get; set; }
            public DateTime? ReviewedAt { get; set; }

            [NotMapped]
            public bool IsVerified => VerificationStatus == DoctorVerificationStatus.Approved;

            public bool IsAvailableNow { get; set; } = false;

            // Navigation
            [ForeignKey(nameof(UserId))]
            public AppUser User { get; set; } = null!;

            public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
            public ICollection<DoctorAvailability> Availabilities { get; set; } = new List<DoctorAvailability>();
            public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        }
    }