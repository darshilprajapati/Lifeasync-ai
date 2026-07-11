using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.DTO.Output;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    /// <summary>
    /// Service contract handling user registration, authentication, token rotation, and sign-out.
    /// </summary>
    public interface IAuthenticationService
    {
        /// <summary>
        /// Registers a new user. The account starts in a 'Pending' status.
        /// </summary>
        Task<ApiResponse<UserDto>> RegisterAsync(RegisterDto dto);

        /// <summary>
        /// Authenticates user credentials. Returns user details alongside generated access/refresh tokens.
        /// </summary>
        Task<ApiResponse<(UserDto User, string AccessToken, string RefreshToken)>> LoginAsync(LoginDto dto);

        /// <summary>
        /// Validates expired access tokens and active refresh tokens to issue a rotated token pair.
        /// </summary>
        Task<ApiResponse<(string AccessToken, string RefreshToken)>> RefreshTokenAsync(string expiredToken, string refreshToken);

        /// <summary>
        /// Revokes the active refresh token, signing the user out.
        /// </summary>
        Task<ApiResponse<bool>> LogoutAsync(int userId);

        /// <summary>
        /// Requests a 6-digit OTP code for forgot password.
        /// </summary>
        Task<ApiResponse<bool>> RequestForgotPasswordOtpAsync(ForgotPasswordDto dto);

        /// <summary>
        /// Verifies if the provided OTP code is valid and not expired.
        /// </summary>
        Task<ApiResponse<bool>> VerifyOtpAsync(VerifyOtpDto dto);

        /// <summary>
        /// Resets the user's password if the OTP code is correct and not expired.
        /// </summary>
        Task<ApiResponse<bool>> ResetPasswordWithOtpAsync(ResetPasswordDto dto);
    }
}
