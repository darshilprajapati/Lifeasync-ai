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
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? ActualDurationMinutes { get; set; }

        public bool IsCustom { get; set; }
        public string DifficultyLevel { get; set; } = "Beginner";
        public string? SecondaryMuscles { get; set; }
        public string? Description { get; set; }
        public string? VideoUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? AnimationUrl { get; set; }
        public string? PostureTips { get; set; }
        public string? CommonMistakes { get; set; }
        public string? SafetyTips { get; set; }
    }
}
