using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.LifeScore
{
    public class ScoreBreakdownDto
    {
        public double Baseline { get; set; }
        public double Tasks { get; set; }
        public double Hydration { get; set; }
        public double Workout { get; set; }
        public double Sleep { get; set; }
        public double Steps { get; set; }
        public double Calories { get; set; }
        public double Finance { get; set; }
    }

    public class DailyLifeScoreDto
    {
        public string Date { get; set; } = string.Empty;
        public double FinalScore { get; set; }
        public double Score => FinalScore;
        public double PositiveScore { get; set; }
        public int PenaltyPoints { get; set; }
        public int MissedDeadlinesCount { get; set; }
        public int TotalTasksToday { get; set; }
        public int CompletedTasksToday { get; set; }
        public bool HasActivityToday { get; set; }
        public ScoreBreakdownDto Breakdown { get; set; } = new ScoreBreakdownDto();
        public string MotivationalFeedback { get; set; } = string.Empty;
        public string? PenaltyNotice { get; set; }
    }

    public class HistoricalLifeScoreDto
    {
        public string Date { get; set; } = string.Empty;
        public double Score { get; set; }
        public int PenaltyPoints { get; set; }
        public int MissedDeadlinesCount { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
    }
}
