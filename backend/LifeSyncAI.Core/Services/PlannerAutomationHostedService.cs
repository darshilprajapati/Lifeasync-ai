using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Background automation hosted service managing:
    /// 1. Automatic email reminders approximately 1 hour before task deadlines.
    /// 2. Automated detection and persistent recording of missed-deadline penalties (-2 pts).
    /// 3. Inactivity re-engagement email automation (7d, 30d, 3m, 6m, 1y).
    /// Runs independently of browser sessions, prevents duplicate notifications, and handles retries safely.
    /// </summary>
    public class PlannerAutomationHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PlannerAutomationHostedService> _logger;
        private readonly SemaphoreSlim _executionGate = new SemaphoreSlim(1, 1);
        private DateTime _lastInactivityCheckUtc = DateTime.MinValue;

        private static readonly string[] MotivationalReminders = new[]
        {
            "You're just one hour away from your planned finish line. Give this task your focus and complete it before your target time.",
            "Your future self will thank you for finishing on schedule. You've planned the time—now make it count!",
            "A small final push can make a big difference. Let's complete this task before your deadline.",
            "You've already taken the first step by planning this task. Turn that plan into progress before time runs out.",
            "Stay locked in! Finishing tasks on time protects your daily Life Score and builds unstoppable momentum.",
            "Great achievements are built on small, timely wins. Knock this task out before the hour is up!"
        };

        public PlannerAutomationHostedService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<PlannerAutomationHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[PlannerAutomation] Hosted background service initialized.");

            // Initial short warm-up delay
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAutomationCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PlannerAutomation] Error occurred during automation cycle execution.");
                }

                try
                {
                    // Evaluate tasks every 60 seconds
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("[PlannerAutomation] Hosted background service terminated.");
        }

        public async Task ProcessAutomationCycleAsync(CancellationToken cancellationToken)
        {
            if (!await _executionGate.WaitAsync(0, cancellationToken))
            {
                _logger.LogDebug("[PlannerAutomation] Previous cycle still in flight; skipping overlapping cycle.");
                return;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                var nowUtc = DateTime.UtcNow;

                // 1. Process User-Scheduled Custom Reminders
                await ProcessUserScheduledRemindersAsync(context, emailService, nowUtc, cancellationToken);

                // 2. Process One-Hour Deadline Reminders
                await ProcessDeadlineRemindersAsync(context, emailService, nowUtc, cancellationToken);

                // 2. Process Overdue Missed-Deadline Penalty Recording
                await ProcessMissedDeadlinesAsync(context, nowUtc, cancellationToken);

                // 3. Process Inactivity Re-Engagement Milestones (Every 6 hours)
                if ((nowUtc - _lastInactivityCheckUtc).TotalHours >= 6)
                {
                    await ProcessInactivityMilestonesAsync(context, emailService, nowUtc, cancellationToken);
                    _lastInactivityCheckUtc = nowUtc;
                }
            }
            finally
            {
                _executionGate.Release();
            }
        }

        private async Task ProcessUserScheduledRemindersAsync(
            ApplicationDbContext context,
            IEmailService emailService,
            DateTime nowUtc,
            CancellationToken cancellationToken)
        {
            var dueTasks = await context.PlannerEvents
                .Where(e => !e.IsCompleted &&
                            !e.ReminderSent &&
                            e.ReminderTime != null &&
                            e.ReminderTime <= nowUtc)
                .ToListAsync(cancellationToken);

            if (!dueTasks.Any()) return;

            var userIds = dueTasks.Select(t => t.UserId).Distinct().ToList();
            var users = await context.Users
                .Where(u => userIds.Contains(u.Id) && u.Status == UserStatus.Active)
                .ToDictionaryAsync(u => u.Id, cancellationToken);

            string frontendBaseUrl = _configuration["FrontendUrl"] ?? "https://lifesync-ai.vercel.app";

            foreach (var task in dueTasks)
            {
                if (cancellationToken.IsCancellationRequested) break;
                if (!users.TryGetValue(task.UserId, out var user) || string.IsNullOrWhiteSpace(user.Email)) continue;

                bool alreadyDelivered = await context.UserNotificationLogs.AnyAsync(
                    n => n.UserId == user.Id &&
                         n.NotificationType == "ScheduledReminder" &&
                         n.ReferenceId == task.Id.ToString() &&
                         n.IsSuccess,
                    cancellationToken);

                if (alreadyDelivered)
                {
                    task.ReminderSent = true;
                    task.ReminderSentAt = nowUtc;
                    continue;
                }

                try
                {
                    string subject = $"Task Reminder: {task.Title}";
                    string emailBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;"">
  <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; border-left: 6px solid #3b82f6; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"">
    <h2 style=""color: #1e293b; margin-top: 0;"">Scheduled Task Reminder</h2>
    <p style=""color: #475569; font-size: 15px;"">Hello {user.FullName}, this is your scheduled reminder for your planned task:</p>
    <div style=""background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0;"">
      <h3 style=""margin: 0 0 8px 0; color: #0f172a;"">{task.Title}</h3>
      {(string.IsNullOrWhiteSpace(task.Description) ? "" : $"<p style=\"color: #475569; margin: 0 0 10px 0;\">{task.Description}</p>")}
      <p style=""color: #64748b; font-size: 13px; margin: 0;"">
        <strong>Scheduled Time:</strong> {task.StartTime:yyyy-MM-dd hh:mm tt} - {task.EndTime:hh:mm tt}
      </p>
    </div>
    <div style=""margin-top: 24px;"">
      <a href=""{frontendBaseUrl}/planner"" style=""display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;"">Open Planner</a>
    </div>
    <p style=""color: #94a3b8; font-size: 12px; margin-top: 24px;"">LifeSync AI Personal Intelligence System</p>
  </div>
</body>
</html>";

                    await emailService.SendEmailAsync(user.Email, subject, emailBody);

                    task.ReminderSent = true;
                    task.ReminderSentAt = nowUtc;

                    context.UserNotificationLogs.Add(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = "ScheduledReminder",
                        ReferenceId = task.Id.ToString(),
                        SentAt = nowUtc,
                        RecipientEmail = user.Email,
                        IsSuccess = true,
                        Details = "User-scheduled task reminder delivered successfully via Brevo."
                    });

                    _logger.LogInformation("[PlannerAutomation] Scheduled reminder dispatched for task '{Title}' to {Email}", task.Title, user.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PlannerAutomation] Failed to send scheduled reminder for task '{Title}' to {Email}", task.Title, user.Email);
                    context.UserNotificationLogs.Add(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = "ScheduledReminder",
                        ReferenceId = task.Id.ToString(),
                        SentAt = nowUtc,
                        RecipientEmail = user.Email,
                        IsSuccess = false,
                        Details = $"Dispatch failed: {ex.Message}"
                    });
                }
            }

            await context.SaveChangesAsync(cancellationToken);
        }

        private async Task ProcessDeadlineRemindersAsync(
            ApplicationDbContext context,
            IEmailService emailService,
            DateTime nowUtc,
            CancellationToken cancellationToken)
        {
            var horizonUtc = nowUtc.AddMinutes(65);

            // Fetch incomplete tasks approaching deadline in approximately 1 hour (between now and +65 min)
            var candidateTasks = await context.PlannerEvents
                .Where(e => !e.IsCompleted &&
                            !e.ReminderSent &&
                            e.EndTime > nowUtc &&
                            e.EndTime <= horizonUtc)
                .ToListAsync(cancellationToken);

            if (!candidateTasks.Any()) return;

            var userIds = candidateTasks.Select(t => t.UserId).Distinct().ToList();
            var users = await context.Users
                .Where(u => userIds.Contains(u.Id) && u.Status == UserStatus.Active)
                .ToDictionaryAsync(u => u.Id, cancellationToken);

            string frontendBaseUrl = _configuration["FrontendUrl"] ?? "https://lifesync-ai.vercel.app";

            foreach (var task in candidateTasks)
            {
                if (cancellationToken.IsCancellationRequested) break;
                if (!users.TryGetValue(task.UserId, out var user) || string.IsNullOrWhiteSpace(user.Email)) continue;

                // Sensible policy: Do not send reminder if task was created/rescheduled < 50 min before deadline
                if (task.CreatedAt > task.EndTime.AddMinutes(-50))
                {
                    // Created on short notice; mark reminder sent to avoid spamming
                    task.ReminderSent = true;
                    task.ReminderSentAt = nowUtc;
                    continue;
                }

                // Check if already successfully delivered in UserNotificationLog
                bool alreadyDelivered = await context.UserNotificationLogs.AnyAsync(
                    n => n.UserId == user.Id &&
                         n.NotificationType == "PlannerReminder" &&
                         n.ReferenceId == task.Id.ToString() &&
                         n.IsSuccess,
                    cancellationToken);

                if (alreadyDelivered)
                {
                    task.ReminderSent = true;
                    task.ReminderSentAt = nowUtc;
                    continue;
                }

                // Check recent failed attempts to prevent tight-loop hammering, while allowing controlled retries
                var recentFailure = await context.UserNotificationLogs
                    .Where(n => n.UserId == user.Id &&
                                n.NotificationType == "PlannerReminder" &&
                                n.ReferenceId == task.Id.ToString() &&
                                !n.IsSuccess)
                    .OrderByDescending(n => n.SentAt)
                    .FirstOrDefaultAsync(cancellationToken);

                if (recentFailure != null)
                {
                    // If failed less than 15 minutes ago, back off for this cycle
                    if ((nowUtc - recentFailure.SentAt).TotalMinutes < 15)
                    {
                        continue;
                    }

                    // If failed 3 or more times, cease retries to protect SMTP resources
                    int failureCount = await context.UserNotificationLogs
                        .CountAsync(n => n.UserId == user.Id &&
                                         n.NotificationType == "PlannerReminder" &&
                                         n.ReferenceId == task.Id.ToString() &&
                                         !n.IsSuccess, cancellationToken);
                    if (failureCount >= 3)
                    {
                        task.ReminderSent = true;
                        continue;
                    }
                }

                int templateIndex = Math.Abs(task.Id) % MotivationalReminders.Length;
                string motivationalMsg = MotivationalReminders[templateIndex];
                string plannerUrl = $"{frontendBaseUrl.TrimEnd('/')}/planner";

                string subject = $"Reminder: \"{task.Title}\" is due in approximately 1 hour — LifeSync AI";
                string htmlBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; padding: 24px; margin: 0;"">
  <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border-left: 6px solid #3b82f6; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);"">
    <h2 style=""color: #1e3a8a; margin-top: 0; font-size: 20px;"">Task Deadline Approaching in ~1 Hour</h2>
    <p style=""color: #4b5563; font-size: 15px; line-height: 1.5;"">
      Hello {(!string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : "there")},
    </p>
    <div style=""background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #bbf7d0;"">
      <p style=""color: #166534; font-size: 14px; font-weight: 600; margin: 0;"">
        💡 {motivationalMsg}
      </p>
    </div>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;"">
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold; width: 160px;"">Task Title:</td><td style=""color: #111827; font-weight: 600;"">{task.Title}</td></tr>
      {(!string.IsNullOrWhiteSpace(task.Description) ? $@"<tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Description:</td><td style=""color: #374151;"">{task.Description}</td></tr>" : "")}
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Start Time:</td><td style=""color: #111827;"">{task.StartTime:yyyy-MM-dd hh:mm tt}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Deadline (End Time):</td><td style=""color: #dc2626; font-weight: 600;"">{task.EndTime:yyyy-MM-dd hh:mm tt}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Time Remaining:</td><td style=""color: #2563eb; font-weight: 600;"">~1 hour</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Current Status:</td><td style=""color: #d97706; font-weight: 600;"">Incomplete / In Progress</td></tr>
    </table>
    <div style=""margin-top: 24px; text-align: center;"">
      <a href=""{plannerUrl}"" style=""background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;"">Open Your Planner</a>
    </div>
    <p style=""color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center;"">
      Tip: Completing your tasks before their deadline protects your daily Life Score from a -2 point penalty.
    </p>
  </div>
</body>
</html>";

                try
                {
                    await emailService.SendEmailAsync(user.Email, subject, htmlBody);
                    task.ReminderSent = true;
                    task.ReminderSentAt = nowUtc;

                    await context.UserNotificationLogs.AddAsync(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = "PlannerReminder",
                        ReferenceId = task.Id.ToString(),
                        RecipientEmail = user.Email,
                        SentAt = nowUtc,
                        IsSuccess = true,
                        Details = $"Reminder sent for task #{task.Id} ('{task.Title}')"
                    }, cancellationToken);

                    await context.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation("[PlannerAutomation] Sent 1-hour deadline reminder for task #{TaskId} to {Email}", task.Id, user.Email);
                }
                catch (DbUpdateException dbEx)
                {
                    // Concurrency safeguard: Another worker process already logged successful delivery
                    _logger.LogWarning(dbEx, "[PlannerAutomation] Duplicate reminder prevented by database constraint for task #{TaskId}", task.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PlannerAutomation] Failed to send reminder email for task #{TaskId} to {Email}", task.Id, user.Email);
                    await context.UserNotificationLogs.AddAsync(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = "PlannerReminder",
                        ReferenceId = task.Id.ToString(),
                        RecipientEmail = user.Email,
                        SentAt = nowUtc,
                        IsSuccess = false,
                        Details = $"Failed: {ex.Message}"
                    }, cancellationToken);
                    await context.SaveChangesAsync(cancellationToken);
                }
            }
        }

        private async Task ProcessMissedDeadlinesAsync(
            ApplicationDbContext context,
            DateTime nowUtc,
            CancellationToken cancellationToken)
        {
            // Find tasks past deadline that haven't been penalized yet
            var overdueTasks = await context.PlannerEvents
                .Where(e => !e.MissedDeadlinePenalized &&
                            nowUtc > e.EndTime &&
                            (!e.IsCompleted || (e.CompletedAt != null && e.CompletedAt > e.EndTime)))
                .ToListAsync(cancellationToken);

            if (!overdueTasks.Any()) return;

            foreach (var task in overdueTasks)
            {
                task.MissedDeadlinePenalized = true;
                task.PenaltyAppliedAt = nowUtc;
                task.UpdatedAt = nowUtc;

                context.UserNotificationLogs.Add(new UserNotificationLog
                {
                    UserId = task.UserId,
                    NotificationType = "MissedDeadlinePenalty",
                    ReferenceId = task.Id.ToString(),
                    SentAt = task.EndTime,
                    RecipientEmail = string.Empty,
                    IsSuccess = true,
                    Details = $"Missed deadline penalty (-2 pts) permanently retained for task '{task.Title}'."
                });
            }

            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("[PlannerAutomation] Recorded missed-deadline penalty for {Count} overdue tasks.", overdueTasks.Count);
        }

        private async Task ProcessInactivityMilestonesAsync(
            ApplicationDbContext context,
            IEmailService emailService,
            DateTime nowUtc,
            CancellationToken cancellationToken)
        {
            var activeUsers = await context.Users
                .Where(u => u.Status == UserStatus.Active)
                .ToListAsync(cancellationToken);

            string frontendBaseUrl = _configuration["FrontendUrl"] ?? "https://lifesync-ai.vercel.app";

            foreach (var user in activeUsers)
            {
                if (cancellationToken.IsCancellationRequested) break;

                // 1. Determine last planner activity
                var lastTask = await context.PlannerEvents
                    .Where(e => e.UserId == user.Id)
                    .OrderByDescending(e => e.UpdatedAt ?? e.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);

                DateTime lastPlannerDate = lastTask?.UpdatedAt ?? lastTask?.CreatedAt ?? user.CreatedAt;
                bool hasPlannerHistory = lastTask != null;
                double daysInactive = (nowUtc - lastPlannerDate).TotalDays;

                // 2. Check if user is active in other modules within the last 7 days
                var recentHealth = await context.HealthLogs
                    .AnyAsync(h => h.UserId == user.Id && h.LogDate >= nowUtc.AddDays(-7), cancellationToken);
                var recentFinance = await context.Transactions
                    .AnyAsync(t => t.UserId == user.Id && t.Date >= nowUtc.AddDays(-7), cancellationToken);
                var recentCareer = await context.JobApplications
                    .AnyAsync(j => j.UserId == user.Id && j.AppliedDate >= nowUtc.AddDays(-7), cancellationToken);

                bool activeInOtherModules = recentHealth || recentFinance || recentCareer;

                // 3. Determine applicable milestone
                string? milestone = null;
                string milestoneTitle = "";
                string milestoneBody = "";

                if (daysInactive >= 365)
                {
                    milestone = "Inactivity_1y";
                    milestoneTitle = "A fresh chapter awaits in your LifeSync AI Planner";
                    milestoneBody = "It has been one year since your last planner activity. We respectfully invite you to return, review your priorities, and start a fresh chapter with a supportive, organized routine.";
                }
                else if (daysInactive >= 180)
                {
                    milestone = "Inactivity_6m";
                    milestoneTitle = "Rediscover your focus with LifeSync AI Planner";
                    milestoneBody = "It has been 6 months since you last planned your schedule. Rediscover how LifeSync AI helps you track daily goals, wellness habits, and daily scores.";
                }
                else if (daysInactive >= 90)
                {
                    milestone = "Inactivity_3m";
                    milestoneTitle = "Ready for a fresh start? Your LifeSync Planner is here";
                    milestoneBody = "Three months have passed since your last task update. A fresh start is just one simple plan away. Pick one goal today and let LifeSync AI keep you on track.";
                }
                else if (daysInactive >= 30)
                {
                    milestone = "Inactivity_30d";
                    milestoneTitle = "Take a moment to review and organize your goals";
                    milestoneBody = "It's been 30 days since your last planner update. Take a few minutes today to review your schedule and turn upcoming ambitions into manageable, daily actions.";
                }
                else if (daysInactive >= 7)
                {
                    milestone = "Inactivity_7d";
                    milestoneTitle = "Restart your weekly routine with LifeSync Planner";
                    milestoneBody = activeInOtherModules
                        ? "We noticed you're making great progress in your wellness and finance tracking! Extend that momentum to your calendar by scheduling your key focus tasks for this week."
                        : (!hasPlannerHistory
                            ? "Welcome to LifeSync AI! Start your journey by creating your first task in the Personal Planner to kick off your daily Life Score."
                            : "It has been a week since your last planner update. A quick 5-minute planning session today can give you complete clarity for the days ahead.");
                }

                if (milestone == null) continue;

                // 4. Prevent duplicate milestone emails: Check if this milestone or any higher milestone was sent successfully
                var existingSuccessfulLogs = await context.UserNotificationLogs
                    .Where(n => n.UserId == user.Id && n.NotificationType.StartsWith("Inactivity_") && n.IsSuccess)
                    .Select(n => n.NotificationType)
                    .ToListAsync(cancellationToken);

                if (existingSuccessfulLogs.Contains(milestone)) continue;

                // If a later milestone was already sent, earlier milestones are superseded
                var milestoneRank = new Dictionary<string, int>
                {
                    { "Inactivity_7d", 1 },
                    { "Inactivity_30d", 2 },
                    { "Inactivity_3m", 3 },
                    { "Inactivity_6m", 4 },
                    { "Inactivity_1y", 5 }
                };

                int currentRank = milestoneRank[milestone];
                if (existingSuccessfulLogs.Any(l => milestoneRank.TryGetValue(l, out var r) && r >= currentRank))
                {
                    continue;
                }

                // Check recent failed attempts to prevent tight-loop hammering, while allowing controlled retries
                var recentMilestoneFailure = await context.UserNotificationLogs
                    .Where(n => n.UserId == user.Id && n.NotificationType == milestone && !n.IsSuccess)
                    .OrderByDescending(n => n.SentAt)
                    .FirstOrDefaultAsync(cancellationToken);

                if (recentMilestoneFailure != null && (nowUtc - recentMilestoneFailure.SentAt).TotalHours < 12)
                {
                    continue;
                }

                string plannerUrl = $"{frontendBaseUrl.TrimEnd('/')}/planner";
                string subject = $"{milestoneTitle} — LifeSync AI";

                string htmlBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; padding: 24px; margin: 0;"">
  <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border-left: 6px solid #10b981; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);"">
    <h2 style=""color: #065f46; margin-top: 0; font-size: 20px;"">{milestoneTitle}</h2>
    <p style=""color: #4b5563; font-size: 15px; line-height: 1.5;"">
      Hello {(!string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : "there")},
    </p>
    <p style=""color: #374151; font-size: 14px; line-height: 1.6;"">
      {milestoneBody}
    </p>
    <div style=""background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;"">
      <h4 style=""color: #1e293b; margin: 0 0 8px 0; font-size: 14px;"">Why plan with LifeSync AI?</h4>
      <ul style=""color: #475569; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;"">
        <li>Maintain clarity across your tasks, time blocks, and priorities.</li>
        <li>Elevate your daily 0–100 Life Score through consistent completions.</li>
        <li>Seamlessly balance your calendar with hydration, workouts, and finances.</li>
      </ul>
    </div>
    <div style=""margin-top: 24px; text-align: center;"">
      <a href=""{plannerUrl}"" style=""background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;"">Open Your Planner</a>
    </div>
    <p style=""color: #9ca3af; font-size: 11px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center;"">
      LifeSync AI &bull; Smart Personal Intelligence &bull; Notification preferences can be adjusted in your Profile.
    </p>
  </div>
</body>
</html>";

                try
                {
                    await emailService.SendEmailAsync(user.Email, subject, htmlBody);
                    await context.UserNotificationLogs.AddAsync(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = milestone,
                        ReferenceId = milestone,
                        RecipientEmail = user.Email,
                        SentAt = nowUtc,
                        IsSuccess = true,
                        Details = $"Inactivity milestone '{milestone}' email sent successfully."
                    }, cancellationToken);

                    await context.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation("[PlannerAutomation] Sent re-engagement email ({Milestone}) to {Email}", milestone, user.Email);
                }
                catch (DbUpdateException dbEx)
                {
                    _logger.LogWarning(dbEx, "[PlannerAutomation] Duplicate inactivity milestone prevented by database constraint for user #{UserId}", user.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[PlannerAutomation] Failed to send re-engagement email ({Milestone}) to {Email}", milestone, user.Email);
                    await context.UserNotificationLogs.AddAsync(new UserNotificationLog
                    {
                        UserId = user.Id,
                        NotificationType = milestone,
                        ReferenceId = milestone,
                        RecipientEmail = user.Email,
                        SentAt = nowUtc,
                        IsSuccess = false,
                        Details = $"Failed: {ex.Message}"
                    }, cancellationToken);
                    await context.SaveChangesAsync(cancellationToken);
                }
            }
        }
    }
}
