using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.DTOs;
using Tabibi.Services;
using Tabibi.Extensions;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DoctorController(DoctorService doctorService) : ControllerBase
    {
        [HttpPatch("profile-field")]
        public async Task<IActionResult> UpdateProfileField([FromBody] DoctorProfileFieldDTO fieldData)
        {
            var userId = User.GetId();
            
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (string.IsNullOrEmpty(fieldData.FieldName) || string.IsNullOrEmpty(fieldData.Value))
            {
                return BadRequest("Field name and value are required");
            }
            var res = (await doctorService.UpdateProfileField(userId, fieldData.FieldName, fieldData.Value));
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }

            return Ok($"{fieldData.FieldName} updated successfully");
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetDoctorProfile()
        {
            var userId = User.GetId();

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            var profile = await doctorService.GetProfile(userId);

            if (profile is not null)
            {
                return Ok(profile);
            }
            return NotFound("Doctor does not exist!");
        }
           
        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboard()
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }
 
            var dashboard = await doctorService.GetDashboard(userId);
            if (dashboard is null)
            {
                return NotFound("Doctor does not exist!");
            }
 
            return Ok(dashboard);
        }
    }
}