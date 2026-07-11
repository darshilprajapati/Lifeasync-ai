using System;
using LifeSyncAI.Core.Enums;

namespace LifeSyncAI.Core.Models
{
    /// <summary>
    /// Database entity representing a registered system user.
    /// </summary>
    public class User : BaseEntity
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? ProfilePhoto { get; set; }
        
        public UserRole Role { get; set; } = UserRole.User;
        public UserStatus Status { get; set; } = UserStatus.Pending;

        // JWT Refresh Token fields
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        // OTP fields for Forgot Password / MFA
        public string? Otp { get; set; }
        public DateTime? OtpExpiryTime { get; set; }
    }
}
