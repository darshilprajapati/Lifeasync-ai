using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class UpdateWorkoutDayDto
    {
        public DayOfWeek DayOfWeek { get; set; }
        public string FocusTitle { get; set; } = string.Empty;
        public bool IsRestDay { get; set; }
        public int TargetDurationMinutes { get; set; } = 25;
        public string? RestDayNotes { get; set; }
        public List<WorkoutDayExerciseInputDto> Exercises { get; set; } = new();
    }
}
