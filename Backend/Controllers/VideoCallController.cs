using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Tabibi.Hubs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Tabibi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VideoCallController(IHubContext<VideoCallHub> hubContext) : ControllerBase
    {
        [HttpPost("leave-beacon/{sessionId}")]
        [Authorize]
        public async Task<IActionResult> LeaveBeacon(string sessionId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Using SendAsync to broadcast to the group directly from the controller
            // The remaining peer will receive "UserLeftFallback" and reconnect
            await hubContext.Clients.Group(sessionId).SendAsync("UserLeftFallback", userId);

            return Ok();
        }
    }
}
