using Tabibi.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tabibi.Application.DTOs;
using Tabibi.Application.Services;
using Tabibi.Application.Interfaces;
using Tabibi.Infrastructure.Services;
using Tabibi.Infrastructure.Services.Payments;
using Tabibi.Application.Shared;
using System.Security.Claims;

namespace Tabibi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController(IReviewService reviewService) : ControllerBase
    {
        [HttpGet("doctor/{doctorId}")]
        public async Task<IActionResult> GetDoctorReviews(long doctorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var res = await reviewService.GetDoctorReviewsAsync(doctorId, page, pageSize);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }
            return Ok(res.Data);
        }

        [HttpPost]
        [Authorize(Roles = UserRoles.Patient)]
        public async Task<IActionResult> SubmitReview([FromBody] CreateReviewDTO dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var res = await reviewService.SubmitReviewAsync(userId, dto);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }

            return Ok(new { message = "Review submitted successfully!" });
        }
    }
}




