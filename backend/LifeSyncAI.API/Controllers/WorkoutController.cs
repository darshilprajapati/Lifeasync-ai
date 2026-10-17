using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class WorkoutController : ControllerBase
    {
        private readonly IWorkoutService _workoutService;

        public WorkoutController(IWorkoutService workoutService)
        {
            _workoutService = workoutService;
        }

        [HttpGet("exercises")]
        public async Task<ActionResult<ApiResponse<List<ExerciseDto>>>> GetExercises(
            [FromQuery] bool? requiresEquipment,
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] List<string>? equipmentList)
        {
            var result = await _workoutService.GetExercisesAsync(requiresEquipment, category, search, equipmentList);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("plan")]
        public async Task<ActionResult<ApiResponse<UserWorkoutPlanDto>>> GetActivePlan([FromQuery] DateTime? targetDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<UserWorkoutPlanDto>.Fail("User is not authenticated."));
            var result = await _workoutService.GetActivePlanAsync(userId, targetDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("plan")]
        public async Task<ActionResult<ApiResponse<UserWorkoutPlanDto>>> CreateOrUpdatePlan([FromBody] CreateWorkoutPlanDto dto)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<UserWorkoutPlanDto>.Fail("User is not authenticated."));
            var result = await _workoutService.CreateOrUpdatePlanAsync(userId, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("days/{dayId}")]
        public async Task<ActionResult<ApiResponse<WorkoutDayDto>>> GetDay(int dayId, [FromQuery] DateTime? sessionDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutDayDto>.Fail("User is not authenticated."));
            var result = await _workoutService.GetWorkoutDayAsync(userId, dayId, sessionDate);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("days/{dayId}")]
        public async Task<ActionResult<ApiResponse<WorkoutDayDto>>> UpdateDay(int dayId, [FromBody] UpdateWorkoutDayDto dto)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutDayDto>.Fail("User is not authenticated."));
            var result = await _workoutService.UpdateDayAsync(userId, dayId, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("exercises/{workoutDayExerciseId}/complete")]
        public async Task<ActionResult<ApiResponse<WorkoutDayDto>>> CompleteExercise(int workoutDayExerciseId, [FromQuery] DateTime? sessionDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutDayDto>.Fail("User is not authenticated."));
            var date = sessionDate ?? DateTime.UtcNow.Date;
            var result = await _workoutService.ToggleExerciseCompletionAsync(userId, workoutDayExerciseId, date, true);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("exercises/{workoutDayExerciseId}/undo")]
        public async Task<ActionResult<ApiResponse<WorkoutDayDto>>> UndoExercise(int workoutDayExerciseId, [FromQuery] DateTime? sessionDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutDayDto>.Fail("User is not authenticated."));
            var date = sessionDate ?? DateTime.UtcNow.Date;
            var result = await _workoutService.ToggleExerciseCompletionAsync(userId, workoutDayExerciseId, date, false);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("sessions")]
        public async Task<ActionResult<ApiResponse<WorkoutSessionLogDto>>> LogSession([FromBody] LogWorkoutSessionDto dto)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutSessionLogDto>.Fail("User is not authenticated."));
            var result = await _workoutService.LogSessionAsync(userId, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("sessions/{sessionLogId}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteSessionLog(int sessionLogId)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<bool>.Fail("User is not authenticated."));
            var result = await _workoutService.DeleteSessionLogAsync(userId, sessionLogId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<WorkoutWeekSummaryDto>>> GetWeekSummary([FromQuery] DateTime? weekStartDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<WorkoutWeekSummaryDto>.Fail("User is not authenticated."));
            var date = weekStartDate ?? DateTime.UtcNow.Date;
            int diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
            var monday = date.AddDays(-diff);

            var result = await _workoutService.GetWeekSummaryAsync(userId, monday);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("ai/generate")]
        public async Task<ActionResult<ApiResponse<AiWorkoutPlanResponseDto>>> GenerateAiPlan([FromBody] GenerateAiWorkoutPlanRequestDto dto)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<AiWorkoutPlanResponseDto>.Fail("User is not authenticated."));
            var result = await _workoutService.GenerateAiPlanAsync(userId, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("sync-planner")]
        public async Task<ActionResult<ApiResponse<int>>> SyncPlanner([FromQuery] DateTime? weekStartDate)
        {
            var userId = GetUserId();
            if (userId <= 0) return Unauthorized(ApiResponse<int>.Fail("User is not authenticated."));
            var result = await _workoutService.SyncPlannerAsync(userId, weekStartDate);
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
