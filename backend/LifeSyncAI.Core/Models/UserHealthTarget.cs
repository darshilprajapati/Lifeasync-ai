using System;

namespace LifeSyncAI.Core.Models
{
    /// <summary>
    /// Configurable daily health and wellness goals per authenticated user.
    /// </summary>
    public class UserHealthTarget : BaseEntity
    {
        public int UserId { get; set; }
        public int DailyWaterGoal { get; set; } = 2000;
        public double DailySleepGoal { get; set; } = 8.0;
        public int DailyStepsGoal { get; set; } = 10000;
        public int DailyCalorieGoal { get; set; } = 2000;
        public int DailyWorkoutGoal { get; set; } = 30;
    }
}
