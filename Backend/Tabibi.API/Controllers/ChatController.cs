using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Application.Interfaces;
using Tabibi.Application.Shared;
using Tabibi.Application.Extensions;
using Tabibi.Application.DTOs;

namespace Tabibi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController(IChatService chatService, IFileService fileService) : ControllerBase
    {
        [HttpPost("start/{doctorId}")]
        [Authorize(Roles = UserRoles.Patient)]
        public async Task<IActionResult> StartSession(long doctorId, [FromQuery] bool isCompanyPaid = false, [FromBody] StartSessionRequest? request = null)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            try
            {
                if (!isCompanyPaid)
                {
                    return BadRequest("Paid chat sessions must be booked through the appointment system.");
                }

                var session = await chatService.StartOrGetSessionAsync(userId, doctorId, isCompanyPaid);
                return Ok(new { sessionId = session.SessionId });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{sessionId}/messages")]
        [Authorize]
        public async Task<IActionResult> GetMessages(long sessionId)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var access = await chatService.ValidateAccess(sessionId, userId);
            if (!access.Allowed)
            {
                return Forbid();
            }

            var history = await chatService.GetHistory(sessionId);
            return Ok(history);
        }
        [HttpGet("{sessionId}/details")]
        [Authorize]
        public async Task<IActionResult> GetSessionDetails(long sessionId)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var access = await chatService.ValidateAccess(sessionId, userId);
            if (!access.Allowed)
            {
                return Forbid();
            }

            var details = await chatService.GetSessionDetails(sessionId);
            if (details == null) return NotFound();
            
            return Ok(details);
        }

        [HttpGet("sessions")]
        [Authorize]
        public async Task<IActionResult> GetSessions([FromQuery] string? activeRole = null)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var role = activeRole ?? (User.IsInRole(UserRoles.Doctor) ? UserRoles.Doctor : UserRoles.Patient);
            var sessions = await chatService.GetUserSessions(userId, role);
            
            return Ok(sessions);
        }

        [HttpPost("{sessionId}/followup")]
        [Authorize(Roles = UserRoles.Patient)]
        public async Task<IActionResult> FollowUp(long sessionId)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                var access = await chatService.ValidateAccess(sessionId, userId);
                if (!access.Allowed) return Forbid();

                // Here we would ideally integrate with a payment gateway.
                // For now, we update the session to be a follow-up.
                // It resets the StartedAt clock and marks IsFollowUp.

                var updatedSession = await chatService.FollowUpSessionAsync(sessionId, userId);
                return Ok(new { message = "Follow up initiated", sessionId = updatedSession.SessionId });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("upload")]
        [Authorize]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            var fileUrl = await fileService.UploadFileAsync(file, "chats");
            return Ok(new { url = fileUrl, name = file.FileName });
        }
    }
}




