using System;

namespace LifeSyncAI.Core.DTO.Output.Planner
{
    public class PlannerEventDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; } = "Todo";
        public string Priority { get; set; } = "Medium";
        public string Category { get; set; } = "General";
        public bool MissedDeadlinePenalized { get; set; }
        public bool ReminderSent { get; set; }
        public DateTime? ReminderTime { get; set; }
        public int UserId { get; set; }
    }
}
