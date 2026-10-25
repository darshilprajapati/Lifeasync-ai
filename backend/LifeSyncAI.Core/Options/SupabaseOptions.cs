using System;

namespace LifeSyncAI.Core.Options
{
    /// <summary>
    /// Configuration options for Supabase Storage integration.
    /// Values are loaded from "Supabase:Url", "Supabase:ServiceRoleKey", and "Supabase:AvatarBucket".
    /// </summary>
    public class SupabaseOptions
    {
        public const string SectionName = "Supabase";

        /// <summary>
        /// Supabase Project URL (e.g., https://your-project.supabase.co).
        /// </summary>
        public string Url { get; set; } = string.Empty;

        /// <summary>
        /// Supabase Service Role Secret Key used strictly on the server-side for authenticated storage administration.
        /// NEVER expose this to clients or logs.
        /// </summary>
        public string ServiceRoleKey { get; set; } = string.Empty;

        /// <summary>
        /// Name of the Supabase storage bucket used for avatars (defaults to "avatars").
        /// </summary>
        public string AvatarBucket { get; set; } = "avatars";

        /// <summary>
        /// Returns true if all mandatory Supabase settings are present and non-empty.
        /// </summary>
        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(Url) &&
            !string.IsNullOrWhiteSpace(ServiceRoleKey) &&
            !string.IsNullOrWhiteSpace(AvatarBucket);
    }
}
