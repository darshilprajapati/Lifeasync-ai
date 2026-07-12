using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    /// <summary>
    /// Service contract handling user retrieval, admin approvals, and status modifications.
    /// </summary>
    public interface IUserService
    {
        /// <summary>
        /// Retrieves a user by their unique database identifier.
        /// </summary>
        Task<ApiResponse<UserDto>> GetUserByIdAsync(int id);

        /// <summary>
        /// Retrieves all users whose status is currently 'Pending'. Used by Admins.
        /// </summary>
        Task<ApiResponse<List<UserDto>>> GetPendingUsersAsync();

        /// <summary>
        /// Retrieves users in the system with optional search and pagination. Used by Admins.
        /// </summary>
        Task<ApiResponse<PaginatedUsersDto>> GetPaginatedUsersAsync(string? search, int page, int pageSize);

        /// <summary>
        /// Permanently deletes a user and all associated records from the system.
        /// </summary>
        Task<ApiResponse<bool>> DeleteUserAsync(int userId, string deletedBy);

        /// <summary>
        /// Approves a pending user registration, changing their status to 'Active'.
        /// </summary>
        Task<ApiResponse<bool>> ApproveUserAsync(int userId, string approvedBy);

        /// <summary>
        /// Modifies a user's status (Active, Inactive, Pending).
        /// </summary>
        Task<ApiResponse<bool>> UpdateUserStatusAsync(int userId, UserStatus status, string updatedBy);

        /// <summary>
        /// Resets a user's password. Used by Admins.
        /// </summary>
        Task<ApiResponse<bool>> ResetUserPasswordAsync(int userId, string newPassword, string updatedBy);

        /// <summary>
        /// Modifies a user's security role (User, Admin). Used by Admins.
        /// </summary>
        Task<ApiResponse<bool>> UpdateUserRoleAsync(int userId, UserRole role, string updatedBy);

        /// <summary>
        /// Retrieves usage activity log statistics counts for a specific user. Used by Admins.
        /// </summary>
        Task<ApiResponse<Dictionary<string, int>>> GetUserActivityStatsAsync(int userId);

        /// <summary>
        /// Updates a user's display name and profile photo.
        /// </summary>
        Task<ApiResponse<UserDto>> UpdateProfileAsync(int userId, DTO.Input.UpdateProfileDto dto);
    }
}
