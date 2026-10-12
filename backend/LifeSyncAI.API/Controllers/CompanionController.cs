using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Companion;
using LifeSyncAI.Core.DTO.Output.Companion;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CompanionController : ControllerBase
    {
        private readonly ICompanionService _companionService;

        public CompanionController(ICompanionService companionService)
        {
            _companionService = companionService;
        }

        [HttpPost("reset")]
        public ActionResult<ApiResponse<string>> ResetSession()
        {
            var userId = GetUserId();
            var result = _companionService.ResetSession(userId);
            return Ok(result);
        }

        [HttpPost("message")]
        public async Task<ActionResult<ApiResponse<CompanionResponseDto>>> SendMessage([FromBody] CompanionRequestDto dto)
        {
            var userId = GetUserId();
            if (userId == 0)
            {
                return Unauthorized(ApiResponse<CompanionResponseDto>.Fail("User is not authenticated."));
            }

            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var result = await _companionService.ProcessMessageAsync(userId, dto, clientDateStr);
            return Ok(result);
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }
}
