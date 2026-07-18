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
        IServiceProvider serviceProvider,
        ILogger<VideoCallController> logger) : ControllerBase
    {
        /// <summary>
        /// Beacon endpoint called via navigator.sendBeacon when a user closes the browser tab.
        /// sendBeacon cannot attach auth headers, so we validate via a one-time token minted
        /// server-side in VideoCallHub.JoinCall (over the authenticated SignalR connection)
        /// rather than trusting a raw userId supplied in the URL.
        /// </summary>
        [HttpPost("leave-beacon/{sessionId}/{token}")]
        [AllowAnonymous]
        public async Task<IActionResult> LeaveBeacon(string sessionId, string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest();
            }

            if (!long.TryParse(sessionId, out var parsedSessionId))
            {
                return BadRequest("Invalid session format.");
            }

            if (!VideoCallHub.LeaveTokens.TryRemove(token, out var tokenEntry) ||
                tokenEntry.SessionId != sessionId ||
                tokenEntry.Expiry < DateTime.UtcNow)
            {
                return Unauthorized();
            }

            var userId = tokenEntry.UserId;

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
                    try
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
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Deferred video call cleanup failed for session {SessionId}", parsedSessionId);
                    }
                });
            }

            return Ok();
        }

        [HttpGet("session/{sessionId}")]
        [Authorize]
        public async Task<IActionResult> GetSessionDetails(long sessionId)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed) return StatusCode(403, access.ErrorMessage ?? "Access denied.");

            var linkResult = await chatService.GetOrCreateMeetingLinkAsync(sessionId);
            if (!linkResult.IsSuccess)
            {
                return BadRequest(linkResult.ErrorMessage);
            }

            var sessionDetails = await chatService.GetVideoCallSessionDetailsAsync(sessionId);
            if (sessionDetails == null) return NotFound("Video call session not found.");

            return Ok(sessionDetails);
        }

        [HttpGet("meet-link/{sessionId}")]
        [Authorize]
        public async Task<IActionResult> GetMeetLink(long sessionId)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var access = await chatService.ValidateVideoCallAccess(sessionId, userId);
            if (!access.Allowed) return StatusCode(403, access.ErrorMessage ?? "Access denied.");

            var linkResult = await chatService.GetOrCreateMeetingLinkAsync(sessionId);
            if (!linkResult.IsSuccess)
            {
                return BadRequest(linkResult.ErrorMessage);
            }

            return Ok(new { meetLink = linkResult.Data });
        }
    }
}

