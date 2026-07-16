using Tabibi.Core.Models;
using Tabibi.Application.DTOs;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Tabibi.Application.Interfaces;

namespace Tabibi.API.Hubs
{
    [Authorize]
    public class VideoCallHub(IChatService chatService, IServiceProvider serviceProvider) : Hub
    {
        // SessionId -> (UserId -> ConnectionId)
        public static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> RoomUsers = new();

        // Tracks whether both parties have successfully joined the call room
        public static readonly ConcurrentDictionary<long, bool> CallStarted = new();

        public async Task JoinCall(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed)
            {
                await Clients.Caller.SendAsync("Unauthorized", access.ErrorMessage ?? "You do not have access to this video call session.");
                return;
            }

            // SECURITY: Require payment before joining video call room
            if (!await chatService.IsVideoCallSessionPaidAsync(sessionId))
            {
                await Clients.Caller.SendAsync("Unauthorized", "Payment required to join this video call session.");
                return;
            }

            var sessionIdStr = sessionId.ToString();
            var room = RoomUsers.GetOrAdd(sessionIdStr, _ => new ConcurrentDictionary<string, string>());
            room.AddOrUpdate(userId, Context.ConnectionId, (_, _) => Context.ConnectionId);

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionIdStr);

            // If both doctor and patient are in the room, mark the call as active/started
            if (room.Count >= 2)
            {
                CallStarted[sessionId] = true;
            }

            // Notify others in the room that this user joined
            await Clients.GroupExcept(sessionIdStr, Context.ConnectionId).SendAsync("UserJoined", userId);

            // Notify the joining user about other users already in the room
            if (room.Count > 1)
            {
                var otherUsers = room.Keys.Where(id => id != userId).ToList();
                await Clients.Caller.SendAsync("RoomPresence", otherUsers);
            }
        }

        public async Task LeaveCall(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var sessionIdStr = sessionId.ToString();
            bool roomIsEmpty = true;
            if (RoomUsers.TryGetValue(sessionIdStr, out var room))
            {
                room.TryRemove(userId, out _);
                roomIsEmpty = room.IsEmpty;
                if (room.IsEmpty)
                {
                    RoomUsers.TryRemove(sessionIdStr, out _);
                }
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionIdStr);
            await Clients.Group(sessionIdStr).SendAsync("UserLeft", userId);

            // Complete the call if:
            // 1. Both parties have exited (room is empty) and the call had started, after a 2 minutes grace period
            // 2. Or the scheduled time has passed
            bool timePassed = await chatService.IsVideoCallTimePassedAsync(sessionId);

            if (timePassed)
            {
                CallStarted.TryRemove(sessionId, out _);
                await chatService.CompleteVideoCallSessionAsync(sessionId);
            }
            else if (roomIsEmpty && CallStarted.ContainsKey(sessionId))
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(TimeSpan.FromMinutes(2));

                    // Verify if the room is still empty
                    if (RoomUsers.TryGetValue(sessionIdStr, out var currentRoom) && !currentRoom.IsEmpty)
                    {
                        // Someone re-joined during the grace period!
                        return;
                    }

                    using (var scope = serviceProvider.CreateScope())
                    {
                        var scopedChatService = scope.ServiceProvider.GetRequiredService<IChatService>();
                        CallStarted.TryRemove(sessionId, out _);
                        await scopedChatService.CompleteVideoCallSessionAsync(sessionId);
                    }
                });
            }
        }

        public async Task EndCall(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed) return;

            // Notify others in the room that the call was explicitly ended
            await Clients.Group(sessionId.ToString()).SendAsync("CallEndedByPeer", userId);
        }

        public async Task NotifyUserReconnected(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            await Clients.GroupExcept(sessionId.ToString(), Context.ConnectionId).SendAsync("PeerReconnected", userId);
        }

        public async Task SendMessage(long sessionId, string message)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed) return;

            await Clients.Group(sessionId.ToString()).SendAsync("ReceiveMessage", userId, message);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                foreach (var (sessionIdStr, room) in RoomUsers)
                {
                    if (room.TryGetValue(userId, out var storedConnectionId) && storedConnectionId == connectionId)
                    {
                        room.TryRemove(userId, out _);
                        await Clients.Group(sessionIdStr).SendAsync("UserLeft", userId);

                        if (long.TryParse(sessionIdStr, out var sessionId))
                        {
                            bool roomIsEmpty = room.IsEmpty;
                            bool timePassed = await chatService.IsVideoCallTimePassedAsync(sessionId);

                            if (timePassed)
                            {
                                CallStarted.TryRemove(sessionId, out _);
                                await chatService.CompleteVideoCallSessionAsync(sessionId);
                            }
                            else if (roomIsEmpty && CallStarted.ContainsKey(sessionId))
                            {
                                _ = Task.Run(async () =>
                                {
                                    await Task.Delay(TimeSpan.FromMinutes(2));

                                    // Verify if the room is still empty
                                    if (RoomUsers.TryGetValue(sessionIdStr, out var currentRoom) && !currentRoom.IsEmpty)
                                    {
                                        return;
                                    }

                                    using (var scope = serviceProvider.CreateScope())
                                    {
                                        var scopedChatService = scope.ServiceProvider.GetRequiredService<IChatService>();
                                        CallStarted.TryRemove(sessionId, out _);
                                        await scopedChatService.CompleteVideoCallSessionAsync(sessionId);
                                    }
                                });
                            }
                        }

                        if (room.IsEmpty)
                        {
                            RoomUsers.TryRemove(sessionIdStr, out _);
                        }
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}


