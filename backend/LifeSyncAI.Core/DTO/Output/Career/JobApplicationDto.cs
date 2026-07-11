using System;

namespace LifeSyncAI.Core.DTO.Output.Career
{
    public class JobApplicationDto
    {
        public int Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedDate { get; set; }
        public string? Notes { get; set; }
        public int UserId { get; set; }
    }
}
