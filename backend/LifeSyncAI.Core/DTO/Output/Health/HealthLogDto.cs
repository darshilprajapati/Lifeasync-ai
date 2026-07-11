using System;

namespace LifeSyncAI.Core.DTO.Output.Health
{
    public class HealthLogDto
    {
        public int Id { get; set; }
        public string LogType { get; set; } = string.Empty;
        public float LogValue { get; set; }
        public string? Details { get; set; }
        public DateTime LogDate { get; set; }
        public int UserId { get; set; }
    }
}
