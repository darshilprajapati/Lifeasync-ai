using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.Models
{
    public class UserWorkoutPlan : BaseEntity
    {
        public int UserId { get; set; }
        public string Title { get; set; } = "My Weekly Routine";
        public string Goal { get; set; } = "Stay Fit";                // "Stay Fit", "Build Muscle", "Fat Loss", "Endurance"
        public string FitnessLevel { get; set; } = "Beginner";
        public int DaysPerWeek { get; set; } = 5;
        public bool IsActive { get; set; } = true;
        public int Version { get; set; } = 1;
        public DateTime EffectiveStartDate { get; set; } = DateTime.UtcNow.Date;
        public List<WorkoutDay> Days { get; set; } = new();
    }
}
