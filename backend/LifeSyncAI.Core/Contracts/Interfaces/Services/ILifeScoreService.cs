using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Output.LifeScore;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface ILifeScoreService
    {
        Task<ApiResponse<DailyLifeScoreDto>> GetDailyLifeScoreAsync(int userId, DateTime targetDate, int clientOffsetMinutes = 0);
        Task<ApiResponse<List<HistoricalLifeScoreDto>>> GetHistoricalScoresAsync(int userId, DateTime clientDate, int days = 7, int clientOffsetMinutes = 0);
        Task<double> GetCumulativeTotalLifeScoreAsync(int userId);
        Task<ApiResponse<LeaderboardResponseDto>> GetLeaderboardAsync(int currentUserId, string scope, int page = 1, int pageSize = 20);
    }
}
