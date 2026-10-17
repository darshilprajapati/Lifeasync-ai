using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class WorkoutWeekSummaryDto
    {
        public DateTime WeekStartDate { get; set; }
        public DateTime WeekEndDate { get; set; }
        public int TotalPlannedWorkouts { get; set; }
        public int CompletedWorkouts { get; set; }
        public int TotalMinutesExercised { get; set; }
        public int TotalEstimatedCaloriesBurned { get; set; }
        public float AdherenceRatePercentage { get; set; }
        public Dictionary<string, int> MuscleGroupFocusPercentages { get; set; } = new();
    }
}
