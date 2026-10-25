using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Options;

namespace LifeSyncAI.Core.Services
{
    public class ProfileMigrationReport
    {
        public bool IsDryRun { get; set; }
        public int TotalUsersExamined { get; set; }
        public int MigratedCount { get; set; }
        public int SkippedCount { get; set; }
        public int FailedCount { get; set; }
        public int ManualInterventionCount { get; set; }
        public List<string> Logs { get; } = new();
    }

    /// <summary>
    /// Safe, idempotent migration service for converting legacy profile photos (e.g., base64 data URLs)
    /// into Supabase Storage assets and updating User entities.
    /// Supports a non-destructive dry-run mode.
    /// </summary>
    public class ProfileImageMigrationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ISupabaseStorageService _storageService;
        private readonly SupabaseOptions _options;
        private readonly ILogger<ProfileImageMigrationService> _logger;
        private readonly HttpClient _httpClient;

        private static readonly Regex DataUriRegex = new(
            @"^data:(image\/[a-zA-Z0-9\.\+-]+);base64,(.+)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        public ProfileImageMigrationService(
            ApplicationDbContext context,
            ISupabaseStorageService storageService,
            IOptions<SupabaseOptions> options,
            ILogger<ProfileImageMigrationService> logger,
            HttpClient httpClient)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        }

        public async Task<ProfileMigrationReport> MigrateAllAsync(bool dryRun, CancellationToken cancellationToken = default)
        {
            var report = new ProfileMigrationReport { IsDryRun = dryRun };
            string modeName = dryRun ? "DRY-RUN" : "EXECUTE";
            _logger.LogInformation("Starting Profile Image Migration to Supabase in [{Mode}] mode...", modeName);
            report.Logs.Add($"Starting Profile Image Migration in [{modeName}] mode at {DateTime.UtcNow:u}");

            if (!_storageService.IsConfigured && !dryRun)
            {
                string msg = "Cannot execute live migration because Supabase Storage is not configured.";
                _logger.LogError("{Message}", msg);
                report.Logs.Add($"[ABORTED] {msg}");
                report.FailedCount++;
                return report;
            }

            var usersWithPhotos = await _context.Users
                .Where(u => !string.IsNullOrEmpty(u.ProfilePhoto))
                .OrderBy(u => u.Id)
                .ToListAsync(cancellationToken);

            report.TotalUsersExamined = usersWithPhotos.Count;
            _logger.LogInformation("Found {Count} users with non-empty profile photos.", usersWithPhotos.Count);
            report.Logs.Add($"Found {usersWithPhotos.Count} user record(s) with existing profile photos.");

            foreach (var user in usersWithPhotos)
            {
                cancellationToken.ThrowIfCancellationRequested();
                string currentPhoto = user.ProfilePhoto!.Trim();

                // 1. Idempotency Check: Already on Supabase
                if (IsAlreadySupabaseUrl(currentPhoto))
                {
                    report.SkippedCount++;
                    string skipMsg = $"[SKIPPED] User ID {user.Id}: Already using Supabase Storage ({SanitizeUrl(currentPhoto)}).";
                    report.Logs.Add(skipMsg);
                    _logger.LogInformation("{Message}", skipMsg);
                    continue;
                }

                // 2. Base64 Data URI Migration
                var dataUriMatch = DataUriRegex.Match(currentPhoto);
                if (dataUriMatch.Success)
                {
                    await ProcessBase64MigrationAsync(user, dataUriMatch, dryRun, report, cancellationToken);
                    continue;
                }

                // 3. Remote Legacy HTTP/HTTPS URL Migration
                if (Uri.TryCreate(currentPhoto, UriKind.Absolute, out var parsedUri) &&
                    (parsedUri.Scheme == Uri.UriSchemeHttp || parsedUri.Scheme == Uri.UriSchemeHttps))
                {
                    await ProcessRemoteUrlMigrationAsync(user, parsedUri, dryRun, report, cancellationToken);
                    continue;
                }

                // 4. Unrecognized or Inaccessible Format
                report.ManualInterventionCount++;
                string manualMsg = $"[MANUAL INTERVENTION] User ID {user.Id}: Stored profile photo is not a valid base64 data URI or HTTP/HTTPS URL.";
                report.Logs.Add(manualMsg);
                _logger.LogWarning("{Message}", manualMsg);
            }

            string summaryMsg = $"Migration finished. Total: {report.TotalUsersExamined}, Migrated: {report.MigratedCount}, Skipped: {report.SkippedCount}, Failed: {report.FailedCount}, Needs Intervention: {report.ManualInterventionCount}.";
            report.Logs.Add(summaryMsg);
            _logger.LogInformation("{Message}", summaryMsg);

            return report;
        }

        private bool IsAlreadySupabaseUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return false;

            // Check against configured URL or generic Supabase storage path pattern
            if (!string.IsNullOrWhiteSpace(_options.Url) && url.StartsWith(_options.Url.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return url.Contains("/storage/v1/object/public/") && url.Contains(_options.AvatarBucket);
        }

        private async Task ProcessBase64MigrationAsync(
            Models.User user,
            Match match,
            bool dryRun,
            ProfileMigrationReport report,
            CancellationToken cancellationToken)
        {
            string mimeType = match.Groups[1].Value.ToLowerInvariant();
            string base64Data = match.Groups[2].Value;

            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(base64Data);
            }
            catch (Exception ex)
            {
                report.ManualInterventionCount++;
                string errMsg = $"[MANUAL INTERVENTION] User ID {user.Id}: Corrupted base64 data ({ex.Message}).";
                report.Logs.Add(errMsg);
                _logger.LogWarning("{Message}", errMsg);
                return;
            }

            var detectedFormat = ImageFileValidator.DetectImageFormat(bytes);
            if (detectedFormat == null)
            {
                report.ManualInterventionCount++;
                string errMsg = $"[MANUAL INTERVENTION] User ID {user.Id}: Decoded bytes do not match a supported image format (JPEG/PNG/WebP).";
                report.Logs.Add(errMsg);
                _logger.LogWarning("{Message}", errMsg);
                return;
            }

            string ext = detectedFormat == "jpeg" ? ".jpg" : (detectedFormat == "png" ? ".png" : ".webp");
            string fileName = $"avatar{ext}";

            if (dryRun)
            {
                report.MigratedCount++;
                string dryMsg = $"[DRY-RUN] User ID {user.Id}: Would migrate base64 image ({detectedFormat}, {bytes.Length:N0} bytes) to path '{user.Id}/{fileName}'.";
                report.Logs.Add(dryMsg);
                _logger.LogInformation("{Message}", dryMsg);
                return;
            }

            try
            {
                using var ms = new MemoryStream(bytes);
                string publicUrl = await _storageService.UploadAvatarAsync(
                    user.Id,
                    ms,
                    fileName,
                    mimeType,
                    cancellationToken
                );

                // Update database record only after successful upload verification
                user.ProfilePhoto = publicUrl;
                user.UpdatedAt = DateTime.UtcNow;
                user.UpdatedBy = "SupabaseMigration";
                await _context.SaveChangesAsync(cancellationToken);

                report.MigratedCount++;
                string succMsg = $"[MIGRATED] User ID {user.Id}: Successfully uploaded to Supabase and updated profile record.";
                report.Logs.Add(succMsg);
                _logger.LogInformation("{Message}", succMsg);
            }
            catch (Exception ex)
            {
                report.FailedCount++;
                string failMsg = $"[FAILED] User ID {user.Id}: Upload to Supabase failed: {ex.Message}";
                report.Logs.Add(failMsg);
                _logger.LogError("{Message}", failMsg);
            }
        }

        private async Task ProcessRemoteUrlMigrationAsync(
            Models.User user,
            Uri uri,
            bool dryRun,
            ProfileMigrationReport report,
            CancellationToken cancellationToken)
        {
            if (dryRun)
            {
                report.MigratedCount++;
                string dryMsg = $"[DRY-RUN] User ID {user.Id}: Would download remote image from '{SanitizeUrl(uri.ToString())}' and migrate to Supabase.";
                report.Logs.Add(dryMsg);
                _logger.LogInformation("{Message}", dryMsg);
                return;
            }

            try
            {
                using var response = await _httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    report.ManualInterventionCount++;
                    string errMsg = $"[MANUAL INTERVENTION] User ID {user.Id}: Remote URL returned HTTP {response.StatusCode}. Original image retained.";
                    report.Logs.Add(errMsg);
                    _logger.LogWarning("{Message}", errMsg);
                    return;
                }

                var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

                var detectedFormat = ImageFileValidator.DetectImageFormat(bytes);
                if (detectedFormat == null)
                {
                    report.ManualInterventionCount++;
                    string errMsg = $"[MANUAL INTERVENTION] User ID {user.Id}: Remote content is not a supported image format.";
                    report.Logs.Add(errMsg);
                    _logger.LogWarning("{Message}", errMsg);
                    return;
                }

                string ext = detectedFormat == "jpeg" ? ".jpg" : (detectedFormat == "png" ? ".png" : ".webp");
                using var ms = new MemoryStream(bytes);
                string publicUrl = await _storageService.UploadAvatarAsync(
                    user.Id,
                    ms,
                    $"avatar{ext}",
                    contentType,
                    cancellationToken
                );

                user.ProfilePhoto = publicUrl;
                user.UpdatedAt = DateTime.UtcNow;
                user.UpdatedBy = "SupabaseMigration";
                await _context.SaveChangesAsync(cancellationToken);

                report.MigratedCount++;
                string succMsg = $"[MIGRATED] User ID {user.Id}: Downloaded remote image, uploaded to Supabase, and updated profile.";
                report.Logs.Add(succMsg);
                _logger.LogInformation("{Message}", succMsg);
            }
            catch (Exception ex)
            {
                report.FailedCount++;
                string failMsg = $"[FAILED] User ID {user.Id}: Remote migration failed: {ex.Message}";
                report.Logs.Add(failMsg);
                _logger.LogError("{Message}", failMsg);
            }
        }

        private static string SanitizeUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return string.Empty;
            // Truncate long URLs or query strings in logs to prevent accidental token leakage
            var queryIdx = url.IndexOf('?');
            return queryIdx > 0 ? url[..queryIdx] : url;
        }
    }
}
