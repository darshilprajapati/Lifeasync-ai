using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Career
{
    public class JobApplicationStageHistoryDto
    {
        public int Id { get; set; }
        public int JobApplicationId { get; set; }
        public string FromStage { get; set; } = string.Empty;
        public string ToStage { get; set; } = string.Empty;
        public DateTime TransitionDate { get; set; }
        public string? Note { get; set; }
    }

    public class JobApplicationDto
    {
        public int Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedDate { get; set; }
        public string? Notes { get; set; }
        public string? Category { get; set; }
        public string? JobType { get; set; }
        public string? WorkplaceType { get; set; }
        public string? Location { get; set; }
        public string? Salary { get; set; }
        public string? Url { get; set; }
        public int UserId { get; set; }
        public List<JobApplicationStageHistoryDto> StageHistories { get; set; } = new();
    }
}
