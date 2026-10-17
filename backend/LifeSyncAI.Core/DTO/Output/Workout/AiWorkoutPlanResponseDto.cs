using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class AiWorkoutPlanResponseDto
    {
        public string Title { get; set; } = string.Empty;
        public string Goal { get; set; } = string.Empty;
        public string FitnessLevel { get; set; } = string.Empty;
        public int DaysPerWeek { get; set; }
        public string SplitDescription { get; set; } = string.Empty;
        public string AIReasoning { get; set; } = string.Empty;
        public string Source { get; set; } = "Deterministic"; // "LLM" or "Deterministic"
        public List<WorkoutDayDto> SuggestedDays { get; set; } = new();
    }
}
