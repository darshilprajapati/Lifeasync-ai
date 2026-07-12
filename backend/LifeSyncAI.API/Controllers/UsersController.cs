using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetPendingUsers()
        {
            var result = await _userService.GetPendingUsersAsync();
            return Ok(result);
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PaginatedUsersDto>>> GetAllUsers(
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _userService.GetPaginatedUsersAsync(search, page, pageSize);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(int id)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "SystemAdmin";
            var result = await _userService.DeleteUserAsync(id, adminEmail);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> ApproveUser(int id)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "SystemAdmin";
            var result = await _userService.ApproveUserAsync(id, adminEmail);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/status")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateUserStatus(int id, [FromBody] UserStatus status)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "SystemAdmin";
            var result = await _userService.UpdateUserStatusAsync(id, status, adminEmail);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/reset-password")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetPassword(int id, [FromBody] ResetPasswordRequest request)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "SystemAdmin";
            var result = await _userService.ResetUserPasswordAsync(id, request.NewPassword, adminEmail);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("{id}/role")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateUserRole(int id, [FromBody] UserRole role)
        {
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "SystemAdmin";
            var result = await _userService.UpdateUserRoleAsync(id, role, adminEmail);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("{id}/activity-stats")]
        public async Task<ActionResult<ApiResponse<Dictionary<string, int>>>> GetUserActivityStats(int id)
        {
            var result = await _userService.GetUserActivityStatsAsync(id);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
    }

    public class ResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}
