using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Output.AiInsights;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/insights")]
    public class AiInsightsController : ControllerBase
    {
        private readonly IAiInsightsService _aiInsightsService;

        public AiInsightsController(IAiInsightsService aiInsightsService)
        {
            _aiInsightsService = aiInsightsService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<AiRecommendationDto>>>> GetRecommendations()
        {
            var userId = GetUserId();
            var result = await _aiInsightsService.GetRecommendationsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("generate")]
        public async Task<ActionResult<ApiResponse<List<AiRecommendationDto>>>> GenerateRecommendations()
        {
            var userId = GetUserId();
            var result = await _aiInsightsService.GenerateRecommendationsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }
}
