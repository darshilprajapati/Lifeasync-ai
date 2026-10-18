using System;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class CreateCustomExerciseDto
    {
        [Required(ErrorMessage = "Exercise name is required.")]
        public string Name { get; set; } = string.Empty;

        public string Category { get; set; } = "Full Body";

        [Required(ErrorMessage = "Primary muscle group is required.")]
        public string TargetMuscles { get; set; } = string.Empty;

        public string? SecondaryMuscles { get; set; }

        public bool RequiresEquipment { get; set; } = false;

        public string EquipmentType { get; set; } = "None";

        public string DifficultyLevel { get; set; } = "Beginner";

        public int DefaultSets { get; set; } = 3;

        public int DefaultReps { get; set; } = 12;

        public int DefaultRestSeconds { get; set; } = 60;

        public float EstimatedMetValue { get; set; } = 5.0f;

        public string? Description { get; set; }

        public string? Instructions { get; set; }

        public string? VideoUrl { get; set; }

        public string? ThumbnailUrl { get; set; }

        public string? AnimationUrl { get; set; }

        public string? PostureTips { get; set; }

        public string? CommonMistakes { get; set; }

        public string? SafetyTips { get; set; }
    }
}
