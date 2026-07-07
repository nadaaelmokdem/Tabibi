using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Services;
using Tabibi.Shared;
using Tabibi.DTOs;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = UserRoles.Admin)]
    public class AdminController(AdminService adminService) : ControllerBase
    {
        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboard()
        {
            var dto = await adminService.GetDashboard();
            return Ok(dto);
        }

        [HttpGet("doctors/pending")]
        public async Task<IActionResult> GetPendingDoctors()
        {
            var pending = await adminService.GetPendingDoctors();
            return Ok(pending);
        }

        [HttpGet("doctors")]
        public async Task<IActionResult> GetAllDoctors([FromQuery] string? status)
        {
            var doctors = await adminService.GetAllDoctors(status);
            return Ok(doctors);
        }

        [HttpPatch("doctors/{doctorId}/verify")]
        public async Task<IActionResult> VerifyDoctor(int doctorId, [FromBody] ReviewDoctorRequestDTO request)
        {
            var res = await adminService.VerifyDoctor(doctorId, request.Decision, request.Comment);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }
            return Ok();
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await adminService.GetAllUsers();
            return Ok(users);
        }

        [HttpPatch("users/{userId}/active")]
        public async Task<IActionResult> SetUserActive(string userId, [FromBody] SetUserActiveRequestDTO request)
        {
            var res = await adminService.SetUserActive(userId, request.IsActive);
            if (!res.IsSuccess)
            {
                return NotFound(res.ErrorMessage);
            }
            return Ok();
        }

        [HttpGet("appointments")]
        public async Task<IActionResult> GetAppointments()
        {
            var appointments = await adminService.GetAppointments();
            return Ok(appointments);
        }

        [HttpGet("chats")]
        public async Task<IActionResult> GetChatSessions()
        {
            var sessions = await adminService.GetChatSessions();
            return Ok(sessions);
        }

        [HttpGet("chats/{sessionId}/messages")]
        public async Task<IActionResult> GetChatMessages(int sessionId)
        {
            var messages = await adminService.GetChatMessages(sessionId);
            return Ok(messages);
        }
    }
}
