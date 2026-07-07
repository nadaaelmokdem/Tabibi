using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Tabibi.DTOs;
using Tabibi.Services;
using Tabibi.Extensions;
using Tabibi.Shared;

namespace Tabibi.Hubs
{
    [Authorize]
    public class ChatHub(ChatService chatService, PresenceTracker presenceTracker) : Hub
    {
        private static string GroupName(int sessionId) => $"session-{sessionId}";

        private string? GetUserId() => Context.User?.GetId();

        // Helper to send unauthorized notifications to the caller instead of throwing HubException
        private Task SendUnauthorized(string message) => Task.WhenAll(
            Clients.Caller.SendAsync("Unauthorized", new { Message = message }),
            Clients.Caller.SendAsync("Redirect", "/")
        );

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId != null)
            {
                presenceTracker.UserConnected(userId, Context.ConnectionId);
                // Notify all clients (including the user themselves) about the online status
                await Clients.All.SendAsync("UserPresenceChanged", userId, true);
                // Also notify any subscribers to the specific user's presence group
                await Clients.Group($"presence-{userId}").SendAsync("UserPresenceChanged", userId, true);
                // Direct notification to the connecting user (in case they are not yet subscribed to their own group)
                await Clients.Caller.SendAsync("UserPresenceChanged", userId, true);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            presenceTracker.UserDisconnected(userId, Context.ConnectionId);
                bool stillOnline = presenceTracker.IsUserOnline(userId);
                if (!stillOnline)
                {
                    // Notify all clients and presence group that the user is now offline
                    await Clients.All.SendAsync("UserPresenceChanged", userId, false);
                    await Clients.Group($"presence-{userId}").SendAsync("UserPresenceChanged", userId, false);
                }
                // Notify the user (caller) of their current online status
                await Clients.Caller.SendAsync("UserPresenceChanged", userId, stillOnline);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SubscribeToPresence(string userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"presence-{userId}");
            var isOnline = presenceTracker.IsUserOnline(userId);
            await Clients.Caller.SendAsync("UserPresenceChanged", userId, isOnline);
        }

        public async Task UnsubscribeFromPresence(string userId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"presence-{userId}");
        }

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
                await SendUnauthorized("Not authenticated.");
            return;
            }

            var access = await chatService.ValidateAccess(sessionId, userId);
            if (!access.Allowed)
            {
                await SendUnauthorized("You do not have access to this chat session.");
            return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(sessionId));

            // Let the caller know the join succeeded and which role they're in
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
                await SendUnauthorized("Not authenticated.");
                return;
            }

            var access = await chatService.ValidateAccess(request.SessionId, userId);
            if (!access.Allowed)
            {
                await SendUnauthorized("You do not have access to this chat session.");
                return;
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
