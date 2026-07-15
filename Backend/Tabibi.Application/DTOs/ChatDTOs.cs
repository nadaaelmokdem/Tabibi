namespace Tabibi.Application.DTOs
{
    public class ChatMessageDTO
    {
        public long MessageId { get; set; }
        public long SessionId { get; set; }
        public string SenderRole { get; set; } = string.Empty;
        public string SenderUserId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }

    public class SendMessageRequestDTO
    {
        public long SessionId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    // What the hub broadcasts to clients - includes SenderRole so the
    // frontend knows which side to render the bubble on.
    public class ReceiveMessagePayload
    {
        public long MessageId { get; set; }
        public long SessionId { get; set; }
        public string SenderRole { get; set; } = string.Empty;
        public string SenderUserId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
    }
}
