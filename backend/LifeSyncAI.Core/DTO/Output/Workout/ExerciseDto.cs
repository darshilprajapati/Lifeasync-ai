using System;

namespace LifeSyncAI.Core.DTO.Output.Workout
{
    public class ExerciseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string TargetMuscles { get; set; } = string.Empty;
        public bool RequiresEquipment { get; set; }
        public string EquipmentType { get; set; } = "None";
        public string DifficultyLevel { get; set; } = "Beginner";
        public int DefaultSets { get; set; }
        public int DefaultReps { get; set; }
        public int DefaultRestSeconds { get; set; }
        public float EstimatedMetValue { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? AnimationUrl { get; set; }
        public string? Instructions { get; set; }

        public bool IsCustom { get; set; }
        public int? UserId { get; set; }
        public string? SecondaryMuscles { get; set; }
        public string? Description { get; set; }
        public string? VideoUrl { get; set; }
        public string? PostureTips { get; set; }
        public string? CommonMistakes { get; set; }
        public string? SafetyTips { get; set; }
    }
}
