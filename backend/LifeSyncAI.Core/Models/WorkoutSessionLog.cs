using System;

namespace LifeSyncAI.Core.Models
{
    public class WorkoutSessionLog : BaseEntity
    {
        public int UserId { get; set; }
        public int WorkoutPlanId { get; set; }
        public int WorkoutDayId { get; set; }
        public DateTime SessionDate { get; set; }                     // The calendar date: e.g. 2026-10-16
        public bool IsCompleted { get; set; } = true;
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
        public int ActualDurationMinutes { get; set; }
        public int EstimatedCaloriesBurned { get; set; }              // Explicitly labeled as estimate
        public int? HealthLogId { get; set; }                         // Foreign key link to HealthLog (LogType = "Workout")
        public string? Notes { get; set; }
    }
}
