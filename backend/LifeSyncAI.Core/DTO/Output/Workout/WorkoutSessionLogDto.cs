using System;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class WorkoutSessionLogDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int WorkoutPlanId { get; set; }
        public int WorkoutDayId { get; set; }
        public DateTime SessionDate { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime CompletedAt { get; set; }
        public int ActualDurationMinutes { get; set; }
        public int EstimatedCaloriesBurned { get; set; }
        public int? HealthLogId { get; set; }
        public string? Notes { get; set; }
    }
}
