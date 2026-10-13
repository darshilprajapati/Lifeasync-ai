namespace LifeSyncAI.Core.Helpers
{
    /// <summary>
    /// Utility helper for hashing and verifying passwords securely using BCrypt.
    /// </summary>
    public static class PasswordHasher
    {
        // OWASP recommended baseline work factor of 10 for interactive logins (~1024 rounds).
        // Provides strong password resistance while eliminating excessive CPU latency.
        private const int WorkFactor = 10;

        /// <summary>
        /// Generates a secure hash of the password.
        /// </summary>
        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: WorkFactor);
        }

        /// <summary>
        /// Verifies a plain-text password against a hashed version.
        /// Backward-compatible with hashes created at any previous work factor.
        /// </summary>
        public static bool VerifyPassword(string password, string hashedPassword)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }
    }
}
