namespace Tabibi.DTOs
{
    public class PatientDashboardDTO
    {
        public string FullName { get; set; } = string.Empty;
        public int UpcomingAppointmentsCount { get; set; }
        public int PendingChatSessionsCount { get; set; }
        public List<UpcomingAppointmentDTO> UpcomingAppointments { get; set; } = new();
        public List<RecentPrescriptionDTO> RecentPrescriptions { get; set; } = new();
    }

    public class UpcomingAppointmentDTO
    {
        public int AppointmentId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public string ConsultationType { get; set; } = string.Empty; 
        public string Status { get; set; } = string.Empty; 
    }

    public class RecentPrescriptionDTO
    {
        public int PrescriptionId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
        public string? Diagnosis { get; set; }
    }

    public class DoctorDashboardDTO
    {
        public string FullName { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public int PendingChatRequestsCount { get; set; }
        public int TodaysAppointmentsCount { get; set; }
        public int TotalPatientsSeen { get; set; }
        public List<PendingChatRequestDTO> PendingChatRequests { get; set; } = new();
        public List<UpcomingAppointmentDTO> TodaysAppointments { get; set; } = new();
    }

    public class PendingChatRequestDTO
    {
        public int SessionId { get; set; }
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
        public int DoctorId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string LicenseNumber { get; set; } = string.Empty;
        public string ClinicLocation { get; set; } = string.Empty;
    }
}
