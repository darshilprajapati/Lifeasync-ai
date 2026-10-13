using System;

namespace LifeSyncAI.Core.Models
{
    public class PlannerEvent
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public bool ReminderSent { get; set; } = false;
        public DateTime? ReminderSentAt { get; set; }
        public bool MissedDeadlinePenalized { get; set; } = false;
        public DateTime? PenaltyAppliedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public int UserId { get; set; }
    }
}
