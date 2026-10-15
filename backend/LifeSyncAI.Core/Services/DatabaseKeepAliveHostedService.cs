using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Linq;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Autonomous backend background hosted service.
    /// Runs daily at 12:00 PM (Noon) IST (UTC+05:30) independently of any user activity.
    /// Performs a database connectivity and activation probe (keeping Neon PostgreSQL active),
    /// and delivers an email notification to ADMIN_EMAIL via the configured IEmailService (Brevo).
    /// </summary>
    public class DatabaseKeepAliveHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseKeepAliveHostedService> _logger;

        // Target: 12:00 PM (Noon) IST (UTC+05:30)
        private static readonly TimeSpan TargetIstTime = new TimeSpan(12, 0, 0);
        private static readonly TimeSpan IstOffset = TimeSpan.FromMinutes(330);

        public DatabaseKeepAliveHostedService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<DatabaseKeepAliveHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[DatabaseKeepAlive] Autonomous daily hosted service initialized.");

            // Initial short warm-up delay to allow ASP.NET Core server and DB migrations to settle
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                var nowUtc = DateTime.UtcNow;
                var nowIst = nowUtc + IstOffset;
                var nextRunIst = nowIst.Date.Add(TargetIstTime);

                // If 12:00 PM IST has already passed today, schedule for tomorrow at 12:00 PM IST
                if (nowIst >= nextRunIst)
                {
                    nextRunIst = nextRunIst.AddDays(1);
                }

                var delay = nextRunIst - nowIst;
                _logger.LogInformation("[DatabaseKeepAlive] Next daily 12:00 PM execution scheduled at {NextRunIst} IST (waiting {Hours}h {Minutes}m {Seconds}s).",
                    nextRunIst.ToString("yyyy-MM-dd hh:mm:ss tt"), delay.Hours, delay.Minutes, delay.Seconds);

                try
                {
                    await Task.Delay(delay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }

                try
                {
                    await ExecuteKeepAliveCycleAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DatabaseKeepAlive] Error during 12:00 PM database keep-alive cycle.");
                }
            }

            _logger.LogInformation("[DatabaseKeepAlive] Hosted service shutting down.");
        }

        public async Task ExecuteKeepAliveCycleAsync(CancellationToken cancellationToken)
        {
            var nowUtc = DateTime.UtcNow;
            var nowIst = nowUtc + IstOffset;
            var timestampIstStr = nowIst.ToString("yyyy-MM-dd hh:mm:ss tt 'IST'");

            _logger.LogInformation("[DatabaseKeepAlive] Executing automated 12:00 PM database probe at {Timestamp}...", timestampIstStr);

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            string recipientEmail = _configuration["ADMIN_EMAIL"] ?? "gdarshil1203@gmail.com";
            bool isSuccess = false;
            string detailsMessage = string.Empty;
            string providerName = "Relational";
            long latencyMs = 0;

            try
            {
                var stopwatch = Stopwatch.StartNew();
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(15));

                bool canConnect = await context.Database.CanConnectAsync(cts.Token);
                stopwatch.Stop();
                latencyMs = stopwatch.ElapsedMilliseconds;

                if (canConnect)
                {
                    var rawProvider = context.Database.ProviderName ?? "Relational";
                    providerName = rawProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) || rawProvider.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase)
                        ? "PostgreSQL (Neon Serverless)"
                        : rawProvider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase)
                            ? "SQLite"
                            : "SQL Server";

                    isSuccess = true;
                    detailsMessage = $"Database probe succeeded in {latencyMs}ms. Database connection is active and healthy.";
                    _logger.LogInformation("[DatabaseKeepAlive] Probe PASSED ({Provider}) in {Latency}ms.", providerName, latencyMs);
                }
                else
                {
                    isSuccess = false;
                    detailsMessage = "Database connectivity check returned false: Connection could not be established.";
                    _logger.LogWarning("[DatabaseKeepAlive] Probe returned false.");
                }
            }
            catch (Exception ex)
            {
                isSuccess = false;
                detailsMessage = $"Database connectivity exception: {ex.Message}";
                _logger.LogError(ex, "[DatabaseKeepAlive] Exception while testing database connection.");
            }

            string todayIstStr = nowIst.ToString("yyyy-MM-dd");

            // Verify if daily keep-alive email was already sent today
            bool alreadySentToday = await context.UserNotificationLogs.AnyAsync(n =>
                n.NotificationType == "DailyKeepAliveEmail" &&
                n.ReferenceId == todayIstStr &&
                n.IsSuccess, cancellationToken);

            if (alreadySentToday)
            {
                _logger.LogInformation("[DatabaseKeepAlive] Daily status email already delivered for {TodayIst}. Skipping duplicate email.", todayIstStr);
                return;
            }

            // Dispatch status email to ADMIN_EMAIL via IEmailService (Brevo)
            try
            {
                string subject = isSuccess
                    ? "LifeSync AI — Daily Database Keep-Alive SUCCESS"
                    : "LifeSync AI — Daily Database Keep-Alive FAILED";

                string statusColor = isSuccess ? "#10b981" : "#ef4444";
                string statusText = isSuccess ? "SUCCESS" : "FAILED";

                string bodyHtml = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 24px;"">
  <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border-left: 6px solid {statusColor}; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"">
    <h2 style=""color: {statusColor}; margin-top: 0;"">{subject}</h2>
    <p style=""color: #4b5563; font-size: 15px;"">Automated backend daily database activation and keep-alive notification (Zero user activity required).</p>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 16px;"">
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold; width: 170px;"">Status:</td><td style=""color: {statusColor}; font-weight: bold;"">{statusText}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Database Connectivity:</td><td style=""color: #111827;"">{(isSuccess ? "Connected & Active" : "Connection Failed")}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Provider:</td><td style=""color: #111827;"">{providerName}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Latency:</td><td style=""color: #111827;"">{latencyMs} ms</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Execution Time (IST):</td><td style=""color: #111827;"">{timestampIstStr}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Details:</td><td style=""color: #111827;"">{detailsMessage}</td></tr>
    </table>
    <div style=""margin-top: 24px; padding: 12px; background-color: {(isSuccess ? "#ecfdf5" : "#fef2f2")}; border-radius: 6px; color: {(isSuccess ? "#065f46" : "#991b1b")}; font-size: 13px;"">
      {(isSuccess ? "Database has been pinged and kept active. All systems are operational." : "Database probe failed. Please verify Neon PostgreSQL connection status.")}
    </div>
  </div>
</body>
</html>";

                await emailService.SendEmailAsync(recipientEmail, subject, bodyHtml);
                _logger.LogInformation("[DatabaseKeepAlive] Daily status email dispatched to {Recipient}.", recipientEmail);

                if (isSuccess)
                {
                    int adminUserId = await context.Users
                        .Where(u => u.Role == LifeSyncAI.Core.Enums.UserRole.Admin)
                        .Select(u => u.Id)
                        .FirstOrDefaultAsync(cancellationToken);
                    if (adminUserId == 0) adminUserId = 1;

                    context.UserNotificationLogs.Add(new UserNotificationLog
                    {
                        UserId = adminUserId,
                        NotificationType = "DailyKeepAliveEmail",
                        ReferenceId = todayIstStr,
                        SentAt = nowUtc,
                        RecipientEmail = recipientEmail,
                        IsSuccess = true,
                        Details = $"Autonomous 12:00 PM hosted service email delivered at {timestampIstStr}."
                    });
                    await context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DatabaseKeepAlive] Failed to dispatch email notification to {Recipient}.", recipientEmail);
            }
        }
    }
}
