using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class UserWorkoutPlanDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Goal { get; set; } = string.Empty;
        public string FitnessLevel { get; set; } = string.Empty;
        public int DaysPerWeek { get; set; }
        public bool IsActive { get; set; }
        public int Version { get; set; }
        public DateTime EffectiveStartDate { get; set; }
        public List<WorkoutDayDto> Days { get; set; } = new();
    }
}
