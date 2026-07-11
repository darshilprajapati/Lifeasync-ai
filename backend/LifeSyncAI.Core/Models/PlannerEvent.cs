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
        public int UserId { get; set; }
    }
}
