using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Companion
{
    public class CompanionResponseDto
    {
        public string Reply { get; set; } = string.Empty;
        public string Mood { get; set; } = string.Empty;
        public int LifeScore { get; set; }
        public bool IsExternalSearch { get; set; }
        public List<string>? Sources { get; set; }
    }
}
