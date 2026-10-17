using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.Models
{
    public class WorkoutDay : BaseEntity
    {
        public int WorkoutPlanId { get; set; }
        public DayOfWeek DayOfWeek { get; set; }                      // DayOfWeek.Monday (1) ... DayOfWeek.Sunday (0)
        public string FocusTitle { get; set; } = "Rest Day";          // e.g. "Chest & Arms", "Rest Day"
        public bool IsRestDay { get; set; } = false;
        public int TargetDurationMinutes { get; set; } = 25;
        public string? RestDayNotes { get; set; }
        public List<WorkoutDayExercise> Exercises { get; set; } = new();
    }
}
