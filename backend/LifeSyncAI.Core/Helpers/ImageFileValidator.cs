using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace LifeSyncAI.Core.Helpers
{
    public class ImageValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public string NormalizedExtension { get; set; } = string.Empty;
        public string CanonicalMimeType { get; set; } = string.Empty;
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();
    }

    /// <summary>
    /// Validates avatar image uploads according to size, format, extension, and binary magic bytes.
    /// Supports JPEG, PNG, and WebP formats up to 5 MB.
    /// </summary>
    public static class ImageFileValidator
    {
        public const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        private static readonly byte[] JpegHeader = new byte[] { 0xFF, 0xD8, 0xFF };
        private static readonly byte[] PngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        private static readonly byte[] RiffHeader = new byte[] { 0x52, 0x49, 0x46, 0x46 }; // "RIFF"
        private static readonly byte[] WebpHeader = new byte[] { 0x57, 0x45, 0x42, 0x50 }; // "WEBP"

        public static async Task<ImageValidationResult> ValidateImageStreamAsync(
            Stream stream,
            string fileName,
            string? reportedContentType,
            CancellationToken cancellationToken = default)
        {
            if (stream == null)
            {
                return new ImageValidationResult { IsValid = false, ErrorMessage = "Image content is required." };
            }

            // Read the full stream into memory for inspection and subsequent upload
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, cancellationToken);
            var bytes = ms.ToArray();

            if (bytes.Length == 0)
            {
                return new ImageValidationResult { IsValid = false, ErrorMessage = "Image file is empty." };
            }

            if (bytes.Length > MaxFileSizeBytes)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Image size ({bytes.Length / (1024 * 1024.0):F2} MB) exceeds maximum allowed limit of 5 MB."
                };
            }

            // Validate extension
            var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(ext) || !(ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp"))
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Unsupported file extension. Allowed formats are JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp)."
                };
            }

            // Validate MIME type if supplied
            if (!string.IsNullOrWhiteSpace(reportedContentType))
            {
                var lowerMime = reportedContentType.Trim().ToLowerInvariant();
                if (lowerMime != "image/jpeg" && lowerMime != "image/pjpeg" && lowerMime != "image/png" && lowerMime != "image/webp")
                {
                    return new ImageValidationResult
                    {
                        IsValid = false,
                        ErrorMessage = $"Unsupported MIME type '{reportedContentType}'. Allowed types: image/jpeg, image/png, image/webp."
                    };
                }
            }

            // Inspect binary magic bytes
            var detectedFormat = DetectImageFormat(bytes);
            if (detectedFormat == null)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "File content signature is invalid or does not match a supported image format (JPEG, PNG, WebP)."
                };
            }

            // Verify extension matches detected magic bytes
            if (detectedFormat == "jpeg" && ext != ".jpg" && ext != ".jpeg")
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "File extension does not match the actual JPEG image signature."
                };
            }
            if (detectedFormat == "png" && ext != ".png")
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "File extension does not match the actual PNG image signature."
                };
            }
            if (detectedFormat == "webp" && ext != ".webp")
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "File extension does not match the actual WebP image signature."
                };
            }

            string normalizedExt = detectedFormat == "jpeg" ? ".jpg" : (detectedFormat == "png" ? ".png" : ".webp");
            string canonicalMime = detectedFormat == "jpeg" ? "image/jpeg" : (detectedFormat == "png" ? "image/png" : "image/webp");

            return new ImageValidationResult
            {
                IsValid = true,
                NormalizedExtension = normalizedExt,
                CanonicalMimeType = canonicalMime,
                FileBytes = bytes
            };
        }

        public static string? DetectImageFormat(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 12) return null;

            // JPEG check (starts with FF D8 FF)
            if (bytes[0] == JpegHeader[0] && bytes[1] == JpegHeader[1] && bytes[2] == JpegHeader[2])
            {
                return "jpeg";
            }

            // PNG check (starts with 89 50 4E 47 0D 0A 1A 0A)
            if (bytes.Length >= PngHeader.Length && MatchesPattern(bytes, 0, PngHeader))
            {
                return "png";
            }

            // WebP check (RIFF at 0..3 and WEBP at 8..11)
            if (MatchesPattern(bytes, 0, RiffHeader) && MatchesPattern(bytes, 8, WebpHeader))
            {
                return "webp";
            }

            return null;
        }

        private static bool MatchesPattern(byte[] source, int offset, byte[] pattern)
        {
            if (source.Length < offset + pattern.Length) return false;
            for (int i = 0; i < pattern.Length; i++)
            {
                if (source[offset + i] != pattern[i]) return false;
            }
            return true;
        }
    }
}
