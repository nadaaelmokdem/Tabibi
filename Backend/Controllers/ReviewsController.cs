using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tabibi.DTOs;
using Tabibi.Services;
using Tabibi.Shared;
using System.Security.Claims;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController(ReviewService reviewService) : ControllerBase
    {
        [HttpGet("doctor/{doctorId}")]
        public async Task<IActionResult> GetDoctorReviews(int doctorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var res = await reviewService.GetDoctorReviewsAsync(doctorId, page, pageSize);
            if (!res.IsSuccess)
            {
                return BadRequest(res.ErrorMessage);
            }
            return Ok(res.Value);
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
