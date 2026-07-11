namespace LifeSyncAI.Core.DTO.Output.Health
{
    public class WellnessForecastDto
    {
        public float ForecastedLifeScore { get; set; }
        public string ModelAccuracy { get; set; } = string.Empty;
        public string HealthRecommendation { get; set; } = string.Empty;
    }
}
