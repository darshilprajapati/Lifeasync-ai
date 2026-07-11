using System;

namespace LifeSyncAI.Core.Models
{
    public class AiRecommendation
    {
        public int Id { get; set; }
        public string InsightText { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
    }
}
