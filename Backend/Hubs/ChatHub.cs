using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Tabibi.DTOs;
using Tabibi.Services;
using Tabibi.Shared;

namespace Tabibi.Hubs
{
    [Authorize]
    public class ChatHub(ChatService chatService) : Hub
    {
        private static string GroupName(int sessionId) => $"session-{sessionId}";

        private string? GetUserId() =>
            Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        // Lets an admin watch a session's messages live without being a participant -
        // read-only, never validated against ValidateAccess (which only allows the
        // patient/doctor pair), and admins never call SendMessage.
        [Authorize(Roles = UserRoles.Admin)]
        public async Task JoinAsObserver(int sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(sessionId));
            await Clients.Caller.SendAsync("JoinedSession", new { sessionId, role = "Observer" });
        }

        // Client calls this right after the connection starts, once it
        // knows which session it wants to chat in.
        public async Task JoinSession(int sessionId)
        {
            var userId = GetUserId();
            if (userId == null)
            {
                throw new HubException("Not authenticated.");
            }

            var access = await chatService.ValidateAccess(sessionId, userId);
            if (!access.Allowed)
            {
                throw new HubException("You do not have access to this chat session.");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(sessionId));

            // Let the caller know the join succeeded and which role they're in -
            // useful for the frontend to confirm before rendering the composer.
            await Clients.Caller.SendAsync("JoinedSession", new { sessionId, role = access.Role });
        }

        public async Task LeaveSession(int sessionId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(sessionId));
        }

        public async Task SendMessage(SendMessageRequestDTO request)
        {
            var userId = GetUserId();
            if (userId == null)
            {
                throw new HubException("Not authenticated.");
            }

            var access = await chatService.ValidateAccess(request.SessionId, userId);
            if (!access.Allowed)
            {
                throw new HubException("You do not have access to this chat session.");
            }

            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return;
            }

            var saved = await chatService.SaveMessage(request.SessionId, access.Role, request.Content.Trim());

            var payload = new ReceiveMessagePayload
            {
                MessageId = saved.MessageId,
                SessionId = request.SessionId,
                SenderRole = access.Role,
                SenderName = access.SenderName,
                Content = saved.Content,
                SentAt = saved.SentAt
            };

            // Broadcast to everyone in the session's group, including the sender -
            // simplest way to keep the sender's own UI in sync with the saved
            // message (correct MessageId/SentAt from the DB) instead of trusting
            // its own optimistic local copy.
            await Clients.Group(GroupName(request.SessionId)).SendAsync("ReceiveMessage", payload);
        }
    }
}
