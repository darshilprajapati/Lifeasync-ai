using System;

namespace LifeSyncAI.Core.DTO.Input.Workout
{
    public class CompleteExerciseRequestDto
    {
        public int? ActualDurationMinutes { get; set; }
        public DateTime? SessionDate { get; set; }
    }
}
