using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.DTO.Output.Health;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IHealthService
    {
        Task<ApiResponse<List<HealthLogDto>>> GetLogsAsync(int userId, System.DateTime clientDate);
        Task<ApiResponse<HealthLogDto>> CreateLogAsync(CreateHealthLogDto dto, int userId, System.DateTime clientDate);
        Task<ApiResponse<bool>> DeleteLogAsync(int id);
    }
}
