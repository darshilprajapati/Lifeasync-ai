using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Output.System;
using LifeSyncAI.Core.Responses;
using Serilog;

namespace LifeSyncAI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SystemController : ControllerBase
    {
        private string NotificationRecipient => _configuration["ADMIN_EMAIL"] ?? "gdarshil1203@gmail.com";
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;
        private readonly IEmailService _emailService;

        public SystemController(
            ApplicationDbContext context,
            IConfiguration configuration,
            IHostEnvironment environment,
            IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _environment = environment;
            _emailService = emailService;
        }

        /// <summary>
        /// Public, lightweight ping endpoint requiring zero authentication or login.
        /// Ideal for keep-alive services, UptimeRobot, and browser health verification.
        /// </summary>
        [HttpGet("ping")]
        [HttpHead("ping")]
        [HttpGet("health")]
        [HttpHead("health")]
        public IActionResult Ping()
        {
            return Ok(new
            {
                status = "Healthy",
                service = "LifeSync AI API",
                timestampUtc = DateTime.UtcNow,
                timestampIst = DateTime.UtcNow.AddMinutes(330).ToString("yyyy-MM-dd HH:mm:ss 'IST'")
            });
        }

        /// <summary>
        /// Daily scheduled keep-alive & database health check endpoint.
        /// Authenticates the request using a secure secret key header and performs a lightweight, read-only connectivity probe.
        /// Automatically dispatches daily status notification to gdarshil1203@gmail.com using the configured IEmailService.
        /// </summary>
        [HttpGet("keep-alive")]
        [HttpPost("keep-alive")]
        public async Task<ActionResult<ApiResponse<KeepAliveResultDto>>> KeepAlive([FromHeader(Name = "X-KeepAlive-Key")] string? keepAliveHeader)
        {
            // 1. Authenticate request using configured secret
            var expectedKey = _configuration["KeepAliveSettings:SecretKey"]
                              ?? Environment.GetEnvironmentVariable("KEEPALIVE_SECRET")
                              ?? Environment.GetEnvironmentVariable("KeepAliveSettings__SecretKey");

            if (string.IsNullOrEmpty(expectedKey))
            {
                // In local development, permit a deterministic fallback key if not configured
                if (_environment.IsDevelopment())
                {
                    expectedKey = "LifeSync_Dev_KeepAlive_Key_2026!";
                }
                else
                {
                    Log.Error("Keep-alive secret key is not configured in production settings.");
                    return StatusCode(500, ApiResponse<KeepAliveResultDto>.Fail("Server configuration error: Keep-alive security key not configured."));
                }
            }

            // Fallback: check Authorization: Bearer <key> header if X-KeepAlive-Key was not supplied
            var providedKey = keepAliveHeader;
            if (string.IsNullOrEmpty(providedKey) && Request != null)
            {
                string? authHeader = Request.Headers["Authorization"];
                if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    providedKey = authHeader.Substring("Bearer ".Length).Trim();
                }
            }

            if (string.IsNullOrEmpty(providedKey) || !IsKeyValid(providedKey, expectedKey))
            {
                Log.Warning("Unauthorized keep-alive access attempt rejected from IP: {RemoteIp}", HttpContext?.Connection?.RemoteIpAddress);
                return Unauthorized(ApiResponse<KeepAliveResultDto>.Fail("Unauthorized: Invalid or missing keep-alive authentication key."));
            }

            // 2. Perform lightweight, read-only database probe with cancellation timeout
            var nowUtc = DateTime.UtcNow;
            var nowIst = nowUtc.AddMinutes(330); // UTC+05:30 Asia/Kolkata
            var timestampIstStr = nowIst.ToString("yyyy-MM-dd HH:mm:ss 'IST'");

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                bool canConnect = await _context.Database.CanConnectAsync(cts.Token);

                if (!canConnect)
                {
                    Log.Warning("Keep-alive database probe returned false during connectivity check.");
                    await TrySendNotificationEmailAsync(isSuccess: false, "Database connectivity check failed: Unable to establish connection.", timestampIstStr, "Relational");
                    return StatusCode(503, ApiResponse<KeepAliveResultDto>.Fail("Database connectivity check failed: Unable to establish connection."));
                }

                // Determine active database provider name safely
                var rawProvider = _context.Database.ProviderName ?? "Relational";
                var providerName = rawProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) || rawProvider.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase)
                    ? "PostgreSQL"
                    : rawProvider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase)
                        ? "SQLite"
                        : "SQL Server";

                var result = new KeepAliveResultDto
                {
                    Status = "Healthy",
                    DatabaseConnected = true,
                    Provider = providerName,
                    TimestampUtc = nowUtc.ToString("o"),
                    TimestampIst = timestampIstStr
                };

                Log.Information("Keep-alive probe succeeded at {TimestampIst} (Provider: {Provider})", result.TimestampIst, providerName);
                await TrySendNotificationEmailAsync(isSuccess: true, "Database connectivity check passed.", timestampIstStr, providerName);
                return Ok(ApiResponse<KeepAliveResultDto>.Success(result, "Database connectivity check passed."));
            }
            catch (OperationCanceledException)
            {
                Log.Error("Keep-alive database connectivity probe timed out after 5 seconds.");
                await TrySendNotificationEmailAsync(isSuccess: false, "Database connectivity check timed out after 5 seconds.", timestampIstStr, "Unknown");
                return StatusCode(504, ApiResponse<KeepAliveResultDto>.Fail("Database connectivity check timed out."));
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Unexpected error occurred during keep-alive database probe.");
                await TrySendNotificationEmailAsync(isSuccess: false, "Database connectivity check failed: " + ex.Message, timestampIstStr, "Unknown");
                return StatusCode(503, ApiResponse<KeepAliveResultDto>.Fail("Database connectivity check failed."));
            }
        }

        private async Task TrySendNotificationEmailAsync(bool isSuccess, string message, string timestampIst, string provider)
        {
            try
            {
                string subject = isSuccess
                    ? "LifeSync AI — Daily Keep-Alive SUCCESS"
                    : "LifeSync AI — Daily Keep-Alive FAILED";

                string statusColor = isSuccess ? "#10b981" : "#ef4444";
                string statusText = isSuccess ? "SUCCESS" : "FAILED";

                string bodyHtml = $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 24px;"">
  <div style=""max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border-left: 6px solid {statusColor}; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"">
    <h2 style=""color: {statusColor}; margin-top: 0;"">{subject}</h2>
    <p style=""color: #4b5563; font-size: 15px;"">Daily automated database connectivity and keep-alive notification.</p>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 16px;"">
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold; width: 160px;"">Result:</td><td style=""color: {statusColor}; font-weight: bold;"">{statusText}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Database Connectivity:</td><td style=""color: #111827;"">{(isSuccess ? "Passed (Connected)" : "Failed")}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Provider:</td><td style=""color: #111827;"">{provider}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Execution Time (IST):</td><td style=""color: #111827;"">{timestampIst}</td></tr>
      <tr><td style=""padding: 8px 0; color: #6b7280; font-weight: bold;"">Details:</td><td style=""color: #111827;"">{message}</td></tr>
    </table>
  </div>
</body>
</html>";

                await _emailService.SendEmailAsync(NotificationRecipient, subject, bodyHtml);
                Log.Information("Daily keep-alive notification email dispatched to {Recipient}", NotificationRecipient);
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Failed to dispatch daily keep-alive email notification to {Recipient}", NotificationRecipient);
            }
        }

        /// <summary>
        /// Constant-time string comparison to prevent timing attacks on secret validation.
        /// </summary>
        private static bool IsKeyValid(string provided, string expected)
        {
            var providedBytes = Encoding.UTF8.GetBytes(provided);
            var expectedBytes = Encoding.UTF8.GetBytes(expected);

            if (providedBytes.Length != expectedBytes.Length)
            {
                return false;
            }

            return CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
        }
    }
}
