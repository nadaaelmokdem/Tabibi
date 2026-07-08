using System;

namespace Tabibi.DTOs
{
    public class ChatSessionDetailsDTO
    {
        public int SessionId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string DoctorSpecialty { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int? DoctorId { get; set; }
        public string DoctorUserId { get; set; } = string.Empty;
        public string PatientUserId { get; set; } = string.Empty;
        public bool IsCompanyPaid { get; set; }
        public bool IsFollowUp { get; set; }
        public DateTime StartedAt { get; set; }
    }
}
