using Tabibi.Core.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Application.DTOs;
using Tabibi.Application.Services;
using Tabibi.Application.Interfaces;
using Tabibi.Infrastructure.Services;
using Tabibi.Infrastructure.Services.Payments;

namespace Tabibi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class PublicController(IPublicService publicService) : ControllerBase
    {
        [HttpGet("doctors")]
        public async Task<IActionResult> GetDoctors([FromQuery] DoctorSearchFilterDTO filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1 || filter.PageSize > 50) filter.PageSize = 10;

            var result = await publicService.GetDoctorsAsync(filter);
            return Ok(result);
        }
        [HttpGet("doctors/{doctorId}")]
        public async Task<IActionResult> GetDoctorById(long doctorId)
        {
            var doctor = await publicService.GetDoctorByIdAsync(doctorId);
            if (doctor == null) return NotFound("Doctor not found");
            return Ok(doctor);
        }
    }
}



