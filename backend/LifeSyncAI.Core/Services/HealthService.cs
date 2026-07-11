using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.DTO.Output.Health;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class HealthService : IHealthService
    {
        private readonly ApplicationDbContext _context;

        public HealthService(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task ResetOldLogsAsync(int userId, DateTime clientDate)
        {
            try
            {
                var clientToday = clientDate.Date;
                var oldLogs = await _context.HealthLogs
                    .Where(l => l.UserId == userId && l.LogDate < clientToday)
                    .ToListAsync();
                
                if (oldLogs.Any())
                {
                    _context.HealthLogs.RemoveRange(oldLogs);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error resetting old health logs: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<HealthLogDto>>> GetLogsAsync(int userId, DateTime clientDate)
        {
            try
            {
                await ResetOldLogsAsync(userId, clientDate);

                var logs = await _context.HealthLogs
                    .FromSqlRaw("EXEC dbo.sp_GetHealthLogs @UserId = {0}", userId)
                    .ToListAsync();

                var dtos = logs.Select(l => new HealthLogDto
                {
                    Id = l.Id,
                    LogType = l.LogType,
                    LogValue = l.LogValue,
                    Details = l.Details,
                    LogDate = l.LogDate,
                    UserId = l.UserId
                }).ToList();

                return ApiResponse<List<HealthLogDto>>.Success(dtos, "Health logs retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<HealthLogDto>>.Fail($"Failed to load health logs: {ex.Message}");
            }
        }

        public async Task<ApiResponse<HealthLogDto>> CreateLogAsync(CreateHealthLogDto dto, int userId, DateTime clientDate)
        {
            try
            {
                await ResetOldLogsAsync(userId, clientDate);

                var clientToday = clientDate.Date;
                var currentSum = await _context.HealthLogs
                    .Where(l => l.UserId == userId && l.LogDate >= clientToday && l.LogType == dto.LogType)
                    .SumAsync(l => l.LogValue);

                if (dto.LogType == "Water" && currentSum + dto.LogValue > 10000)
                {
                    return ApiResponse<HealthLogDto>.Fail($"Daily water intake limit exceeded. You cannot log more than 10,000 ml per day (currently at {currentSum} ml).");
                }
                if (dto.LogType == "Sleep" && currentSum + dto.LogValue > 24)
                {
                    return ApiResponse<HealthLogDto>.Fail($"Daily sleep duration limit exceeded. You cannot log more than 24 hours per day (currently at {currentSum} hours).");
                }
                if (dto.LogType == "Steps" && currentSum + dto.LogValue > 100000)
                {
                    return ApiResponse<HealthLogDto>.Fail($"Daily steps limit exceeded. You cannot log more than 100,000 steps per day (currently at {currentSum} steps).");
                }
                if (dto.LogType == "Calories" && currentSum + dto.LogValue > 10000)
                {
                    return ApiResponse<HealthLogDto>.Fail($"Daily calories limit exceeded. You cannot log more than 10,000 kcal per day (currently at {currentSum} kcal).");
                }

                var idList = await _context.Database
                    .SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreateHealthLog @LogType = {0}, @LogValue = {1}, @Details = {2}, @LogDate = {3}, @UserId = {4}",
                        dto.LogType, dto.LogValue, dto.Details, dto.LogDate, userId)
                    .ToListAsync();

                var newId = (int)idList.FirstOrDefault();

                var createdDto = new HealthLogDto
                {
                    Id = newId,
                    LogType = dto.LogType,
                    LogValue = dto.LogValue,
                    Details = dto.Details,
                    LogDate = dto.LogDate,
                    UserId = userId
                };

                return ApiResponse<HealthLogDto>.Success(createdDto, "Health log created successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<HealthLogDto>.Fail($"Failed to create health log: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteLogAsync(int id)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_DeleteHealthLog @Id = {0}",
                    id);

                return ApiResponse<bool>.Success(true, "Health log deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete health log: {ex.Message}");
            }
        }
    }
}
