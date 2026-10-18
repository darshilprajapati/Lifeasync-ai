using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IWorkoutService
    {
        Task<ApiResponse<List<ExerciseDto>>> GetExercisesAsync(bool? requiresEquipment = null, string? category = null, string? search = null, List<string>? equipmentList = null, int? userId = null);
        Task<ApiResponse<ExerciseDto>> CreateCustomExerciseAsync(int userId, CreateCustomExerciseDto dto);
        Task<ApiResponse<UserWorkoutPlanDto>> GetActivePlanAsync(int userId, DateTime? targetDate = null);
        Task<ApiResponse<UserWorkoutPlanDto>> CreateOrUpdatePlanAsync(int userId, CreateWorkoutPlanDto dto);
        Task<ApiResponse<WorkoutDayDto>> UpdateDayAsync(int userId, int dayId, UpdateWorkoutDayDto dto);
        Task<ApiResponse<WorkoutSessionLogDto>> LogSessionAsync(int userId, LogWorkoutSessionDto dto);
        Task<ApiResponse<bool>> DeleteSessionLogAsync(int userId, int sessionLogId);
        Task<ApiResponse<WorkoutWeekSummaryDto>> GetWeekSummaryAsync(int userId, DateTime weekStartDate);
        Task<ApiResponse<AiWorkoutPlanResponseDto>> GenerateAiPlanAsync(int userId, GenerateAiWorkoutPlanRequestDto request);
        Task<ApiResponse<int>> SyncPlannerAsync(int userId, DateTime? weekStartDate);
        Task<ApiResponse<WorkoutDayDto>> ToggleExerciseCompletionAsync(int userId, int workoutDayExerciseId, DateTime sessionDate, bool isCompleted, DateTime? clientReferenceDate = null, int? actualDurationMinutes = null);
        Task<ApiResponse<WorkoutDayDto>> GetWorkoutDayAsync(int userId, int workoutDayId, DateTime? sessionDate = null);
    }
}
