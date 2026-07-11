using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Implementation of IUserService managing database operations on User entities.
    /// </summary>
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;

        public UserService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<UserDto>> GetUserByIdAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return ApiResponse<UserDto>.Fail("User not found.");
            }

            var dto = MapToDto(user);
            return ApiResponse<UserDto>.Success(dto, "User retrieved successfully.");
        }

        public async Task<ApiResponse<List<UserDto>>> GetPendingUsersAsync()
        {
            var users = await _context.Users
                .Where(u => u.Status == UserStatus.Pending && u.Email != "gdarshil1203@gmail.com")
                .OrderBy(u => u.CreatedAt)
                .ToListAsync();

            var dtos = users.Select(MapToDto).ToList();
            return ApiResponse<List<UserDto>>.Success(dtos, "Pending users retrieved successfully.");
        }

        public async Task<ApiResponse<bool>> ApproveUserAsync(int userId, string approvedBy)
        {
            return await UpdateUserStatusAsync(userId, UserStatus.Active, approvedBy);
        }

        public async Task<ApiResponse<bool>> UpdateUserStatusAsync(int userId, UserStatus status, string updatedBy)
        {
            var user = await _context.Users
                .IgnoreQueryFilters() // In case they were soft-deleted, we don't want to lose track
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return ApiResponse<bool>.Fail("User not found.");
            }

            user.Status = status;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();
            return ApiResponse<bool>.Success(true, $"User status successfully updated to {status}.");
        }

        public async Task<ApiResponse<List<UserDto>>> GetAllUsersAsync()
        {
            var users = await _context.Users
                .Where(u => u.Email != "gdarshil1203@gmail.com")
                .OrderBy(u => u.FullName)
                .ToListAsync();

            var dtos = users.Select(MapToDto).ToList();
            return ApiResponse<List<UserDto>>.Success(dtos, "All users retrieved successfully.");
        }

        public async Task<ApiResponse<bool>> ResetUserPasswordAsync(int userId, string newPassword, string updatedBy)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.Fail("User not found.");
            }

            user.PasswordHash = Helpers.PasswordHasher.HashPassword(newPassword);
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();
            return ApiResponse<bool>.Success(true, "User password successfully reset.");
        }

        public async Task<ApiResponse<bool>> UpdateUserRoleAsync(int userId, UserRole role, string updatedBy)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return ApiResponse<bool>.Fail("User not found.");
            }

            if (user.Email == "gdarshil1203@gmail.com")
            {
                return ApiResponse<bool>.Fail("Cannot modify the role of the System Admin.");
            }

            user.Role = role;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();
            return ApiResponse<bool>.Success(true, $"User role successfully updated to {role}.");
        }

        public async Task<ApiResponse<Dictionary<string, int>>> GetUserActivityStatsAsync(int userId)
        {
            var plannerCount = await _context.PlannerEvents.Where(e => e.UserId == userId).CountAsync();
            var financeCount = await _context.Transactions.Where(t => t.UserId == userId).CountAsync();
            var healthCount = await _context.HealthLogs.Where(l => l.UserId == userId).CountAsync();
            var careerCount = await _context.JobApplications.Where(a => a.UserId == userId).CountAsync();
            var vaultCount = await _context.VaultItems.Where(v => v.UserId == userId).CountAsync();
            var insightsCount = await _context.AiRecommendations.Where(r => r.UserId == userId).CountAsync();

            var stats = new Dictionary<string, int>
            {
                { "Planner Events", plannerCount },
                { "Finance Transactions", financeCount },
                { "Health Logs", healthCount },
                { "Job Applications", careerCount },
                { "Vault Items", vaultCount },
                { "AI Insights", insightsCount }
            };

            return ApiResponse<Dictionary<string, int>>.Success(stats, "User activity stats loaded successfully.");
        }

        public async Task<ApiResponse<UserDto>> UpdateProfileAsync(int userId, DTO.Input.UpdateProfileDto dto)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return ApiResponse<UserDto>.Fail("User not found.");
                }

                user.FullName = dto.FullName;
                user.ProfilePhoto = dto.ProfilePhoto;
                
                user.UpdatedAt = DateTime.UtcNow;
                user.UpdatedBy = "Self";

                await _context.SaveChangesAsync();
                var resultDto = MapToDto(user);
                return ApiResponse<UserDto>.Success(resultDto, "Profile updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<UserDto>.Fail($"Failed to update profile: {ex.Message}");
            }
        }

        private static UserDto MapToDto(Models.User user)
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
