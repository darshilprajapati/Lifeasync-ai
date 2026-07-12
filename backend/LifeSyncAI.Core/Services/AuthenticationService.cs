using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Service managing authentication processes: signing up, credentials matching, and secure token rotation.
    /// </summary>
    public class AuthenticationService : IAuthenticationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthenticationService(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterDto dto)
        {
            var targetEmail = dto.Email.ToLower().Trim();

            // 1. Enforce strict single-registration constraints
            var emailExists = await _context.Users
                .IgnoreQueryFilters() // check soft-deleted too to prevent SQL unique index collisions
                .AnyAsync(u => u.Email == targetEmail);

            if (emailExists)
            {
                return ApiResponse<UserDto>.Fail("A user with this email address already exists.");
            }

            // 2. Internet Domain Active Check via DNS lookup
            var emailParts = targetEmail.Split('@');
            if (emailParts.Length != 2)
            {
                return ApiResponse<UserDto>.Fail("Invalid email address format.");
            }
            var domain = emailParts[1];

            try
            {
                var addresses = await System.Net.Dns.GetHostAddressesAsync(domain);
                if (addresses == null || addresses.Length == 0)
                {
                    return ApiResponse<UserDto>.Fail($"The email domain '{domain}' does not exist on the internet.");
                }
            }
            catch (Exception)
            {
                return ApiResponse<UserDto>.Fail($"The email domain '{domain}' is invalid or does not exist on the internet.");
            }

            var newUser = new User
            {
                FullName = dto.FullName.Trim(),
                Email = targetEmail,
                PasswordHash = PasswordHasher.HashPassword(dto.Password),
                Role = UserRole.User,          // Default user signup role
                Status = UserStatus.Pending,   // Must be approved by Admin
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "SelfRegistration"
            };

            await _context.Users.AddAsync(newUser);
            await _context.SaveChangesAsync();

            var userDto = MapToDto(newUser);
            return ApiResponse<UserDto>.Success(userDto, "Registration request submitted. Account is pending administrator approval.");
        }

        public async Task<ApiResponse<(UserDto User, string AccessToken, string RefreshToken)>> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());

            if (user == null || !PasswordHasher.VerifyPassword(dto.Password, user.PasswordHash))
            {
                return ApiResponse<(UserDto, string, string)>.Fail("Invalid email or password.");
            }

            if (user.Status == UserStatus.Pending)
            {
                return ApiResponse<(UserDto, string, string)>.Fail("Your account is pending administrator approval.");
            }

            if (user.Status == UserStatus.Inactive)
            {
                return ApiResponse<(UserDto, string, string)>.Fail("Your account has been deactivated. Please contact support.");
            }

            // Retrieve JWT configurations
            var jwtSection = _configuration.GetSection("JwtSettings");
            var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured.");
            var issuer = jwtSection["Issuer"] ?? "LifeSyncAI_API";
            var audience = jwtSection["Audience"] ?? "LifeSyncAI_Client";
            var expiryMin = int.Parse(jwtSection["ExpiryMinutes"] ?? "15");
            var refreshDays = int.Parse(jwtSection["RefreshTokenExpiryDays"] ?? "7");

            // Generate Token Pair
            var accessToken = JwtHelper.GenerateAccessToken(user, secret, issuer, audience, expiryMin);
            var refreshToken = JwtHelper.GenerateRefreshToken();

            // Persist refresh token details
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshDays);
            
            await _context.SaveChangesAsync();

            var userDto = MapToDto(user);
            return ApiResponse<(UserDto, string, string)>.Success((userDto, accessToken, refreshToken), "Logged in successfully.");
        }

        public async Task<ApiResponse<(string AccessToken, string RefreshToken)>> RefreshTokenAsync(string expiredToken, string refreshToken)
        {
            var jwtSection = _configuration.GetSection("JwtSettings");
            var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured.");
            
            // Extract claims from the expired token
            var principal = JwtHelper.GetPrincipalFromExpiredToken(expiredToken, secret);
            if (principal == null)
            {
                return ApiResponse<(string, string)>.Fail("Invalid access token signature.");
            }

            var emailClaim = principal.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(emailClaim))
            {
                return ApiResponse<(string, string)>.Fail("Access token missing email claim.");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == emailClaim);

            if (user == null || user.RefreshToken != refreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                return ApiResponse<(string, string)>.Fail("Invalid or expired refresh token.");
            }

            if (user.Status != UserStatus.Active)
            {
                return ApiResponse<(string, string)>.Fail("User status is no longer active.");
            }

            // Generate new rotated tokens
            var issuer = jwtSection["Issuer"] ?? "LifeSyncAI_API";
            var audience = jwtSection["Audience"] ?? "LifeSyncAI_Client";
            var expiryMin = int.Parse(jwtSection["ExpiryMinutes"] ?? "15");
            var refreshDays = int.Parse(jwtSection["RefreshTokenExpiryDays"] ?? "7");

            var newAccessToken = JwtHelper.GenerateAccessToken(user, secret, issuer, audience, expiryMin);
            var newRefreshToken = JwtHelper.GenerateRefreshToken();

            // Rotate refresh token
            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(refreshDays);

            await _context.SaveChangesAsync();

            return ApiResponse<(string, string)>.Success((newAccessToken, newRefreshToken), "Tokens rotated successfully.");
        }

        public async Task<ApiResponse<bool>> LogoutAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.Fail("User not found.");
            }

            // Invalidate refresh token
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;

            await _context.SaveChangesAsync();
            return ApiResponse<bool>.Success(true, "Logged out successfully.");
        }

        public async Task<ApiResponse<bool>> RequestForgotPasswordOtpAsync(ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());
            if (user == null)
            {
                return ApiResponse<bool>.Fail("No registered account found with this email address.");
            }

            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();
            
            user.Otp = otp;
            user.OtpExpiryTime = DateTime.UtcNow.AddMinutes(15);

            await _context.SaveChangesAsync();

            string subject = "LifeSync AI - Your Password Reset OTP Code";
            string body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px;'>
                    <h2 style='color: #4f46e5; margin-bottom: 20px;'>LifeSync AI Password Reset</h2>
                    <p>Hello {user.FullName},</p>
                    <p>We received a request to reset your password. Use the following 6-digit One-Time Password (OTP) to proceed:</p>
                    <div style='background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0;'>
                        <span style='font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;'>{otp}</span>
                    </div>
                    <p style='color: #6b7280; font-size: 14px;'>This OTP code is valid for <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
                    <hr style='border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                    <p style='font-size: 12px; color: #9ca3af;'>This is an automated system notification. Please do not reply directly to this email.</p>
                </div>";

            try
            {
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch (Exception ex)
            {
                // Gracefully handle SMTP delivery failure
                return ApiResponse<bool>.Fail($"Failed to send verification email. Details: {ex.Message}");
            }

            return ApiResponse<bool>.Success(true, "A one-time password has been sent to your email address.");
        }

        public async Task<ApiResponse<bool>> VerifyOtpAsync(VerifyOtpDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());
            if (user == null)
            {
                return ApiResponse<bool>.Fail("Invalid email address.");
            }

            if (string.IsNullOrEmpty(user.Otp) || user.Otp != dto.Otp.Trim())
            {
                return ApiResponse<bool>.Fail("The OTP code is incorrect.");
            }

            if (user.OtpExpiryTime == null || user.OtpExpiryTime < DateTime.UtcNow)
            {
                return ApiResponse<bool>.Fail("The OTP code has expired. Please request a new one.");
            }

            return ApiResponse<bool>.Success(true, "OTP verified successfully.");
        }

        public async Task<ApiResponse<bool>> ResetPasswordWithOtpAsync(ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());
            if (user == null)
            {
                return ApiResponse<bool>.Fail("Invalid email address.");
            }

            if (string.IsNullOrEmpty(user.Otp) || user.Otp != dto.Otp.Trim())
            {
                return ApiResponse<bool>.Fail("The OTP code is incorrect.");
            }

            if (user.OtpExpiryTime == null || user.OtpExpiryTime < DateTime.UtcNow)
            {
                return ApiResponse<bool>.Fail("The OTP code has expired. Please request a new one.");
            }

            user.PasswordHash = PasswordHasher.HashPassword(dto.NewPassword);
            user.Otp = null;
            user.OtpExpiryTime = null;

            await _context.SaveChangesAsync();

            return ApiResponse<bool>.Success(true, "Your password has been successfully reset. Please log in with your new password.");
        }

        private static UserDto MapToDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role.ToString(),
                Status = user.Status.ToString(),
                ProfilePhoto = user.ProfilePhoto
            };
        }
    }
}
