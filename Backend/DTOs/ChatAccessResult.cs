namespace Tabibi.DTOs
{
    public class ChatAccessResult
    {
        public bool Allowed { get; set; }
        public string Role { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
    }
}
