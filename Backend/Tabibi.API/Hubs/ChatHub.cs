using Tabibi.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Tabibi.Application.DTOs;
using Tabibi.Application.Services;
using Tabibi.Application.Interfaces;
using Tabibi.Infrastructure.Services;
using Tabibi.Infrastructure.Services.Payments;
using Tabibi.Application.Extensions;

namespace Tabibi.API.Hubs
{
    [Authorize]
    public class ChatHub(IChatService chatService, IPresenceTracker presenceTracker) : Hub
    {
        private static string GroupName(long sessionId) => $"session-{sessionId}";
        private static string UserGroupName(string userId) => $"user-{userId}";

        private string? GetUserId() => Context.User?.GetId();

        // Helper to send unauthorized notifications to the caller instead of throwing HubException
        private Task SendUnauthorized(string message) => Clients.Caller.SendAsync("Unauthorized", new { Message = message });

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, UserGroupName(userId));
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
            if (userId != null)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, UserGroupName(userId));
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
            }
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

        // Client calls this right after the connection starts, once it
        // knows which session it wants to chat in.
        public async Task JoinSession(long sessionId)
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

        public async Task LeaveSession(long sessionId)
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

            try
            {
                var saved = await chatService.SaveMessage(request.SessionId, access.Role, request.Content.Trim());

                var payload = new ReceiveMessagePayload
                {
                    MessageId = saved.MessageId,
                    SessionId = request.SessionId,
                    SenderRole = access.Role,
                    SenderUserId = userId,
                    SenderName = access.SenderName,
                    Content = saved.Content,
                    SentAt = saved.SentAt
                };

                // Ensure the sender is in the session room before broadcasting so the
                // sender's own UI always updates immediately, even if the join flow
                // was still in progress or the connection had just reconnected.
                await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(request.SessionId));
                await Clients.Group(GroupName(request.SessionId)).SendAsync("ReceiveMessage", payload);

                // Determine the other party's user ID to notify them specifically (and the sender)
                var sessionDetails = await chatService.GetSessionDetails(request.SessionId);
                if (sessionDetails != null)
                {
                    // We send a generic event to both users to update their session list
                    await Clients.User(sessionDetails.PatientUserId).SendAsync("UpdateSessionList", payload);
                    if (sessionDetails.DoctorUserId != "AI")
                    {
                        await Clients.User(sessionDetails.DoctorUserId).SendAsync("UpdateSessionList", payload);
                    }
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("SendMessageError", ex.Message);
            }
        }
    }
}



