using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Output.LifeScore;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LifeScoreController : ControllerBase
    {
        private readonly ILifeScoreService _lifeScoreService;

        public LifeScoreController(ILifeScoreService lifeScoreService)
        {
            _lifeScoreService = lifeScoreService;
        }

        [HttpGet("today")]
        public async Task<ActionResult<ApiResponse<DailyLifeScoreDto>>> GetTodayScore()
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : DateTime.UtcNow;

            var result = await _lifeScoreService.GetDailyLifeScoreAsync(userId, clientDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<DailyLifeScoreDto>>> GetScoreByDate([FromQuery] string? date)
        {
            var userId = GetUserId();
            DateTime targetDate;
            if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
            {
                targetDate = parsedDate;
            }
            else
            {
                var clientDateStr = Request.Headers["X-Client-Date"].ToString();
                targetDate = DateTime.TryParse(clientDateStr, out var cd) ? cd : DateTime.UtcNow;
            }

            var result = await _lifeScoreService.GetDailyLifeScoreAsync(userId, targetDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("history")]
        public async Task<ActionResult<ApiResponse<List<HistoricalLifeScoreDto>>>> GetHistory([FromQuery] int days = 7)
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = DateTime.TryParse(clientDateStr, out var cd) ? cd : DateTime.UtcNow;

            var result = await _lifeScoreService.GetHistoricalScoresAsync(userId, clientDate, Math.Min(30, Math.Max(1, days)));
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
