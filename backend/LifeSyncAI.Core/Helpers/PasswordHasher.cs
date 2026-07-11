namespace LifeSyncAI.Core.Helpers
{
    /// <summary>
    /// Utility helper for hashing and verifying passwords securely using BCrypt.
    /// </summary>
    public static class PasswordHasher
    {
        /// <summary>
        /// Generates a secure hash of the password.
        /// </summary>
        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        /// <summary>
        /// Verifies a plain-text password against a hashed version.
        /// </summary>
        public static bool VerifyPassword(string password, string hashedPassword)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }
    }
}
