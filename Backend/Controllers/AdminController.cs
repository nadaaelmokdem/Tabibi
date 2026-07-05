using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Services;
using Tabibi.Shared;

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

        [HttpPatch("doctors/{doctorId}/verify")]
        public async Task<IActionResult> VerifyDoctor(int doctorId, [FromBody] bool approve)
        {
            var res = await adminService.VerifyDoctor(doctorId, approve);
            if (!res.IsSuccess)
            {
                return NotFound(res.ErrorMessage);
            }
            return Ok();
        }
    }
}
