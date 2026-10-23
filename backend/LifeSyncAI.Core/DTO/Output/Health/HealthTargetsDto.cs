namespace LifeSyncAI.Core.DTO.Output.Health
{
    public class HealthTargetsDto
    {
        public int DailyWaterGoal { get; set; } = 2000;
        public double DailySleepGoal { get; set; } = 8.0;
        public int DailyStepsGoal { get; set; } = 10000;
        public int DailyCalorieGoal { get; set; } = 2000;
        public int DailyWorkoutGoal { get; set; } = 30;
    }
}
