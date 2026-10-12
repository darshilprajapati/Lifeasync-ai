using System;
using System.Threading;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Tests.Helpers
{
    /// <summary>
    /// Centralized factory for generating isolated, collision-free test user identities.
    /// Every generated user has a distinct, guaranteed-unique username and email address.
    /// Thread-safe for parallel test execution.
    /// </summary>
    public static class TestUserFactory
    {
        private static long _sequenceCounter;

        /// <summary>
        /// Generates a globally unique test email using timestamp, atomic counter, and random GUID.
        /// Uses the standard test domain 'example.com'.
        /// </summary>
        public static string GenerateUniqueEmail(string prefix = "testuser")
        {
            var seq = Interlocked.Increment(ref _sequenceCounter);
            var ticks = DateTime.UtcNow.Ticks;
            var guid = Guid.NewGuid().ToString("N").Substring(0, 8);
            return $"{prefix}_{ticks}_{seq}_{guid}@example.com".ToLowerInvariant();
        }

        /// <summary>
        /// Generates a unique display username.
        /// </summary>
        public static string GenerateUniqueUsername(string prefix = "TestUser")
        {
            var seq = Interlocked.Increment(ref _sequenceCounter);
            var guid = Guid.NewGuid().ToString("N").Substring(0, 6);
            return $"{prefix}_{guid}_{seq}";
        }

        /// <summary>
        /// Creates a unique RegisterDto with distinct username and email.
        /// </summary>
        public static RegisterDto CreateUniqueRegisterDto(string prefix = "testuser", string password = "SecurePassword123!")
        {
            return new RegisterDto
            {
                FullName = GenerateUniqueUsername(prefix),
                Email = GenerateUniqueEmail(prefix),
                Password = password
            };
        }

        /// <summary>
        /// Creates a persistent User model entity with unique credentials.
        /// </summary>
        public static User CreateTestUserEntity(string prefix = "testuser", string password = "SecurePassword123!", UserRole role = UserRole.User)
        {
            return new User
            {
                FullName = GenerateUniqueUsername(prefix),
                Email = GenerateUniqueEmail(prefix),
                PasswordHash = PasswordHasher.HashPassword(password),
                Role = role,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "TestUserFactory"
            };
        }
    }
}
