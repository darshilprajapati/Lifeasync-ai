using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Background automation hosted service managing periodic database connectivity probes and email notifications.
    /// Supports a controlled 20-second temporary diagnostic test phase (capped at MaxTestIterations)
    /// and scheduled operation without overlapping executions.
    /// </summary>
    public class KeepAliveAutomationHostedService : BackgroundService
    {
        private const string DefaultRecipient = "gdarshil1203@gmail.com";
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<KeepAliveAutomationHostedService> _logger;
        private readonly SemaphoreSlim _executionGate = new SemaphoreSlim(1, 1);
        private int _iterationCount = 0;

        public KeepAliveAutomationHostedService(
            IServiceScopeFactory scopeFactory,
            IConfiguration configuration,
            ILogger<KeepAliveAutomationHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var section = _configuration.GetSection("EmailAutomation");
            bool isEnabled = bool.TryParse(section["Enabled"], out var enabledVal) ? enabledVal : true;
            bool isDiagnosticTest = bool.TryParse(section["DiagnosticTestEnabled"], out var testVal) ? testVal : true;
            int intervalSeconds = int.TryParse(section["IntervalSeconds"], out var parsedInterval) && parsedInterval > 0 ? parsedInterval : 20;
            int maxIterations = int.TryParse(section["MaxTestIterations"], out var parsedMax) && parsedMax > 0 ? parsedMax : 10;
            string recipient = section["Recipient"] ?? DefaultRecipient;

            if (!isEnabled)
            {
                _logger.LogInformation("[EmailAutomation] Automated email service is disabled in configuration.");
                return;
            }

            _logger.LogInformation(
                "[EmailAutomation] Hosted service started. Mode: {Mode}, Interval: {Interval}s, Recipient: {Recipient}, SafetyMax: {Max}",
                isDiagnosticTest ? "Temporary Diagnostic Test (20s)" : "Scheduled Production",
                intervalSeconds,
                recipient,
                isDiagnosticTest ? maxIterations.ToString() : "Unlimited");

            // Initial short pause after startup before first execution
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                if (isDiagnosticTest && _iterationCount >= maxIterations)
                {
                    _logger.LogInformation(
                        "[EmailAutomation] Diagnostic test mode reached the configured safety cap of {Max} iterations. All {Count} test emails delivered. Pausing high-frequency dispatch awaiting user confirmation to switch to permanent schedule.",
                        maxIterations, _iterationCount);
                    break;
                }

                await ExecuteProbeAndNotificationAsync(recipient, isDiagnosticTest, maxIterations, stoppingToken);

                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("[EmailAutomation] Hosted service execution stopped.");
        }

        public async Task<bool> ExecuteProbeAndNotificationAsync(string recipient, bool isDiagnosticTest, int maxIterations, CancellationToken cancellationToken)
        {
            // Guarantee zero concurrent/overlapping executions
            if (!await _executionGate.WaitAsync(0, cancellationToken))
            {
                _logger.LogWarning("[EmailAutomation] Previous probe execution is still running; skipping overlapping cycle.");
                return false;
            }

            try
            {
                _iterationCount++;
                var currentIteration = _iterationCount;
                var nowUtc = DateTime.UtcNow;
                var nowIst = nowUtc.AddMinutes(330);
                var istTimeStr = nowIst.ToString("yyyy-MM-dd hh:mm:ss tt 'IST'");

                _logger.LogInformation("[EmailAutomation] Starting automation iteration #{Iteration} for {Recipient} at {IstTime}",
                    currentIteration, recipient, istTimeStr);

                bool isSuccess = false;
                string provider = "Relational";
                string probeMessage;
                long probeLatencyMs = 0;

                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var sw = System.Diagnostics.Stopwatch.StartNew();

                    try
                    {
                        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                        cts.CancelAfter(TimeSpan.FromSeconds(10));

                        isSuccess = await context.Database.CanConnectAsync(cts.Token);
                        sw.Stop();
                        probeLatencyMs = sw.ElapsedMilliseconds;

                        var rawProvider = context.Database.ProviderName ?? "Relational";
                        provider = rawProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) || rawProvider.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase)
                            ? "PostgreSQL (Neon)"
                            : rawProvider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase)
                                ? "SQLite"
                                : "SQL Server";

                        probeMessage = isSuccess
                            ? $"Database connectivity check passed in {probeLatencyMs}ms."
                            : "Database connectivity probe returned false.";
                    }
                    catch (Exception ex)
                    {
                        sw.Stop();
                        probeLatencyMs = sw.ElapsedMilliseconds;
                        isSuccess = false;
                        probeMessage = $"Connectivity probe failed after {probeLatencyMs}ms: {ex.Message}";
                        _logger.LogError(ex, "[EmailAutomation] Database probe error during iteration #{Iteration}", currentIteration);
                    }

                    // Dispatch notification email via IEmailService
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                    string subject = isDiagnosticTest
                        ? $"[TEST 20s AUTOMATION] LifeSync AI — Automation Test #{currentIteration} ({(isSuccess ? "SUCCESS" : "FAILED")})"
                        : $"LifeSync AI — Scheduled Database Keep-Alive {(isSuccess ? "SUCCESS" : "FAILED")}";

                    string statusColor = isSuccess ? "#10b981" : "#ef4444";
                    string statusText = isSuccess ? "SUCCESS" : "FAILED";

                    string diagnosticBadge = isDiagnosticTest
                        ? $@"<tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold; width: 170px;"">Diagnostic Mode:</td><td style=""color: #3b82f6; font-weight: bold;"">Active (Test #{currentIteration} of {maxIterations} @ 20s interval)</td></tr>"
                        : "";

                    string htmlBody = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; padding: 24px; margin: 0;"">
  <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border-left: 6px solid {statusColor}; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);"">
    <h2 style=""color: {statusColor}; margin-top: 0; font-size: 20px;"">{subject}</h2>
    <p style=""color: #4b5563; font-size: 14px; line-height: 1.5;"">
      {(isDiagnosticTest ? "Temporary high-frequency diagnostic test email verifying automation triggering, backend reachability, database connectivity, and SMTP dispatch." : "Daily automated database connectivity and keep-alive notification.")}
    </p>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;"">
      {diagnosticBadge}
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold; width: 170px;"">Result:</td><td style=""color: {statusColor}; font-weight: bold;"">{statusText}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Database Status:</td><td style=""color: #111827;"">{(isSuccess ? "Passed (Connected)" : "Failed")}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Provider:</td><td style=""color: #111827;"">{provider}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Probe Latency:</td><td style=""color: #111827;"">{probeLatencyMs}ms</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Execution Time (IST):</td><td style=""color: #111827;"">{istTimeStr}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Probe Details:</td><td style=""color: #111827;"">{probeMessage}</td></tr>
    </table>
    <div style=""margin-top: 24px; padding: 14px; background-color: {(isSuccess ? "#ecfdf5" : "#fef2f2")}; border-radius: 8px; color: {(isSuccess ? "#065f46" : "#991b1b")}; font-size: 13px; line-height: 1.4;"">
      {(isSuccess ? "SMTP delivery verified. Database connection confirmed healthy. No manual action required." : "Alert: Database probe returned failure. Please inspect connection string and database status.")}
    </div>
    <div style=""margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center;"">
      LifeSync AI Automated Monitoring System &bull; Recipient: {recipient}
    </div>
  </div>
</body>
</html>";

                    try
                    {
                        await emailService.SendEmailAsync(recipient, subject, htmlBody);
                        _logger.LogInformation("[EmailAutomation] Test email #{Iteration} successfully delivered to {Recipient} via SMTP ({IstTime})",
                            currentIteration, recipient, istTimeStr);
                        return true;
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "[EmailAutomation] Failed to send email for iteration #{Iteration} to {Recipient}",
                            currentIteration, recipient);
                        return false;
                    }
                }
            }
            finally
            {
                _executionGate.Release();
            }
        }
    }
}
