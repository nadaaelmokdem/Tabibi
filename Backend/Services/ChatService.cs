using Microsoft.EntityFrameworkCore;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Services
{
    public class ChatAccessResult
    {
        public bool Allowed { get; set; }
        public string Role { get; set; } = string.Empty; // "Patient" | "Doctor"
        public string SenderName { get; set; } = string.Empty;
    }

    public class ChatService(AppDbContext dbContext)
    {
        // Confirms this user is actually one of the two participants in the
        // session before letting them join the SignalR group, read history,
        // or send a message. Never trust a sessionId from the client alone.
        public async Task<ChatAccessResult> ValidateAccess(int sessionId, string userId)
        {
            var session = await dbContext.ChatSessions
                .Include(s => s.Patient).ThenInclude(p => p.User)
                .Include(s => s.Doctor).ThenInclude(d => d.User)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null)
            {
                return new ChatAccessResult { Allowed = false };
            }

            if (session.Patient.UserId == userId)
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = "Patient",
                    SenderName = session.Patient.User.FullName
                };
            }

            if (session.Doctor.UserId == userId)
            {
                return new ChatAccessResult
                {
                    Allowed = true,
                    Role = "Doctor",
                    SenderName = session.Doctor.User.FullName
                };
            }

            return new ChatAccessResult { Allowed = false };
        }

        public async Task<List<ChatMessageDTO>> GetHistory(int sessionId)
        {
            return await dbContext.ChatMessages
                .Where(m => m.SessionId == sessionId)
                .OrderBy(m => m.SentAt)
                .Select(m => new ChatMessageDTO
                {
                    MessageId = m.MessageId,
                    SessionId = m.SessionId,
                    SenderRole = m.Role,
                    SenderName = m.Role == "Patient"
                        ? m.Session.Patient.User.FullName
                        : m.Session.Doctor.User.FullName,
                    Content = m.Content,
                    SentAt = m.SentAt
                })
                .ToListAsync();
        }

        public async Task<ChatMessage> SaveMessage(int sessionId, string role, string content)
        {
            var message = new ChatMessage
            {
                SessionId = sessionId,
                Role = role,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            dbContext.ChatMessages.Add(message);
            await dbContext.SaveChangesAsync();

            return message;
        }
    }
}
