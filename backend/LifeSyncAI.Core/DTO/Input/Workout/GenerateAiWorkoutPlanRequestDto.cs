using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class GenerateAiWorkoutPlanRequestDto
    {
        public string Goal { get; set; } = "Stay Fit"; // "Stay Fit", "Build Muscle", "Fat Loss", "Endurance"
        public string FitnessLevel { get; set; } = "Beginner"; // "Beginner", "Intermediate", "Advanced"
        public int DaysPerWeek { get; set; } = 4; // 1 to 7
        public int PreferredDurationMinutes { get; set; } = 30; // 1 to 120
        public string WorkoutMode { get; set; } = "Without Equipment"; // "Without Equipment", "With Equipment", "Hybrid"
        public bool HasEquipment { get; set; } = false; // backward compatibility
        public List<string> AvailableEquipment { get; set; } = new(); // e.g. ["Dumbbells", "Pull Up Bar"]
        public List<string> FocusAreas { get; set; } = new(); // e.g. ["Chest", "Core", "Legs", "All"]
    }
}
