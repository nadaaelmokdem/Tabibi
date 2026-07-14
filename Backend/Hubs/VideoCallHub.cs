using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Tabibi.Hubs
{
    [Authorize]
    public class VideoCallHub : Hub
    {
        // SessionId -> (UserId -> ConnectionId)
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> _roomUsers = new();

        public async Task JoinCallRoom(string sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var room = _roomUsers.GetOrAdd(sessionId, _ => new ConcurrentDictionary<string, string>());
            room.AddOrUpdate(userId, Context.ConnectionId, (_, _) => Context.ConnectionId);

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

            // Notify others in the room that this user joined
            await Clients.GroupExcept(sessionId, Context.ConnectionId).SendAsync("UserJoined", userId);
        }

        public async Task LeaveCallRoom(string sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            if (_roomUsers.TryGetValue(sessionId, out var room))
            {
                room.TryRemove(userId, out _);
                if (room.IsEmpty)
                {
                    _roomUsers.TryRemove(sessionId, out _);
                }
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
            await Clients.Group(sessionId).SendAsync("UserLeft", userId);
        }

        public async Task NotifyUserReconnected(string sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            await Clients.GroupExcept(sessionId, Context.ConnectionId).SendAsync("UserReconnected", userId);
        }

        public async Task SendInCallMessage(string sessionId, string message)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            await Clients.Group(sessionId).SendAsync("ReceiveInCallMessage", userId, message);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                foreach (var (sessionId, room) in _roomUsers)
                {
                    if (room.TryGetValue(userId, out var storedConnectionId) && storedConnectionId == connectionId)
                    {
                        room.TryRemove(userId, out _);
                        await Clients.Group(sessionId).SendAsync("UserLeft", userId);

                        if (room.IsEmpty)
                        {
                            _roomUsers.TryRemove(sessionId, out _);
                        }
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
