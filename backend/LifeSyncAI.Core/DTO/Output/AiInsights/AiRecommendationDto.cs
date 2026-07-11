using System;

namespace LifeSyncAI.Core.DTO.Output.AiInsights
{
    public class AiRecommendationDto
    {
        public int Id { get; set; }
        public string InsightText { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
    }
}
