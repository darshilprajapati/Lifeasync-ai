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
        private readonly IReportRepository _reportRepository;

        public UserService(ApplicationDbContext context, IReportRepository reportRepository)
        {
            _context = context;
            _reportRepository = reportRepository;
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

        public async Task<ApiResponse<PaginatedUsersDto>> GetPaginatedUsersAsync(string? search, int page, int pageSize)
        {
            try
            {
                var query = _context.Users
                    .Where(u => u.Email != "gdarshil1203@gmail.com");

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var searchLower = search.ToLower().Trim();
                    query = query.Where(u => u.FullName.ToLower().Contains(searchLower) || u.Email.ToLower().Contains(searchLower));
                }

                var totalCount = await query.CountAsync();

                var users = await query
                    .OrderBy(u => u.FullName)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var dtos = users.Select(MapToDto).ToList();
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var result = new PaginatedUsersDto
                {
                    Users = dtos,
                    TotalCount = totalCount,
                    PageNumber = page,
                    PageSize = pageSize,
                    TotalPages = totalPages == 0 ? 1 : totalPages
                };

                return ApiResponse<PaginatedUsersDto>.Success(result, "Users retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PaginatedUsersDto>.Fail($"Failed to load users: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteUserAsync(int userId, string deletedBy)
        {
            var user = await _context.Users
                .IgnoreQueryFilters() // In case they were soft-deleted
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return ApiResponse<bool>.Fail("User not found.");
            }

            if (user.Email == "gdarshil1203@gmail.com")
            {
                return ApiResponse<bool>.Fail("Cannot delete the System Admin.");
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // Delete associated user data first to avoid database junk or foreign keys constraint blocks
                    var plannerEvents = _context.PlannerEvents.Where(e => e.UserId == userId);
                    _context.PlannerEvents.RemoveRange(plannerEvents);

                    var transactions = _context.Transactions.Where(t => t.UserId == userId);
                    _context.Transactions.RemoveRange(transactions);

                    var healthLogs = _context.HealthLogs.Where(l => l.UserId == userId);
                    _context.HealthLogs.RemoveRange(healthLogs);

                    var jobApps = _context.JobApplications.Where(a => a.UserId == userId);
                    _context.JobApplications.RemoveRange(jobApps);

                    var vaultItems = _context.VaultItems.Where(v => v.UserId == userId);
                    _context.VaultItems.RemoveRange(vaultItems);

                    var recommendations = _context.AiRecommendations.Where(r => r.UserId == userId);
                    _context.AiRecommendations.RemoveRange(recommendations);

                    var recurringItems = _context.RecurringItems.Where(r => r.UserId == userId);
                    _context.RecurringItems.RemoveRange(recurringItems);

                    // Delete the user record permanently
                    _context.Users.Remove(user);

                    // Clean up cached and physical PDF reports from server
                    _reportRepository.DeleteByUserId(userId);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return ApiResponse<bool>.Success(true, "User account and all associated data permanently deleted.");
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return ApiResponse<bool>.Fail($"Failed to delete user: {ex.Message}");
                }
            }
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
