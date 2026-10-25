using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    /// <summary>
    /// Service contract for managing user avatar assets in Supabase Storage.
    /// </summary>
    public interface ISupabaseStorageService
    {
        /// <summary>
        /// Indicates whether Supabase Storage credentials and bucket options are configured.
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Validates, prepares, and uploads a user's avatar image to Supabase Storage at a deterministic path.
        /// </summary>
        /// <param name="userId">The authenticated user's ID.</param>
        /// <param name="fileStream">Readable stream of image bytes.</param>
        /// <param name="fileName">Original or suggested file name with extension.</param>
        /// <param name="contentType">Reported MIME content type.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Public URL for the uploaded avatar image.</returns>
        Task<string> UploadAvatarAsync(int userId, Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default);

        /// <summary>
        /// Removes a user's avatar image from Supabase Storage.
        /// </summary>
        /// <param name="userId">The authenticated user's ID.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if deleted or was already absent; otherwise false.</returns>
        Task<bool> DeleteAvatarAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Constructs the public CDN URL for an avatar path in the Supabase bucket.
        /// </summary>
        /// <param name="storagePath">Object path within the avatar bucket.</param>
        /// <param name="cacheBuster">Optional version or timestamp to bypass browser cache.</param>
        string GetPublicAvatarUrl(string storagePath, string? cacheBuster = null);
    }
}
