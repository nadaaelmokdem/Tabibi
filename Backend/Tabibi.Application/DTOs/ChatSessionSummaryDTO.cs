using System;

namespace Tabibi.Application.DTOs
{
    public class ChatSessionSummaryDTO
    {
        public long SessionId { get; set; }
        public string OtherPartyName { get; set; } = string.Empty;
        public string OtherPartyUserId { get; set; } = string.Empty;
        public long? DoctorId { get; set; }
        public string OtherPartySpecialty { get; set; } = string.Empty;
        public string LastMessage { get; set; } = string.Empty;
        public DateTime? LastMessageTime { get; set; }
        public string? LastMessageRole { get; set; }
        public string? OtherPartyProfilePictureUrl { get; set; }
    }
}
