using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Planner;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using LifeSyncAI.Core.DTO.Output.LifeScore;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class RecordingMockEmailService : LifeSyncAI.Core.Contracts.Interfaces.Services.IEmailService
    {
        public List<(string toEmail, string subject, string content)> SentEmails { get; } = new();

        public Task SendEmailAsync(string toEmail, string subject, string htmlContent)
        {
            SentEmails.Add((toEmail, subject, htmlContent));
            return Task.CompletedTask;
        }

        public Task SendReportNotificationAsync(string toEmail, string userName, string reportType, string period, byte[] pdfBytes)
        {
            SentEmails.Add((toEmail, $"Report: {reportType}", string.Empty));
            return Task.CompletedTask;
        }
    }

    public class PlannerAndLifeScoreTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly PlannerService _plannerService;
        private readonly LifeScoreService _lifeScoreService;
        private readonly RecordingMockEmailService _emailService;

        public PlannerAndLifeScoreTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            _plannerService = new PlannerService(_context);
            _lifeScoreService = new LifeScoreService(_context);
            _emailService = new RecordingMockEmailService();
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private async Task<User> CreateTestUserAsync(string email = "user@example.com")
        {
            var user = new User
            {
                Email = email,
                PasswordHash = "hashed_pw",
                FullName = "Test User",
                CreatedAt = DateTime.UtcNow,
                Status = UserStatus.Active
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        [Fact]
        public async Task Planner_CreateEvent_EndTimeLaterThanStartTime_Succeeds()
        {
            var user = await CreateTestUserAsync();
            var startTime = DateTime.UtcNow.AddHours(1);
            var endTime = startTime.AddHours(2);

            var dto = new CreatePlannerEventDto
            {
                Title = "Team Standup",
                Description = "Daily coordination",
                StartTime = startTime,
                EndTime = endTime
            };

            var result = await _plannerService.CreateEventAsync(dto, user.Id, DateTime.UtcNow);

            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal("Team Standup", result.Data.Title);
            Assert.Equal(startTime, result.Data.StartTime);
            Assert.Equal(endTime, result.Data.EndTime);
            Assert.False(result.Data.IsCompleted);
        }

        [Fact]
        public async Task Planner_CreateEvent_EndTimeEqualToStartTime_ReturnsValidationError()
        {
            var user = await CreateTestUserAsync();
            var time = DateTime.UtcNow.AddHours(1);

            var dto = new CreatePlannerEventDto
            {
                Title = "Invalid Event",
                StartTime = time,
                EndTime = time
            };

            var result = await _plannerService.CreateEventAsync(dto, user.Id, DateTime.UtcNow);

            Assert.False(result.IsSuccess);
            Assert.Equal("The end time must be later than the start time. Choose a valid deadline for your task.", result.Message);
        }

        [Fact]
        public async Task Planner_CreateEvent_EndTimeEarlierThanStartTime_ReturnsValidationError()
        {
            var user = await CreateTestUserAsync();
            var startTime = DateTime.UtcNow.AddHours(2);
            var endTime = startTime.AddHours(-1);

            var dto = new CreatePlannerEventDto
            {
                Title = "Backwards Event",
                StartTime = startTime,
                EndTime = endTime
            };

            var result = await _plannerService.CreateEventAsync(dto, user.Id, DateTime.UtcNow);

            Assert.False(result.IsSuccess);
            Assert.Equal("The end time must be later than the start time. Choose a valid deadline for your task.", result.Message);
        }

        [Fact]
        public async Task Planner_UpdateEvent_InvalidEndTime_ReturnsValidationError()
        {
            var user = await CreateTestUserAsync();
            var startTime = DateTime.UtcNow.AddHours(1);
            var endTime = startTime.AddHours(2);

            var created = await _plannerService.CreateEventAsync(new CreatePlannerEventDto
            {
                Title = "Event to Edit",
                StartTime = startTime,
                EndTime = endTime
            }, user.Id, DateTime.UtcNow);

            var updateDto = new UpdatePlannerEventDto
            {
                Title = "Edited Event",
                StartTime = startTime,
                EndTime = startTime // invalid equal end time
            };

            var result = await _plannerService.UpdateEventAsync(created.Data.Id, updateDto, user.Id);

            Assert.False(result.IsSuccess);
            Assert.Equal("The end time must be later than the start time. Choose a valid deadline for your task.", result.Message);
        }

        [Fact]
        public async Task Planner_OnTimeCompletion_DoesNotApplyPenalty()
        {
            var user = await CreateTestUserAsync();
            var startTime = DateTime.UtcNow.AddHours(-2);
            var endTime = DateTime.UtcNow.AddHours(1); // Future deadline

            var created = await _plannerService.CreateEventAsync(new CreatePlannerEventDto
            {
                Title = "On-Time Task",
                StartTime = startTime,
                EndTime = endTime
            }, user.Id, DateTime.UtcNow);

            var toggled = await _plannerService.ToggleEventAsync(created.Data.Id, true, user.Id);
            Assert.True(toggled.IsSuccess);

            var evt = await _context.PlannerEvents.FindAsync(created.Data.Id);
            Assert.NotNull(evt);
            Assert.True(evt.IsCompleted);
            Assert.False(evt.MissedDeadlinePenalized);
            Assert.NotNull(evt.CompletedAt);
            Assert.True(evt.CompletedAt <= endTime);
        }

        [Fact]
        public async Task Planner_LateCompletion_AppliesAndPreservesPenalty()
        {
            var user = await CreateTestUserAsync();
            // Event whose deadline was 1 hour ago
            var startTime = DateTime.UtcNow.AddHours(-3);
            var endTime = DateTime.UtcNow.AddHours(-1);

            var plannerEvent = new PlannerEvent
            {
                UserId = user.Id,
                Title = "Overdue Task",
                StartTime = startTime,
                EndTime = endTime,
                IsCompleted = false,
                MissedDeadlinePenalized = true,
                PenaltyAppliedAt = endTime
            };
            _context.PlannerEvents.Add(plannerEvent);
            await _context.SaveChangesAsync();

            // User completes it late now
            var toggled = await _plannerService.ToggleEventAsync(plannerEvent.Id, true, user.Id);
            Assert.True(toggled.IsSuccess);

            var updated = await _context.PlannerEvents.FindAsync(plannerEvent.Id);
            Assert.NotNull(updated);
            Assert.True(updated.IsCompleted);
            // Penalty must remain permanent!
            Assert.True(updated.MissedDeadlinePenalized);
        }

        [Fact]
        public async Task LifeScore_DailyResetToZero_NewDayStartsAtZero()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            // Add activity yesterday
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddDays(-1),
                LogType = "Water",
                LogValue = 2500
            });
            await _context.SaveChangesAsync();

            // Today should start at 0 if no activities or penalties exist today
            var todayResponse = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.True(todayResponse.IsSuccess);
            Assert.Equal(0, todayResponse.Data.FinalScore);
            Assert.Equal(0, todayResponse.Data.MissedDeadlinesCount);
            Assert.Equal(0, todayResponse.Data.PenaltyPoints);

            // Tomorrow should also start at 0
            var tomorrowResponse = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, tomorrow);
            Assert.True(tomorrowResponse.IsSuccess);
            Assert.Equal(0, tomorrowResponse.Data.FinalScore);
        }

        [Fact]
        public async Task LifeScore_MissedDeadlinesDeductPermanentTwoPointsPerTask()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;

            // Add a completed on-time task for today
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "On-time Morning Task",
                StartTime = today.AddHours(8),
                EndTime = today.AddHours(9),
                IsCompleted = true,
                CompletedAt = today.AddHours(8).AddMinutes(30),
                MissedDeadlinePenalized = false
            });

            // Add 1 missed deadline today
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Overdue Afternoon Task",
                StartTime = today.AddHours(13),
                EndTime = today.AddHours(14),
                IsCompleted = false,
                MissedDeadlinePenalized = true,
                PenaltyAppliedAt = today.AddHours(14)
            });

            await _context.SaveChangesAsync();

            var response = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.True(response.IsSuccess);
            var scoreDto = response.Data;

            // Positive score: Baseline 5.0 + Tasks 7.5 = 12.5
            // Penalty: 1 missed deadline * 2 = 2
            // Final score: 12.5 - 2 = 10.5
            Assert.Equal(12.5, scoreDto.PositiveScore);
            Assert.Equal(2, scoreDto.PenaltyPoints);
            Assert.Equal(1, scoreDto.MissedDeadlinesCount);
            Assert.Equal(10.5, scoreDto.FinalScore);
        }

        [Fact]
        public async Task LifeScore_Max100PointsReflectsPenalties_CapsPositiveBeforePenalty()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;

            // Tasks: 2 on-time tasks -> tasksPts = 15.0
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Task 1",
                StartTime = today.AddHours(8),
                EndTime = today.AddHours(9),
                IsCompleted = true,
                CompletedAt = today.AddHours(8).AddMinutes(30),
                MissedDeadlinePenalized = false
            });
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Task 2",
                StartTime = today.AddHours(9),
                EndTime = today.AddHours(10),
                IsCompleted = true,
                CompletedAt = today.AddHours(9).AddMinutes(30),
                MissedDeadlinePenalized = false
            });

            // Water: 2500ml -> waterPts = 30.0
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddHours(10),
                LogType = "Water",
                LogValue = 2500
            });
            // Workout: 60 mins -> workoutPts = 15.0
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddHours(11),
                LogType = "Workout",
                LogValue = 60
            });
            // Sleep: 8 hours -> sleepPts = 10.0
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddHours(7),
                LogType = "Sleep",
                LogValue = 8
            });
            // Steps: 10000 steps -> stepsPts = 10.0
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddHours(12),
                LogType = "Steps",
                LogValue = 10000
            });
            // Calories: 500 kcal -> caloriesPts = 10.0
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogDate = today.AddHours(13),
                LogType = "Calories",
                LogValue = 500
            });
            // Financial: Income positive balance -> financePts = 5.0
            _context.Transactions.Add(new Transaction
            {
                UserId = user.Id,
                Amount = 1500,
                Type = "Income",
                Category = "Salary",
                Date = today
            });

            // Baseline (hasActivity) = 5.0
            // Sum = 5 + 15 + 30 + 15 + 10 + 10 + 10 + 5 = 100.0 (and if more, capped at 100.0)

            // Plus 1 missed deadline task (-2 penalty)
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "One Missed Deadline Task",
                StartTime = today.AddHours(5),
                EndTime = today.AddHours(6),
                IsCompleted = false,
                MissedDeadlinePenalized = true,
                PenaltyAppliedAt = today.AddHours(6)
            });

            await _context.SaveChangesAsync();

            var response = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.True(response.IsSuccess);
            var scoreDto = response.Data;

            // Positive score is capped at 100.
            // Penalty is 2.
            // Final score must be 98, not 100!
            Assert.True(scoreDto.PositiveScore >= 95.0);
            Assert.Equal(2, scoreDto.PenaltyPoints);
            Assert.Equal(1, scoreDto.MissedDeadlinesCount);
            Assert.Equal(scoreDto.PositiveScore - 2, scoreDto.FinalScore);
        }

        [Fact]
        public async Task LifeScore_HistoricalScoresRemainIntactAndDistinguished()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;
            var yesterday = today.AddDays(-1);

            // Yesterday: 1 completed task (+7.5) + baseline (5.0) = 12.5, and 1 missed (-2) = 10.5
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Yesterday Task",
                StartTime = yesterday.AddHours(10),
                EndTime = yesterday.AddHours(11),
                IsCompleted = true,
                CompletedAt = yesterday.AddHours(10).AddMinutes(30)
            });
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Yesterday Missed",
                StartTime = yesterday.AddHours(14),
                EndTime = yesterday.AddHours(15),
                IsCompleted = false,
                MissedDeadlinePenalized = true,
                PenaltyAppliedAt = yesterday.AddHours(15)
            });

            // Today: 2 completed tasks (+15) + baseline (5.0) = 20, 0 missed = 20
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Today Task 1",
                StartTime = today.AddHours(9),
                EndTime = today.AddHours(10),
                IsCompleted = true,
                CompletedAt = today.AddHours(9).AddMinutes(30)
            });
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Today Task 2",
                StartTime = today.AddHours(11),
                EndTime = today.AddHours(12),
                IsCompleted = true,
                CompletedAt = today.AddHours(11).AddMinutes(30)
            });

            await _context.SaveChangesAsync();

            var response = await _lifeScoreService.GetHistoricalScoresAsync(user.Id, today, 7);
            Assert.True(response.IsSuccess);
            var history = response.Data;

            var yesterdayResult = history.FirstOrDefault(s => s.Date == yesterday.ToString("yyyy-MM-dd"));
            var todayResult = history.FirstOrDefault(s => s.Date == today.ToString("yyyy-MM-dd"));

            Assert.NotNull(yesterdayResult);
            Assert.NotNull(todayResult);

            Assert.Equal(10.5, yesterdayResult.Score);
            Assert.Equal(2, yesterdayResult.PenaltyPoints);
            Assert.Equal(1, yesterdayResult.MissedDeadlinesCount);

            Assert.Equal(20, todayResult.Score);
            Assert.Equal(0, todayResult.PenaltyPoints);
            Assert.Equal(0, todayResult.MissedDeadlinesCount);
        }

        [Fact]
        public async Task NotificationLog_DeduplicatesAutomationsSafely()
        {
            var user = await CreateTestUserAsync();

            var log1 = new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "PlannerDeadlineReminder1Hour",
                ReferenceId = "event_101",
                SentAt = DateTime.UtcNow,
                IsSuccess = true
            };
            _context.UserNotificationLogs.Add(log1);
            await _context.SaveChangesAsync();

            // Check existence
            var exists = await _context.UserNotificationLogs.AnyAsync(l =>
                l.UserId == user.Id &&
                l.NotificationType == "PlannerDeadlineReminder1Hour" &&
                l.ReferenceId == "event_101" &&
                l.IsSuccess);

            Assert.True(exists);
        }

        [Fact]
        public async Task NotificationLog_FailedDeliveryAttemptDoesNotSuppressRetry()
        {
            var user = await CreateTestUserAsync();

            // Record a failed attempt
            var failedLog = new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "PlannerReminder",
                ReferenceId = "task_999",
                SentAt = DateTime.UtcNow.AddMinutes(-20),
                IsSuccess = false,
                Details = "SMTP timeout"
            };
            _context.UserNotificationLogs.Add(failedLog);
            await _context.SaveChangesAsync();

            // Verification check: Only successful logs should suppress delivery
            bool alreadyDelivered = await _context.UserNotificationLogs.AnyAsync(l =>
                l.UserId == user.Id &&
                l.NotificationType == "PlannerReminder" &&
                l.ReferenceId == "task_999" &&
                l.IsSuccess);

            Assert.False(alreadyDelivered);
        }

        [Fact]
        public void InactivityMilestone_HigherRankSupersedesLowerMilestone()
        {
            var milestoneRank = new Dictionary<string, int>
            {
                { "Inactivity_7d", 1 },
                { "Inactivity_30d", 2 },
                { "Inactivity_3m", 3 },
                { "Inactivity_6m", 4 },
                { "Inactivity_1y", 5 }
            };

            var existingSuccessfulMilestones = new List<string> { "Inactivity_30d" };

            // Checking 7d milestone: current rank is 1. Existing has rank 2 >= 1 -> Superseded!
            int rank7d = milestoneRank["Inactivity_7d"];
            bool is7dSuperseded = existingSuccessfulMilestones.Any(l => milestoneRank.TryGetValue(l, out var r) && r >= rank7d);
            Assert.True(is7dSuperseded);

            // Checking 3m milestone: current rank is 3. Existing has rank 2 < 3 -> Not superseded!
            int rank3m = milestoneRank["Inactivity_3m"];
            bool is3mSuperseded = existingSuccessfulMilestones.Any(l => milestoneRank.TryGetValue(l, out var r) && r >= rank3m);
            Assert.False(is3mSuperseded);
        }

        [Fact]
        public async Task LifeScore_WithTimezoneOffset_AggregatesLocalWindowCorrectly()
        {
            var user = await CreateTestUserAsync();
            var localDate = new DateTime(2026, 10, 25);
            // IST offset: -330 mins (Local midnight = 2026-10-24 18:30:00 UTC)
            int istOffset = -330;

            // Log created at 2026-10-24 19:30:00 UTC (which is 2026-10-25 01:00 AM IST)
            var utcLogTime = new DateTime(2026, 10, 24, 19, 30, 0, DateTimeKind.Utc);
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogType = "Water",
                LogValue = 2000,
                LogDate = utcLogTime
            });
            await _context.SaveChangesAsync();

            // When queried with offset -330 for local date 2026-10-25, it must be included!
            var res = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, localDate, istOffset);
            Assert.True(res.IsSuccess);
            Assert.Equal(30.0, res.Data.Breakdown.Hydration);
            Assert.True(res.Data.FinalScore >= 35.0); // Baseline 5 + Hydration 30
        }

        [Fact]
        public async Task LifeScore_OverduePenalty_RemainsIdempotentAcrossMultipleQueries()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;

            // Add overdue task
            _context.PlannerEvents.Add(new PlannerEvent
            {
                UserId = user.Id,
                Title = "Overdue Task",
                StartTime = today.AddHours(2),
                EndTime = today.AddHours(3),
                IsCompleted = false,
                MissedDeadlinePenalized = true
            });
            await _context.SaveChangesAsync();

            // First query
            var res1 = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.True(res1.IsSuccess);
            Assert.Equal(1, res1.Data.MissedDeadlinesCount);
            Assert.Equal(2, res1.Data.PenaltyPoints);

            // Second query (must be strictly idempotent)
            var res2 = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.True(res2.IsSuccess);
            Assert.Equal(1, res2.Data.MissedDeadlinesCount);
            Assert.Equal(2, res2.Data.PenaltyPoints);
            Assert.Equal(res1.Data.FinalScore, res2.Data.FinalScore);
        }

        [Fact]
        public void DailyLifeScoreDto_ExposesBothFinalScoreAndScore()
        {
            var dto = new DailyLifeScoreDto
            {
                FinalScore = 84.5
            };
            Assert.Equal(84.5, dto.FinalScore);
            Assert.Equal(84.5, dto.Score);
        }

        [Fact]
        public async Task LifeScore_HealthLogDeletion_ReversesScoreContribution()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;

            var log = new HealthLog
            {
                UserId = user.Id,
                LogType = "Water",
                LogValue = 2000,
                LogDate = today.AddHours(2)
            };
            _context.HealthLogs.Add(log);
            await _context.SaveChangesAsync();

            var scoreWithLog = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.Equal(30.0, scoreWithLog.Data.Breakdown.Hydration);

            // Remove log
            _context.HealthLogs.Remove(log);
            await _context.SaveChangesAsync();

            var scoreAfterDelete = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.Equal(0.0, scoreAfterDelete.Data.Breakdown.Hydration);
        }

        [Fact]
        public async Task LifeScore_FinancialTransactionDeletion_ReversesScoreContribution()
        {
            var user = await CreateTestUserAsync();
            var today = DateTime.UtcNow.Date;

            // Health baseline activity
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = user.Id,
                LogType = "Water",
                LogValue = 1000,
                LogDate = today.AddHours(1)
            });

            var tx = new Transaction
            {
                UserId = user.Id,
                Type = "Income",
                Amount = 5000,
                Date = today,
                Category = "Salary"
            };
            _context.Transactions.Add(tx);
            await _context.SaveChangesAsync();

            var scoreWithIncome = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.Equal(5.0, scoreWithIncome.Data.Breakdown.Finance);

            // Remove transaction
            _context.Transactions.Remove(tx);
            await _context.SaveChangesAsync();

            var scoreWithoutIncome = await _lifeScoreService.GetDailyLifeScoreAsync(user.Id, today);
            Assert.Equal(0.0, scoreWithoutIncome.Data.Breakdown.Finance);
        }
    }
}
