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
    public class VideoCallHub(IChatService chatService, IServiceProvider serviceProvider, ILogger<VideoCallHub> logger) : Hub
    {
        // SessionId -> (UserId -> ConnectionId)
        public static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> RoomUsers = new();

        // SessionId -> (UserId -> true)
        public static readonly ConcurrentDictionary<long, ConcurrentDictionary<string, byte>> VideoSpaceUsers = new();

        // SessionId -> (UserId -> true)
        public static readonly ConcurrentDictionary<long, ConcurrentDictionary<string, byte>> VideoSpaceJoinedOnce = new();

        // Tracks whether both parties have successfully joined the call room
        public static readonly ConcurrentDictionary<long, bool> CallStarted = new();

        // Token -> (SessionId, UserId, Expiry). Minted on a successful (authenticated) JoinCall
        // so navigator.sendBeacon — which cannot attach auth headers — can prove who it's
        // leaving on behalf of without trusting a raw, guessable userId from the URL.
        public static readonly ConcurrentDictionary<string, (string SessionId, string UserId, DateTime Expiry)> LeaveTokens = new();

        public async Task<string?> JoinCall(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return null;

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed)
            {
                await Clients.Caller.SendAsync("Unauthorized", access.ErrorMessage ?? "You do not have access to this video call session.");
                return null;
            }

            // SECURITY: Require payment before joining video call room
            if (!await chatService.IsVideoCallSessionPaidAsync(sessionId))
            {
                await Clients.Caller.SendAsync("Unauthorized", "Payment required to join this video call session.");
                return null;
            }

            var sessionIdStr = sessionId.ToString();
            var room = RoomUsers.GetOrAdd(sessionIdStr, _ => new ConcurrentDictionary<string, string>());
            room.AddOrUpdate(userId, Context.ConnectionId, (_, _) => Context.ConnectionId);

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionIdStr);

            // If both doctor and patient are in the room, mark the call as active/started
            if (room.Count >= 2)
            {
                CallStarted[sessionId] = true;
                await chatService.RecordVideoCallStartAsync(sessionId);

                // Enforce the 30-minute time limit programmatically
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromMinutes(30));

                        using (var scope = serviceProvider.CreateScope())
                        {
                            var scopedChatService = scope.ServiceProvider.GetRequiredService<IChatService>();
                            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<VideoCallHub>>();

                            // Complete the video call session
                            await scopedChatService.CompleteVideoCallSessionAsync(sessionId);

                            // Send a SignalR message to both clients in the group that call time has expired
                            await hubContext.Clients.Group(sessionId.ToString()).SendAsync("CallTimeExpired");

                            // Cleanup active dictionaries
                            CallStarted.TryRemove(sessionId, out _);
                            RoomUsers.TryRemove(sessionId.ToString(), out _);
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Deferred automatic video call completion failed for session {SessionId}", sessionId);
                    }
                });
            }

            // Notify others in the room that this user joined
            await Clients.GroupExcept(sessionIdStr, Context.ConnectionId).SendAsync("UserJoined", userId);

            // Notify the joining user about other users already in the room
            if (room.Count > 1)
            {
                var otherUsers = room.Keys.Where(id => id != userId).ToList();
                await Clients.Caller.SendAsync("RoomPresence", otherUsers);
            }

            var leaveToken = Guid.NewGuid().ToString("N");
            LeaveTokens[leaveToken] = (sessionIdStr, userId, DateTime.UtcNow.AddHours(6));
            return leaveToken;
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
                    try
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
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Deferred video call cleanup failed for session {SessionId}", sessionId);
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

        public async Task ToggleVideoState(long sessionId, bool isVideoOff)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            await Clients.GroupExcept(sessionId.ToString(), Context.ConnectionId).SendAsync("VideoStateChanged", userId, isVideoOff);
        }

        public async Task ToggleAudioState(long sessionId, bool isMuted)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            await Clients.GroupExcept(sessionId.ToString(), Context.ConnectionId).SendAsync("AudioStateChanged", userId, isMuted);
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

        public async Task JoinVideoSpace(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            var activeUsers = VideoSpaceUsers.GetOrAdd(sessionId, _ => new ConcurrentDictionary<string, byte>());
            activeUsers[userId] = 1;

            var joinedOnce = VideoSpaceJoinedOnce.GetOrAdd(sessionId, _ => new ConcurrentDictionary<string, byte>());
            joinedOnce[userId] = 1;

            logger.LogInformation("User {UserId} joined MiroTalk video space for session {SessionId}. Active users: {Count}", userId, sessionId, activeUsers.Count);
            await Task.CompletedTask;
        }

        public async Task LeaveVideoSpace(long sessionId)
        {
            var userId = Context.UserIdentifier;
            if (string.IsNullOrEmpty(userId)) return;

            logger.LogInformation("User {UserId} left MiroTalk video space for session {SessionId}.", userId, sessionId);
            await HandleLeaveVideoSpace(sessionId, userId);
        }

        private async Task HandleLeaveVideoSpace(long sessionId, string userId)
        {
            if (VideoSpaceUsers.TryGetValue(sessionId, out var activeUsers))
            {
                activeUsers.TryRemove(userId, out _);

                var joinedOnce = VideoSpaceJoinedOnce.GetOrAdd(sessionId, _ => new ConcurrentDictionary<string, byte>());

                // Check if both users joined the MiroTalk video call at some point, and now the room is empty
                if (joinedOnce.Count >= 2 && activeUsers.IsEmpty && CallStarted.ContainsKey(sessionId))
                {
                    logger.LogInformation("MiroTalk video room is empty after both users joined. Auto-completing session {SessionId}.", sessionId);
                    
                    CallStarted.TryRemove(sessionId, out _);
                    VideoSpaceUsers.TryRemove(sessionId, out _);
                    VideoSpaceJoinedOnce.TryRemove(sessionId, out _);

                    using (var scope = serviceProvider.CreateScope())
                    {
                        var scopedChatService = scope.ServiceProvider.GetRequiredService<IChatService>();
                        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<VideoCallHub>>();

                        await scopedChatService.CompleteVideoCallSessionAsync(sessionId);
                        await hubContext.Clients.Group(sessionId.ToString()).SendAsync("CallEndedByPeer");
                    }
                }
            }
            await Task.CompletedTask;
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
                            await HandleLeaveVideoSpace(sessionId, userId);

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
                                    try
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
                                    }
                                    catch (Exception ex)
                                    {
                                        logger.LogError(ex, "Deferred video call cleanup failed for session {SessionId}", sessionId);
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


