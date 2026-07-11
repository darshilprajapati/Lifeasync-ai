using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.DTO.Output.Health;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IWellnessForecasterService
    {
        Task<ApiResponse<WellnessForecastDto>> ForecastWellnessScoreAsync(int userId, WellnessForecastInputDto input);
    }
}
