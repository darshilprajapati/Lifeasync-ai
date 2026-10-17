using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class WorkoutDayDto
    {
        public int Id { get; set; }
        public int WorkoutPlanId { get; set; }
        public DayOfWeek DayOfWeek { get; set; }
        public string DayName => DayOfWeek.ToString();
        public string FocusTitle { get; set; } = string.Empty;
        public bool IsRestDay { get; set; }
        public int TargetDurationMinutes { get; set; }
        public string? RestDayNotes { get; set; }
        public List<WorkoutDayExerciseDto> Exercises { get; set; } = new();

        // Calendar date-specific status (populated when queried for a specific week/date)
        public bool IsCompletedForDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? ActualDurationMinutes { get; set; }
        public int? EstimatedCaloriesBurned { get; set; }
        public int? SessionLogId { get; set; }
        public int CompletedExercisesCount => Exercises?.Count(e => e.IsCompleted) ?? 0;
        public int TotalExercisesCount => Exercises?.Count ?? 0;
        public string? TargetMuscleGroups => Exercises?.Any() == true 
            ? string.Join(", ", Exercises.Select(e => e.Category).Where(c => !string.IsNullOrWhiteSpace(c)).Distinct()) 
            : null;
    }
}
