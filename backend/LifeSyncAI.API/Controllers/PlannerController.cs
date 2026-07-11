using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Planner;
using LifeSyncAI.Core.DTO.Output.Planner;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PlannerController : ControllerBase
    {
        private readonly IPlannerService _plannerService;

        public PlannerController(IPlannerService plannerService)
        {
            _plannerService = plannerService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<PlannerEventDto>>>> GetEvents()
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = System.DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : System.DateTime.UtcNow;

            var result = await _plannerService.GetEventsAsync(userId, clientDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PlannerEventDto>>> CreateEvent([FromBody] CreatePlannerEventDto dto)
        {
            var userId = GetUserId();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = System.DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : System.DateTime.UtcNow;

            var result = await _plannerService.CreateEventAsync(dto, userId, clientDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("{id}/toggle")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleEvent(int id, [FromBody] bool isCompleted)
        {
            var result = await _plannerService.ToggleEventAsync(id, isCompleted);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteEvent(int id)
        {
            var result = await _plannerService.DeleteEventAsync(id);
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
