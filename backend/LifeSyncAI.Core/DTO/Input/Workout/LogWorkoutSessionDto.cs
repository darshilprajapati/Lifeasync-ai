using System;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class LogWorkoutSessionDto
    {
        public int WorkoutDayId { get; set; }
        public DateTime SessionDate { get; set; }
        public bool IsCompleted { get; set; } = true;
        public int ActualDurationMinutes { get; set; }
        public string? Notes { get; set; }
    }
}
