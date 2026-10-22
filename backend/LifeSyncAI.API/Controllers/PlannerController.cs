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

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<PlannerEventDto>>> UpdateEvent(int id, [FromBody] UpdatePlannerEventDto dto)
        {
            var userId = GetUserId();
            var result = await _plannerService.UpdateEventAsync(id, dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateStatus(int id, [FromBody] UpdatePlannerStatusDto dto)
        {
            var userId = GetUserId();
            var result = await _plannerService.UpdateStatusAsync(id, dto.Status, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("{id}/toggle")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleEvent(int id, [FromBody] bool isCompleted)
        {
            var userId = GetUserId();
            var result = await _plannerService.ToggleEventAsync(id, isCompleted, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteEvent(int id)
        {
            var userId = GetUserId();
            var result = await _plannerService.DeleteEventAsync(id, userId);
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
