using System;

namespace LifeSyncAI.Core.Models
{
    public class WorkoutExerciseCompletion : BaseEntity
    {
        public int UserId { get; set; }
        public int WorkoutPlanId { get; set; }
        public int WorkoutDayId { get; set; }
        public int WorkoutDayExerciseId { get; set; }
        public int ExerciseId { get; set; }
        public DateTime SessionDate { get; set; }                     // Calendar date: e.g. 2026-10-17
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
        public int ActualDurationMinutes { get; set; }
        public int? HealthLogId { get; set; }                         // Linked HealthLog (LogType = "Workout") for Health Activity synchronization
    }
}
