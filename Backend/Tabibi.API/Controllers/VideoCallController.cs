using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Tabibi.API.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Tabibi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VideoCallController(
        IHubContext<VideoCallHub> hubContext, 
        Tabibi.Application.Interfaces.IChatService chatService,
        IServiceProvider serviceProvider) : ControllerBase
    {
        /// <summary>
        /// Beacon endpoint called via navigator.sendBeacon when a user closes the browser tab.
        /// sendBeacon cannot attach auth headers, so userId is passed in the URL.
        /// We validate by checking the user is actually in the room before processing.
        /// </summary>
        [HttpPost("leave-beacon/{sessionId}/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> LeaveBeacon(string sessionId, string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest();
            }

            if (!long.TryParse(sessionId, out var parsedSessionId))
            {
                return BadRequest("Invalid session format.");
            }

            // Validate by checking room membership — only process if this user is actually in the room
            if (!VideoCallHub.RoomUsers.TryGetValue(sessionId, out var room) || !room.ContainsKey(userId))
            {
                return NotFound();
            }

            // Using SendAsync to broadcast to the group directly from the controller
            // The remaining peer will receive "UserLeftFallback" and reconnect
            await hubContext.Clients.Group(sessionId).SendAsync("UserLeftFallback", userId);

            room.TryRemove(userId, out _);
            bool roomIsEmpty = room.IsEmpty;
            if (room.IsEmpty)
            {
                VideoCallHub.RoomUsers.TryRemove(sessionId, out _);
            }

            bool timePassed = await chatService.IsVideoCallTimePassedAsync(parsedSessionId);

            if (timePassed)
            {
                VideoCallHub.CallStarted.TryRemove(parsedSessionId, out _);
                await chatService.CompleteVideoCallSessionAsync(parsedSessionId);
            }
            else if (roomIsEmpty && VideoCallHub.CallStarted.ContainsKey(parsedSessionId))
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(TimeSpan.FromMinutes(2));

                    if (VideoCallHub.RoomUsers.TryGetValue(sessionId, out var currentRoom) && !currentRoom.IsEmpty)
                    {
                        return;
                    }

                    using (var scope = serviceProvider.CreateScope())
                    {
                        var scopedChatService = scope.ServiceProvider.GetRequiredService<Tabibi.Application.Interfaces.IChatService>();
                        VideoCallHub.CallStarted.TryRemove(parsedSessionId, out _);
                        await scopedChatService.CompleteVideoCallSessionAsync(parsedSessionId);
                    }
                });
            }

            return Ok();
        }
    }
}


