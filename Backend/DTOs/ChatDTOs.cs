namespace Tabibi.DTOs
{
    public class ChatMessageDTO
    {
        public int MessageId { get; set; }
        public int SessionId { get; set; }
        public string SenderRole { get; set; } = string.Empty; // "Patient" | "Doctor"
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }

    public class SendMessageRequestDTO
    {
        public int SessionId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    // What the hub broadcasts to clients - includes SenderRole so the
    // frontend knows which side to render the bubble on.
    public class ReceiveMessagePayload
    {
        public int MessageId { get; set; }
        public int SessionId { get; set; }
        public string SenderRole { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }
}
