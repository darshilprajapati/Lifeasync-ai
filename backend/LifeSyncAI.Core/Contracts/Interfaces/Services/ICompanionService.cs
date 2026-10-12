using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Companion;
using LifeSyncAI.Core.DTO.Output.Companion;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface ICompanionService
    {
        Task<ApiResponse<CompanionResponseDto>> ProcessMessageAsync(int userId, CompanionRequestDto dto, string? clientDateHeader);
        ApiResponse<string> ResetSession(int userId);
    }
}
