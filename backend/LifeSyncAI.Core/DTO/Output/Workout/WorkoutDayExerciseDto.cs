using System;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class WorkoutDayExerciseDto
    {
        public int Id { get; set; }
        public int WorkoutDayId { get; set; }
        public int ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string TargetMuscles { get; set; } = string.Empty;
        public bool RequiresEquipment { get; set; }
        public string EquipmentType { get; set; } = "None";
        public int Sets { get; set; }
        public int Reps { get; set; }
        public int RestSeconds { get; set; }
        public int OrderIndex { get; set; }
        public float EstimatedMetValue { get; set; }
        public string? Instructions { get; set; }
    }
}
