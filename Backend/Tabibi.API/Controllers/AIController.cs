using Tabibi.Application.DTOs;
using Tabibi.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Tabibi.Application.Shared;
using Microsoft.AspNetCore.Authorization;
using Tabibi.Application.Extensions;

namespace Tabibi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles=UserRoles.Patient)]
    public class AIController(IPatientAIService patientAIService) : ControllerBase
    {
        [HttpGet("quota")]
        public async Task<IActionResult> GetQuota()
        {
            var userId = User.GetId();
            var result = await patientAIService.GetQuotaAsync(userId!);
            
            if (!result.IsSuccess)
                return NotFound(result.ErrorMessage);

            return Ok(result.Data);
        }

        [HttpPost("recharge")]
        public async Task<IActionResult> Recharge([FromBody] RechargeRequest request)
        {
            var userId = User.GetId();
            var result = await patientAIService.RechargeAsync(userId!, request.Amount);

            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Data);
        }

        [HttpPost("ask")]
        public async Task<IActionResult> AskAI(SendAIMessageDTO request)
        {
            var userId = User.GetId();
            var result = await patientAIService.AskAIAsync(userId!, request);

            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return Ok(result.Data);
        }

        [HttpGet("history/{sessionId}")]
        public async Task<IActionResult> GetHistory(long sessionId)
        {
            var userId = User.GetId();
            var result = await patientAIService.GetHistoryAsync(userId!, sessionId);

            if (!result.IsSuccess)
                return NotFound(result.ErrorMessage);

            return Ok(result.Data);
        }
    }

    public class RechargeRequest
    {
        public decimal Amount { get; set; }
    }
}