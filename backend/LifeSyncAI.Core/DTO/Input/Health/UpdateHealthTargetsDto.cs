using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Health
{
    public class UpdateHealthTargetsDto
    {
        [Range(250, 10000, ErrorMessage = "Daily water goal must be between 250 ml and 10,000 ml.")]
        public int DailyWaterGoal { get; set; } = 2000;

        [Range(1, 24, ErrorMessage = "Daily sleep goal must be between 1 and 24 hours.")]
        public double DailySleepGoal { get; set; } = 8.0;

        [Range(500, 100000, ErrorMessage = "Daily steps goal must be between 500 and 100,000 steps.")]
        public int DailyStepsGoal { get; set; } = 10000;

        [Range(500, 10000, ErrorMessage = "Daily calorie target must be between 500 and 10,000 kcal.")]
        public int DailyCalorieGoal { get; set; } = 2000;

        [Range(5, 360, ErrorMessage = "Daily workout duration goal must be between 5 and 360 minutes.")]
        public int DailyWorkoutGoal { get; set; } = 30;
    }
}
