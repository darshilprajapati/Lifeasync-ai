using System;

namespace LifeSyncAI.Core.Models
{
    public class JobApplication
    {
        public int Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // 'Applied', 'Interviewing', 'Offered', 'Rejected'
        public DateTime AppliedDate { get; set; }
        public string? Notes { get; set; }
        public int UserId { get; set; }
    }
}
