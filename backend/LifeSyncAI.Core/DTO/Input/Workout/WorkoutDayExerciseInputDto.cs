using System;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class WorkoutDayExerciseInputDto
    {
        public int ExerciseId { get; set; }
        public int Sets { get; set; } = 3;
        public int Reps { get; set; } = 12;
        public int RestSeconds { get; set; } = 60;
        public int OrderIndex { get; set; } = 0;
    }
}
