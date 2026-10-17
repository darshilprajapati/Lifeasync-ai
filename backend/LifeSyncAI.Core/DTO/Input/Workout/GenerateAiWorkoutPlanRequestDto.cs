using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class GenerateAiWorkoutPlanRequestDto
    {
        public string Goal { get; set; } = "Stay Fit"; // "Stay Fit", "Build Muscle", "Fat Loss", "Endurance"
        public string FitnessLevel { get; set; } = "Beginner"; // "Beginner", "Intermediate", "Advanced"
        public int DaysPerWeek { get; set; } = 4; // 3 to 6
        public int PreferredDurationMinutes { get; set; } = 30; // 15 to 90
        public bool HasEquipment { get; set; } = false; // false = Without Equipment (bodyweight only)
        public List<string> AvailableEquipment { get; set; } = new(); // e.g. ["Dumbbells", "Pull Up Bar"]
        public List<string> FocusAreas { get; set; } = new(); // e.g. ["Chest", "Core", "Legs"]
    }
}
