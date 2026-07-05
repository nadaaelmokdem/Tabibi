namespace Tabibi.Domain.Entities
{
    public class ChatMessage
    {
        public int MessageId { get; set; }

        public int SessionId { get; set; }

        public string Role { get; set; } = "";

        public string Content { get; set; } = "";

        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        /// <summary>for billing tracking</summary>
        public int TokensUsed { get; set; } = 0;

        public ChatSession Session { get; set; } = null!;
    }
}
