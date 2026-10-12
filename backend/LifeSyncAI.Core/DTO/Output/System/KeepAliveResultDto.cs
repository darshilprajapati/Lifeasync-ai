using System;

namespace LifeSyncAI.Core.DTO.Output.System
{
    public class KeepAliveResultDto
    {
        public string Status { get; set; } = "Healthy";
        public bool DatabaseConnected { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string TimestampUtc { get; set; } = string.Empty;
        public string TimestampIst { get; set; } = string.Empty;
    }
}
