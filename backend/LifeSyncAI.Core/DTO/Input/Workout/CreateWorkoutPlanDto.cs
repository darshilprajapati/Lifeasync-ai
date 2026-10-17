using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class CreateWorkoutPlanDto
    {
        public string Title { get; set; } = "My Weekly Routine";
        public string Goal { get; set; } = "Stay Fit";
        public string FitnessLevel { get; set; } = "Beginner";
        public int DaysPerWeek { get; set; } = 4;
        public List<UpdateWorkoutDayDto> Days { get; set; } = new();
    }
}
