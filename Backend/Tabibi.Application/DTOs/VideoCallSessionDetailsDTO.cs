using System;

namespace Tabibi.Application.DTOs
{
    public class VideoCallSessionDetailsDTO
    {
        public long SessionId { get; set; }
        public string PatientName { get; set; } = null!;
        public string DoctorName { get; set; } = null!;
        public string DoctorSpecialty { get; set; } = null!;
        public string? MeetingLink { get; set; }
        public DateTime ScheduledAt { get; set; }
        public DateTime? ActualStartedAt { get; set; }
        public string Status { get; set; } = null!;
    }
}
