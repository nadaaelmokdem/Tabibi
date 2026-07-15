using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Application.Services;
using Tabibi.Application.Interfaces;
using Tabibi.Infrastructure.Services;
using Tabibi.Infrastructure.Services.Payments;
using Tabibi.Application.Shared;
using Tabibi.Application.DTOs;
using Tabibi.Core.Models;

namespace Tabibi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = UserRoles.Admin)]
    public class AdminController(IAdminService adminService) : ControllerBase
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
        public async Task<IActionResult> GetAllDoctors([FromQuery] DoctorVerificationStatus? status)
        {
            var doctors = await adminService.GetAllDoctors(status);
            return Ok(doctors);
        }

        [HttpGet("doctors/{doctorId}")]
        public async Task<IActionResult> GetDoctorDetail(long doctorId)
        {
            var doctor = await adminService.GetDoctorDetail(doctorId);
            if (doctor == null) return NotFound();
            return Ok(doctor);
        }

        [HttpGet("doctors/{doctorId}/changes")]
        public async Task<IActionResult> GetDoctorChanges(long doctorId)
        {
            var changes = await adminService.GetDoctorChanges(doctorId);
            return Ok(changes);
        }

        [HttpPatch("doctors/{doctorId}/verify")]
        public async Task<IActionResult> VerifyDoctor(long doctorId, [FromBody] ReviewDoctorRequestDTO request)
        {
            var res = await adminService.VerifyDoctor(doctorId, request);
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

    }
}




