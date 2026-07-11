using System;

namespace LifeSyncAI.Core.Models
{
    public class HealthLog
    {
        public int Id { get; set; }
        public string LogType { get; set; } = string.Empty; // 'Water' or 'Workout'
        public float LogValue { get; set; }                 // Milliliters or Minutes
        public string? Details { get; set; }
        public DateTime LogDate { get; set; }
        public int UserId { get; set; }
    }
}
