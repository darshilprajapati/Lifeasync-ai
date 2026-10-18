using System;

namespace LifeSyncAI.Core.Models
{
    public class Exercise : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;          // "Chest", "Back", "Arms", "Shoulders", "Legs", "Core", "Full Body", "Cardio"
        public string TargetMuscles { get; set; } = string.Empty;     // e.g. "Pectorals, Triceps, Anterior Deltoids"
        public bool RequiresEquipment { get; set; } = false;
        public string EquipmentType { get; set; } = "None";           // "None", "Dumbbells", "Resistance Band", "Pull Up Bar", "Yoga Mat", "Kettlebell", "Barbell"
        public string DifficultyLevel { get; set; } = "Beginner";     // "Beginner", "Intermediate", "Advanced"
        public int DefaultSets { get; set; } = 3;
        public int DefaultReps { get; set; } = 12;
        public int DefaultRestSeconds { get; set; } = 60;
        public float EstimatedMetValue { get; set; } = 5.0f;          // Metabolic Equivalent of Task for calorie burn estimation
        public string? ThumbnailUrl { get; set; }
        public string? AnimationUrl { get; set; }
        public string? Instructions { get; set; }

        // Custom exercise and rich kinetic properties
        public int? UserId { get; set; }                               // Null for built-in, set to userId for user-created custom exercises
        public string? SecondaryMuscles { get; set; }
        public string? Description { get; set; }
        public string? VideoUrl { get; set; }
        public string? PostureTips { get; set; }
        public string? CommonMistakes { get; set; }
        public string? SafetyTips { get; set; }
        public bool IsCustom => UserId.HasValue;
    }
}
