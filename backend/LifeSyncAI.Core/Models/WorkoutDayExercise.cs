using System;

namespace LifeSyncAI.Core.Models
{
    public class WorkoutDayExercise : BaseEntity
    {
        public int WorkoutDayId { get; set; }
        public int ExerciseId { get; set; }
        public Exercise Exercise { get; set; } = null!;
        public int Sets { get; set; } = 3;
        public int Reps { get; set; } = 12;
        public int RestSeconds { get; set; } = 60;
        public int OrderIndex { get; set; } = 0;
    }
}
