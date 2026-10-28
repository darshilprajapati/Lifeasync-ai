using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Output.LifeScore;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class LifeScoreService : ILifeScoreService
    {
        private readonly ApplicationDbContext _context;

        public LifeScoreService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<DailyLifeScoreDto>> GetDailyLifeScoreAsync(int userId, DateTime targetDate, int clientOffsetMinutes = 0)
        {
            try
            {
                var localStart = targetDate.Date;
                var startOfDay = clientOffsetMinutes != 0 ? localStart.AddMinutes(clientOffsetMinutes) : localStart;
                var endOfDay = startOfDay.AddDays(1);
                var nowUtc = DateTime.UtcNow;

                // 1. Fetch Health Logs for the specific calendar day [startOfDay, endOfDay)
                var healthLogs = await _context.HealthLogs
                    .Where(h => h.UserId == userId && h.LogDate >= startOfDay && h.LogDate < endOfDay)
                    .ToListAsync();

                double waterSum = healthLogs.Where(h => h.LogType == "Water").Sum(h => (double)h.LogValue);
                double sleepSum = healthLogs.Where(h => h.LogType == "Sleep").Sum(h => (double)h.LogValue);
                double stepsSum = healthLogs.Where(h => h.LogType == "Steps").Sum(h => (double)h.LogValue);
                double caloriesSum = healthLogs.Where(h => h.LogType == "Calories").Sum(h => (double)h.LogValue);
                double workoutSum = healthLogs.Where(h => h.LogType == "Workout").Sum(h => (double)h.LogValue);

                // 2. Fetch Planner Events whose deadline falls on the specific calendar day [startOfDay, endOfDay)
                var dayTasks = await _context.PlannerEvents
                    .Where(e => e.UserId == userId && e.EndTime >= startOfDay && e.EndTime < endOfDay)
                    .ToListAsync();

                // Fetch persistent penalty logs for this day to ensure deleted tasks STILL retain their penalty!
                var persistentPenaltyLogs = await _context.UserNotificationLogs
                    .Where(n => n.UserId == userId &&
                                n.NotificationType == "MissedDeadlinePenalty" &&
                                n.SentAt >= startOfDay &&
                                n.SentAt < endOfDay)
                    .Select(n => n.ReferenceId)
                    .ToListAsync();

                var penalizedTaskIds = new HashSet<string>(persistentPenaltyLogs.Where(id => !string.IsNullOrEmpty(id))!);

                int totalTasks = dayTasks.Count;
                int onTimeCompletedTasks = 0;

                foreach (var task in dayTasks)
                {
                    bool isMissed = false;

                    if (task.MissedDeadlinePenalized)
                    {
                        isMissed = true;
                    }
                    else if (nowUtc > task.EndTime)
                    {
                        if (!task.IsCompleted || (task.CompletedAt != null && task.CompletedAt > task.EndTime))
                        {
                            isMissed = true;
                        }
                    }

                    if (isMissed)
                    {
                        penalizedTaskIds.Add(task.Id.ToString());
                    }
                    else if (task.IsCompleted)
                    {
                        onTimeCompletedTasks++;
                    }
                }

                int missedDeadlinesCount = penalizedTaskIds.Count;

                // 3. Financial Balance Factor
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .ToListAsync();
                decimal income = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
                decimal expense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);
                decimal balance = income - expense;

                // 4. Score Breakdown Calculation
                bool hasActivity = totalTasks > 0 || missedDeadlinesCount > 0 || waterSum > 0 || sleepSum > 0 || stepsSum > 0 || caloriesSum > 0 || workoutSum > 0;
                double baseline = hasActivity ? 5.0 : 0.0;
                double tasksPts = totalTasks > 0 ? ((double)onTimeCompletedTasks / totalTasks) * 15.0 : 0.0;
                double waterPts = Math.Min(30.0, (waterSum / 2000.0) * 30.0);
                double workoutPts = Math.Min(15.0, (workoutSum / 30.0) * 15.0);
                double sleepPts = Math.Min(10.0, (sleepSum / 8.0) * 10.0);
                double stepsPts = Math.Min(10.0, (stepsSum / 10000.0) * 10.0);
                double caloriesPts = caloriesSum > 0 ? 10.0 : 0.0;
                double financePts = balance > 0 ? 5.0 : (balance < 0 ? -5.0 : 0.0);

                double rawPositive = baseline + tasksPts + waterPts + workoutPts + sleepPts + stepsPts + caloriesPts + financePts;
                double positiveScore = Math.Min(100.0, Math.Max(0.0, rawPositive));

                // 5. Missed-Deadline Penalty: -2 points per missed deadline, strictly non-recoverable
                int penaltyPoints = missedDeadlinesCount * 2;
                double finalScore = Math.Max(0.0, positiveScore - penaltyPoints);

                // 6. Motivational Feedback & Notice
                string feedback;
                string? penaltyNotice = null;

                if (penaltyPoints > 0)
                {
                    penaltyNotice = $"A missed deadline resulted in a permanent -{penaltyPoints} pt penalty for today. Don't worry—focus on remaining tasks and start fresh tomorrow!";
                    feedback = "Keep pushing forward! One setback doesn't define your routine. Focus on what you can complete today.";
                }
                else if (finalScore >= 90)
                {
                    feedback = "Outstanding performance! You are maintaining peak consistency across all your daily routines.";
                }
                else if (finalScore >= 70)
                {
                    feedback = "Great momentum! You are making steady progress toward all your daily goals.";
                }
                else if (hasActivity)
                {
                    feedback = "Good start today. Complete your planned tasks and stay hydrated to elevate your score!";
                }
                else
                {
                    feedback = "A fresh day begins at zero. Plan your tasks and log activities to build your daily Life Score!";
                }

                var dto = new DailyLifeScoreDto
                {
                    Date = startOfDay.ToString("yyyy-MM-dd"),
                    FinalScore = Math.Round(finalScore, 2),
                    PositiveScore = Math.Round(positiveScore, 2),
                    PenaltyPoints = penaltyPoints,
                    MissedDeadlinesCount = missedDeadlinesCount,
                    TotalTasksToday = totalTasks,
                    CompletedTasksToday = onTimeCompletedTasks,
                    HasActivityToday = hasActivity,
                    Breakdown = new ScoreBreakdownDto
                    {
                        Baseline = Math.Round(baseline, 2),
                        Tasks = Math.Round(tasksPts, 2),
                        Hydration = Math.Round(waterPts, 2),
                        Workout = Math.Round(workoutPts, 2),
                        Sleep = Math.Round(sleepPts, 2),
                        Steps = Math.Round(stepsPts, 2),
                        Calories = Math.Round(caloriesPts, 2),
                        Finance = Math.Round(financePts, 2)
                    },
                    MotivationalFeedback = feedback,
                    PenaltyNotice = penaltyNotice
                };

                return ApiResponse<DailyLifeScoreDto>.Success(dto, "Daily life score calculated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<DailyLifeScoreDto>.Fail($"Failed to calculate daily life score: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<HistoricalLifeScoreDto>>> GetHistoricalScoresAsync(int userId, DateTime clientDate, int days = 7, int clientOffsetMinutes = 0)
        {
            try
            {
                var result = new List<HistoricalLifeScoreDto>();
                var baseDay = clientDate.Date;

                // Determine user registration date (or earliest recorded activity date)
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                var startDate = user != null ? user.CreatedAt.Date : baseDay;

                // If user has earlier activity (e.g. from tests or imported logs), honor that earliest date
                var earliestEvent = await _context.PlannerEvents
                    .Where(e => e.UserId == userId)
                    .OrderBy(e => e.EndTime)
                    .Select(e => (DateTime?)e.EndTime)
                    .FirstOrDefaultAsync();

                var earliestHealth = await _context.HealthLogs
                    .Where(h => h.UserId == userId)
                    .OrderBy(h => h.LogDate)
                    .Select(h => (DateTime?)h.LogDate)
                    .FirstOrDefaultAsync();

                if (earliestEvent.HasValue && earliestEvent.Value.Date < startDate)
                    startDate = earliestEvent.Value.Date;
                if (earliestHealth.HasValue && earliestHealth.Value.Date < startDate)
                    startDate = earliestHealth.Value.Date;

                if (startDate > baseDay)
                    startDate = baseDay;

                for (int i = 0; i < days; i++)
                {
                    var targetDay = baseDay.AddDays(-i);
                    // Do not expose or compute historical days before the user joined/had activity
                    if (targetDay < startDate)
                    {
                        break;
                    }

                    var dayScoreResult = await GetDailyLifeScoreAsync(userId, targetDay, clientOffsetMinutes);

                    if (dayScoreResult.IsSuccess && dayScoreResult.Data != null)
                    {
                        var data = dayScoreResult.Data;
                        result.Add(new HistoricalLifeScoreDto
                        {
                            Date = data.Date,
                            Score = data.FinalScore,
                            PenaltyPoints = data.PenaltyPoints,
                            MissedDeadlinesCount = data.MissedDeadlinesCount,
                            TotalTasks = data.TotalTasksToday,
                            CompletedTasks = data.CompletedTasksToday
                        });
                    }
                }

                // Return ordered chronologically
                result = result.OrderBy(r => r.Date).ToList();
                return ApiResponse<List<HistoricalLifeScoreDto>>.Success(result, "Historical life scores retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<HistoricalLifeScoreDto>>.Fail($"Failed to load historical scores: {ex.Message}");
            }
        }

        public async Task<double> GetCumulativeTotalLifeScoreAsync(int userId)
        {
            try
            {
                var plannerDates = await _context.PlannerEvents
                    .Where(e => e.UserId == userId)
                    .Select(e => e.EndTime.Date)
                    .Distinct()
                    .ToListAsync();

                var healthDates = await _context.HealthLogs
                    .Where(h => h.UserId == userId)
                    .Select(h => h.LogDate.Date)
                    .Distinct()
                    .ToListAsync();

                var penaltyDates = await _context.UserNotificationLogs
                    .Where(n => n.UserId == userId && n.NotificationType == "MissedDeadlinePenalty")
                    .Select(n => n.SentAt.Date)
                    .Distinct()
                    .ToListAsync();

                var activeDates = new HashSet<DateTime>(plannerDates);
                foreach (var d in healthDates) activeDates.Add(d);
                foreach (var d in penaltyDates) activeDates.Add(d);
                activeDates.Add(DateTime.UtcNow.Date);

                double total = 0.0;
                foreach (var date in activeDates)
                {
                    var dayScoreResult = await GetDailyLifeScoreAsync(userId, date);
                    if (dayScoreResult.IsSuccess && dayScoreResult.Data != null)
                    {
                        total += dayScoreResult.Data.FinalScore;
                    }
                }

                return Math.Round(total, 1);
            }
            catch
            {
                return 0.0;
            }
        }

        public async Task<ApiResponse<LeaderboardResponseDto>> GetLeaderboardAsync(int currentUserId, string scope, int page = 1, int pageSize = 20)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 20;

                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId && !u.IsDeleted);
                if (currentUser == null)
                {
                    return ApiResponse<LeaderboardResponseDto>.Fail("User not found.");
                }

                string normScope = (scope ?? "city").Trim().ToLowerInvariant();
                if (normScope != "city" && normScope != "state" && normScope != "country")
                {
                    normScope = "city";
                }

                // Check location eligibility for the requested scope
                bool hasLocation = false;
                string scopeValue = string.Empty;

                if (normScope == "city")
                {
                    hasLocation = !string.IsNullOrWhiteSpace(currentUser.City) && !string.IsNullOrWhiteSpace(currentUser.Country);
                    scopeValue = currentUser.City?.Trim() ?? string.Empty;
                }
                else if (normScope == "state")
                {
                    hasLocation = !string.IsNullOrWhiteSpace(currentUser.State) && !string.IsNullOrWhiteSpace(currentUser.Country);
                    scopeValue = currentUser.State?.Trim() ?? string.Empty;
                }
                else if (normScope == "country")
                {
                    hasLocation = !string.IsNullOrWhiteSpace(currentUser.Country);
                    scopeValue = currentUser.Country?.Trim() ?? string.Empty;
                }

                // If user doesn't have location completed, return hasLocation = false
                if (!hasLocation)
                {
                    var emptyResponse = new LeaderboardResponseDto
                    {
                        Scope = normScope,
                        ScopeValue = scopeValue,
                        HasLocation = false,
                        CurrentUserRank = 0,
                        CurrentUserTotalScore = await GetCumulativeTotalLifeScoreAsync(currentUserId),
                        TopRankings = new List<LeaderboardEntryDto>(),
                        TotalParticipants = 0,
                        Page = page,
                        PageSize = pageSize,
                        TotalPages = 1
                    };
                    return ApiResponse<LeaderboardResponseDto>.Success(emptyResponse, "Location required to participate in competition.");
                }

                // Query all active, non-deleted users matching the normalized location scope
                var usersQuery = _context.Users
                    .Where(u => !u.IsDeleted && u.Status == UserStatus.Active);

                List<Models.User> eligibleUsers;

                if (normScope == "city")
                {
                    string targetCity = currentUser.City!.Trim().ToUpperInvariant();
                    eligibleUsers = await usersQuery
                        .Where(u => u.City != null && u.City.Trim().ToUpper() == targetCity)
                        .ToListAsync();

                    if (!string.IsNullOrWhiteSpace(currentUser.Country))
                    {
                        string targetCountry = currentUser.Country.Trim().ToUpperInvariant();
                        eligibleUsers = eligibleUsers
                            .Where(u => u.Country != null && u.Country.Trim().ToUpper() == targetCountry)
                            .ToList();
                    }
                    if (!string.IsNullOrWhiteSpace(currentUser.State))
                    {
                        string targetState = currentUser.State.Trim().ToUpperInvariant();
                        eligibleUsers = eligibleUsers
                            .Where(u => u.State != null && u.State.Trim().ToUpper() == targetState)
                            .ToList();
                    }
                }
                else if (normScope == "state")
                {
                    string targetState = currentUser.State!.Trim().ToUpperInvariant();
                    eligibleUsers = await usersQuery
                        .Where(u => u.State != null && u.State.Trim().ToUpper() == targetState)
                        .ToListAsync();

                    if (!string.IsNullOrWhiteSpace(currentUser.Country))
                    {
                        string targetCountry = currentUser.Country.Trim().ToUpperInvariant();
                        eligibleUsers = eligibleUsers
                            .Where(u => u.Country != null && u.Country.Trim().ToUpper() == targetCountry)
                            .ToList();
                    }
                }
                else // country
                {
                    string targetCountry = currentUser.Country!.Trim().ToUpperInvariant();
                    eligibleUsers = await usersQuery
                        .Where(u => u.Country != null && u.Country.Trim().ToUpper() == targetCountry)
                        .ToListAsync();
                }

                if (!eligibleUsers.Any(u => u.Id == currentUserId))
                {
                    eligibleUsers.Add(currentUser);
                }

                // 1. Authoritative personal score for the requesting user
                double currentUserScore = await GetCumulativeTotalLifeScoreAsync(currentUserId);

                // 2. Calculate cumulative score sequentially for all eligible users to avoid
                // concurrent operations on the scoped DbContext instance.
                var userScores = new List<(Models.User User, double TotalScore)>();
                foreach (var u in eligibleUsers)
                {
                    double score = (u.Id == currentUserId)
                        ? currentUserScore
                        : await GetCumulativeTotalLifeScoreAsync(u.Id);

                    userScores.Add((u, score));
                }

                // Sort: TotalScore descending, then by user Id ascending (deterministic tie-breaking)
                var sorted = userScores
                    .OrderByDescending(x => x.TotalScore)
                    .ThenBy(x => x.User.Id)
                    .ToList();

                var rankedEntries = new List<LeaderboardEntryDto>();
                int currentRank = 1;
                for (int i = 0; i < sorted.Count; i++)
                {
                    if (i > 0 && sorted[i].TotalScore < sorted[i - 1].TotalScore)
                    {
                        currentRank = i + 1;
                    }

                    rankedEntries.Add(new LeaderboardEntryDto
                    {
                        Rank = currentRank,
                        DisplayName = sorted[i].User.FullName,
                        TotalLifeScore = sorted[i].TotalScore,
                        IsCurrentUser = sorted[i].User.Id == currentUserId,
                        City = sorted[i].User.City,
                        State = sorted[i].User.State,
                        Country = sorted[i].User.Country
                    });
                }

                var currentUserEntry = rankedEntries.FirstOrDefault(r => r.IsCurrentUser);
                int userRank = currentUserEntry?.Rank ?? 1;

                int totalCount = rankedEntries.Count;
                int totalPages = Math.Max(1, (int)Math.Ceiling((double)totalCount / pageSize));
                var pagedRankings = rankedEntries
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                var response = new LeaderboardResponseDto
                {
                    Scope = normScope,
                    ScopeValue = scopeValue,
                    HasLocation = true,
                    CurrentUserRank = userRank,
                    CurrentUserTotalScore = currentUserScore,
                    TopRankings = pagedRankings,
                    TotalParticipants = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = totalPages
                };

                return ApiResponse<LeaderboardResponseDto>.Success(response, "Leaderboard retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<LeaderboardResponseDto>.Fail($"Failed to load competition leaderboard: {ex.Message}");
            }
        }
    }
}
