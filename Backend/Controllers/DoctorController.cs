using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.DTOs;
using Tabibi.Services;
using Tabibi.Extensions;
using Tabibi.Shared;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = UserRoles.Doctor)]
    public class DoctorController(DoctorService doctorService, IFileService fileService) : ControllerBase
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

        [HttpPut("profile")]
        public async Task<IActionResult> BulkUpdateProfile([FromBody] DoctorProfileBulkUpdateDTO profileData)
        {
            var userId = User.GetId();

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var res = await doctorService.BulkUpdateProfile(userId, profileData);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }

            return Ok(res.Data);
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

        [HttpPost("upload-proof")]
        public async Task<IActionResult> UploadProof(IFormFile file, [FromForm] string fieldName)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not authenticated");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded");
            }

            // Valid field names for proofs
            var validFields = new[] { "licenseProofUrl", "idProofUrl", "degreeProofUrl", "profilePictureUrl" };
            if (!validFields.Contains(fieldName))
            {
                return BadRequest("Invalid field name for file upload");
            }

            var fileUrl = await fileService.UploadFileAsync(file, "proofs");

            // Update the profile field with this URL
            var res = await doctorService.UpdateProfileField(userId, fieldName, fileUrl);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }

            return Ok(new { url = fileUrl, field = fieldName });
        }

        [HttpGet("availability")]
        public async Task<IActionResult> GetAvailability()
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var availabilities = await doctorService.GetAvailabilities(userId);
            return Ok(availabilities);
        }

        [HttpPut("availability")]
        public async Task<IActionResult> UpdateAvailability([FromBody] UpdateAvailabilityRequestDTO request)
        {
            var userId = User.GetId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (!ModelState.IsValid) return BadRequest(ModelState);

            var res = await doctorService.UpdateAvailabilities(userId, request);
            if (!res.IsSuccess) return BadRequest(res.ErrorMessage);

            return Ok(new { message = "Availability updated successfully" });
        }
    }
}
