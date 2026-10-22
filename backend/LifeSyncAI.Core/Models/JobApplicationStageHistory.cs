using System;

namespace LifeSyncAI.Core.Models
{
    public class JobApplicationStageHistory
    {
        public int Id { get; set; }
        public int JobApplicationId { get; set; }
        public string FromStage { get; set; } = string.Empty;
        public string ToStage { get; set; } = string.Empty;
        public DateTime TransitionDate { get; set; } = DateTime.UtcNow;
        public string? Note { get; set; }
        public int UserId { get; set; }
    }
}
