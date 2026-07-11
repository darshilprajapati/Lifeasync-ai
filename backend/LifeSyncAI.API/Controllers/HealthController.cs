using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.DTO.Output.Health;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly IHealthService _healthService;
        private readonly IWellnessForecasterService _forecasterService;

        public HealthController(IHealthService healthService, IWellnessForecasterService forecasterService)
        {
            _healthService = healthService;
            _forecasterService = forecasterService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<HealthLogDto>>>> GetLogs()
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = System.DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : System.DateTime.UtcNow;

            var result = await _healthService.GetLogsAsync(userId, clientDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<HealthLogDto>>> CreateLog([FromBody] CreateHealthLogDto dto)
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = System.DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : System.DateTime.UtcNow;

            var result = await _healthService.CreateLogAsync(dto, userId, clientDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteLog(int id)
        {
            var result = await _healthService.DeleteLogAsync(id);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("forecast")]
        public async Task<ActionResult<ApiResponse<WellnessForecastDto>>> ForecastWellnessScore([FromBody] WellnessForecastInputDto dto)
        {
            var userId = GetUserId();
            var result = await _forecasterService.ForecastWellnessScoreAsync(userId, dto);
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
