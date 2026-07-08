using System;

namespace Tabibi.DTOs
{
    public class ChatSessionSummaryDTO
    {
        public int SessionId { get; set; }
        public string OtherPartyName { get; set; } = string.Empty;
        public string OtherPartyUserId { get; set; } = string.Empty;
        public int? DoctorId { get; set; }
        public string OtherPartySpecialty { get; set; } = string.Empty;
        public string LastMessage { get; set; } = string.Empty;
        public DateTime? LastMessageTime { get; set; }
        public string? LastMessageRole { get; set; }
    }
}
