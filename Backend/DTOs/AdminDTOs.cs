using Tabibi.Models;

namespace Tabibi.DTOs
{
    public class AdminDoctorDTO
    {
        public int DoctorId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LicenseNumber { get; set; } = string.Empty;
        public string ClinicLocation { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string VerificationStatus { get; set; } = "Pending";
        public string? AdminComment { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class ReviewDoctorRequestDTO
    {
        public DoctorVerificationStatus Decision { get; set; } = DoctorVerificationStatus.Pending;
        public string? Comment { get; set; }
    }

    public class AdminUserDTO
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal? TotalSpent { get; set; }
    }

    public class SetUserActiveRequestDTO
    {
        public bool IsActive { get; set; }
    }

    public class AdminAppointmentDTO
    {
        public int AppointmentId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string ConsultationType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? PaymentStatus { get; set; }
        public decimal? AmountPaid { get; set; }
    }

}
