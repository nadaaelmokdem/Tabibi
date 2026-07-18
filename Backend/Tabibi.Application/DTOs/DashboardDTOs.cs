namespace Tabibi.Application.DTOs
{
    public class PatientDashboardDTO
    {
        public string FullName { get; set; } = string.Empty;
        public int ActiveConsultationsCount { get; set; }
        public int ChatSessionsCount { get; set; }
        public List<UpcomingAppointmentDTO> ActiveConsultations { get; set; } = new();
        public List<UnreviewedAppointmentDTO> UnreviewedAppointments { get; set; } = new();
    }

    public class UpcomingAppointmentDTO
    {
        public long AppointmentId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string? DoctorProfilePictureUrl { get; set; }
        public string ConsultationType { get; set; } = string.Empty; 
        public string Status { get; set; } = string.Empty; 
        public string PaymentMethod { get; set; } = string.Empty;
        public long? SessionId { get; set; }
    }

    public class UnreviewedAppointmentDTO
    {
        public long AppointmentId { get; set; }
        public long DoctorId { get; set; }
        public string? DoctorProfilePictureUrl { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
    }

    public class DoctorDashboardDTO
    {
        public string FullName { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public string VerificationStatus { get; set; } = "Pending";
        public string? AdminComment { get; set; }
        public int ChatSessionsCount { get; set; }
        public int ActiveConsultationsCount { get; set; }
        public int TotalPatientsSeen { get; set; }
        public List<ChatSessionDTO> ChatSessions { get; set; } = new();
        public List<UpcomingAppointmentDTO> ActiveConsultations { get; set; } = new();
    }

    public class ChatSessionDTO
    {
        public long SessionId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string? SessionSummary { get; set; }
        public DateTime StartedAt { get; set; }
    }

    public class AdminDashboardDTO
    {
        public int TotalPatients { get; set; }
        public int TotalDoctors { get; set; }
        public int PendingDoctorVerifications { get; set; }
        public int TotalAppointments { get; set; }
        public List<PendingDoctorDTO> PendingDoctors { get; set; } = new();
    }

    public class PendingDoctorDTO
    {
        public string UserId { get; set; } = string.Empty;
        public long DoctorId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? LicenseNumber { get; set; }
        public string? ClinicLocation { get; set; }
        public string VerificationStatus { get; set; } = "Pending";
    }
}