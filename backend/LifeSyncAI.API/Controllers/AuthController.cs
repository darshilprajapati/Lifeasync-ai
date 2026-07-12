using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Responses;
using Serilog;

namespace LifeSyncAI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthenticationService _authService;
        private readonly IUserService _userService;
        private readonly LifeSyncAI.Core.Database.ApplicationDbContext _context;

        public AuthController(IAuthenticationService authService, IUserService userService, LifeSyncAI.Core.Database.ApplicationDbContext context)
        {
            _authService = authService;
            _userService = userService;
            _context = context;
        }

        [HttpPost("register")]
        public async Task<ActionResult<ApiResponse<UserDto>>> Register([FromBody] RegisterDto dto)
        {
            var result = await _authService.RegisterAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<ActionResult<ApiResponse<UserDto>>> Login([FromBody] LoginDto dto)
        {
            var result = await _authService.LoginAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            // Set tokens in HttpOnly Cookies
            SetTokenCookies(result.Data.AccessToken, result.Data.RefreshToken);

            // Return user details without exposing tokens in response body
            var response = ApiResponse<UserDto>.Success(result.Data.User, result.Message);
            return Ok(response);
        }

        [HttpPost("refresh")]
        public async Task<ActionResult<ApiResponse<bool>>> Refresh()
        {
            // Read tokens from HttpOnly Cookies
            var expiredToken = Request.Cookies["accessToken"];
            var refreshToken = Request.Cookies["refreshToken"];

            if (string.IsNullOrEmpty(expiredToken) || string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized(ApiResponse<bool>.Fail("Missing credentials in cookies."));
            }

            var result = await _authService.RefreshTokenAsync(expiredToken, refreshToken);
            if (!result.IsSuccess)
            {
                // Clear invalid cookies
                ClearTokenCookies();
                return Unauthorized(ApiResponse<bool>.Fail(result.Message));
            }

            // Set new rotated cookies
            SetTokenCookies(result.Data.AccessToken, result.Data.RefreshToken);

            return Ok(ApiResponse<bool>.Success(true, "Tokens refreshed successfully."));
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<ActionResult<ApiResponse<bool>>> Logout()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return BadRequest(ApiResponse<bool>.Fail("Invalid user claim."));
            }

            var result = await _authService.LogoutAsync(userId);
            
            // Always clear cookies during logout
            ClearTokenCookies();

            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<UserDto>.Fail("Unauthorized access."));
            }

            var result = await _userService.GetUserByIdAsync(userId);
            if (!result.IsSuccess)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            Log.Information($"UpdateProfile called. FullName={dto.FullName}, ProfilePhoto length={dto.ProfilePhoto?.Length ?? 0}");
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<UserDto>.Fail("Unauthorized access."));
            }

            var result = await _userService.UpdateProfileAsync(userId, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpGet("profile/stats")]
        public async Task<ActionResult<ApiResponse<Dictionary<string, int>>>> GetProfileStats()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<Dictionary<string, int>>.Fail("Unauthorized access."));
            }

            var result = await _userService.GetUserActivityStatsAsync(userId);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult<ApiResponse<bool>>> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var result = await _authService.RequestForgotPasswordOtpAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(_context.Users, u => u.Email == dto.Email.ToLower().Trim());
            if (user != null && !string.IsNullOrEmpty(user.Otp))
            {
                Response.Headers.Append("X-Demo-OTP", user.Otp);
            }

            return Ok(result);
        }

        [HttpPost("verify-otp")]
        public async Task<ActionResult<ApiResponse<bool>>> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            var result = await _authService.VerifyOtpAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult<ApiResponse<bool>>> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var result = await _authService.ResetPasswordWithOtpAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        private void SetTokenCookies(string accessToken, string refreshToken)
        {
            var isHttps = !Request.Host.Host.Contains("localhost") && !Request.Host.Host.Contains("127.0.0.1");
            var sameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax;
            var secure = isHttps;

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Expires = DateTime.UtcNow.AddDays(7) // Align with refresh token duration
            };

            var accessCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Expires = DateTime.UtcNow.AddMinutes(15) // Align with short-lived access token duration
            };

            Response.Cookies.Append("accessToken", accessToken, accessCookieOptions);
            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
        }

        private void ClearTokenCookies()
        {
            var isHttps = !Request.Host.Host.Contains("localhost") && !Request.Host.Host.Contains("127.0.0.1");
            var sameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax;
            var secure = isHttps;

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite
            };

            Response.Cookies.Delete("accessToken", cookieOptions);
            Response.Cookies.Delete("refreshToken", cookieOptions);
        }
    }
}
