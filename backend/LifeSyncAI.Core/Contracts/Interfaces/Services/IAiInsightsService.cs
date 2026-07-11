using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Output.AiInsights;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IAiInsightsService
    {
        Task<ApiResponse<List<AiRecommendationDto>>> GetRecommendationsAsync(int userId);
        Task<ApiResponse<List<AiRecommendationDto>>> GenerateRecommendationsAsync(int userId);
    }
}
