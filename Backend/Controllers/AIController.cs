using Tabibi.DTOs;
using Tabibi.Services;
using Microsoft.AspNetCore.Mvc;

namespace Tabibi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AIController(AIDoctor aiDoctor) : ControllerBase
    {
        [HttpPost()]
        public async Task<IActionResult> AskAI(SendAIMessageDTO request)
        {
            return Ok(await aiDoctor.Ask(request.RequestText, request.ContextText));
        }
    }
}
