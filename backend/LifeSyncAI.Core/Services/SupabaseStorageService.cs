using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Options;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Implements profile image storage using the Supabase Storage REST API.
    /// Manages user avatar assets at deterministic paths ({userId}/avatar.{ext}) with upsert support.
    /// </summary>
    public class SupabaseStorageService : ISupabaseStorageService
    {
        private readonly HttpClient _httpClient;
        private readonly SupabaseOptions _options;
        private readonly ILogger<SupabaseStorageService> _logger;

        private static readonly string[] PossibleExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

        public SupabaseStorageService(
            HttpClient httpClient,
            IOptions<SupabaseOptions> options,
            ILogger<SupabaseStorageService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public bool IsConfigured => _options.IsConfigured;

        private void EnsureConfigured()
        {
            if (!_options.IsConfigured)
            {
                throw new InvalidOperationException(
                    "Supabase Storage is not configured. Please ensure 'Supabase:Url', 'Supabase:ServiceRoleKey', and 'Supabase:AvatarBucket' are properly configured."
                );
            }
        }

        /// <inheritdoc />
        public async Task<string> UploadAvatarAsync(
            int userId,
            Stream fileStream,
            string fileName,
            string contentType,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
            {
                throw new ArgumentException("A valid positive authenticated user ID is required.", nameof(userId));
            }

            EnsureConfigured();

            // 1. Comprehensive backend validation (magic bytes, size <= 5MB, format)
            var validation = await ImageFileValidator.ValidateImageStreamAsync(
                fileStream,
                fileName,
                contentType,
                cancellationToken
            );

            if (!validation.IsValid)
            {
                throw new ArgumentException(validation.ErrorMessage);
            }

            // 2. Deterministic, user-scoped storage path
            string targetPath = $"{userId}/avatar{validation.NormalizedExtension}";
            string bucket = _options.AvatarBucket;
            string baseUrl = _options.Url.TrimEnd('/');

            // 3. Remove any previous avatar with a different extension for this user
            foreach (var ext in PossibleExtensions)
            {
                if (ext != validation.NormalizedExtension)
                {
                    await TryDeleteObjectPathAsync($"{userId}/avatar{ext}", cancellationToken);
                }
            }

            // 4. Build REST API URL: POST /storage/v1/object/{bucket}/{path}
            string uploadUrl = $"{baseUrl}/storage/v1/object/{bucket}/{targetPath}";

            using var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
            request.Headers.Add("apikey", _options.ServiceRoleKey);
            request.Headers.Add("x-upsert", "true"); // Support replacement/upsert

            using var content = new ByteArrayContent(validation.FileBytes);
            content.Headers.ContentType = new MediaTypeHeaderValue(validation.CanonicalMimeType);
            request.Content = content;

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(request, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError("Network error during avatar upload for user {UserId}: {Message}", userId, ex.Message);
                throw new InvalidOperationException("Failed to reach Supabase Storage service. Please try again later.");
            }

            if (!response.IsSuccessStatusCode)
            {
                string rawError = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Supabase upload failed for user {UserId} with status {StatusCode}: {Error}", userId, response.StatusCode, rawError);

                // Sanitize error message to never expose internal keys or tokens
                throw new InvalidOperationException(
                    $"Supabase storage upload failed with status code {response.StatusCode}. Please verify bucket configuration and permissions."
                );
            }

            // 5. Construct public URL with timestamp cache buster
            string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            return GetPublicAvatarUrl(targetPath, timestamp);
        }

        /// <inheritdoc />
        public async Task<bool> DeleteAvatarAsync(int userId, CancellationToken cancellationToken = default)
        {
            if (userId <= 0) return false;
            EnsureConfigured();

            bool deletedAny = false;
            foreach (var ext in PossibleExtensions)
            {
                string path = $"{userId}/avatar{ext}";
                bool result = await TryDeleteObjectPathAsync(path, cancellationToken);
                if (result) deletedAny = true;
            }

            return deletedAny;
        }

        /// <inheritdoc />
        public string GetPublicAvatarUrl(string storagePath, string? cacheBuster = null)
        {
            if (string.IsNullOrWhiteSpace(storagePath)) return string.Empty;

            string baseUrl = _options.Url.TrimEnd('/');
            string bucket = _options.AvatarBucket;
            string cleanPath = storagePath.TrimStart('/');

            string url = $"{baseUrl}/storage/v1/object/public/{bucket}/{cleanPath}";
            if (!string.IsNullOrWhiteSpace(cacheBuster))
            {
                url += $"?v={cacheBuster}";
            }

            return url;
        }

        private async Task<bool> TryDeleteObjectPathAsync(string objectPath, CancellationToken cancellationToken)
        {
            try
            {
                string baseUrl = _options.Url.TrimEnd('/');
                string bucket = _options.AvatarBucket;
                string deleteUrl = $"{baseUrl}/storage/v1/object/{bucket}/{objectPath}";

                using var request = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
                request.Headers.Add("apikey", _options.ServiceRoleKey);

                var response = await _httpClient.SendAsync(request, cancellationToken);
                return response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NotFound;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to clean up avatar path {Path}: {Message}", objectPath, ex.Message);
                return false;
            }
        }
    }
}
