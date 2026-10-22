using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.Models
{
    public class JobApplication
    {
        public int Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // 'Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'
        public DateTime AppliedDate { get; set; }
        public string? Notes { get; set; }
        public string? Category { get; set; }
        public string? JobType { get; set; }
        public string? WorkplaceType { get; set; }
        public string? Location { get; set; }
        public string? Salary { get; set; }
        public string? Url { get; set; }
        public int UserId { get; set; }

        public List<JobApplicationStageHistory> StageHistories { get; set; } = new();
    }
}
