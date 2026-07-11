using System;

namespace LifeSyncAI.Core.Models
{
    public class ReportRequest
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public int UserId { get; set; }
        public string Module { get; set; } = string.Empty; // 'Planner', 'Finance', 'Health', 'Career', 'Vault', 'AiInsights', 'All'
        public string Frequency { get; set; } = string.Empty; // 'Daily', 'Weekly', 'Monthly', 'Yearly'
        public string Status { get; set; } = "Pending"; // 'Pending', 'Processing', 'Completed', 'Failed'
        public string FilePath { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    }
}
