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

        public async Task<ApiResponse<List<HealthLogDto>>> GetLogsAsync(int userId, DateTime clientDate)
        {
            try
            {
                var logs = await _context.HealthLogs
                    .Where(l => l.UserId == userId)
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

                var log = new HealthLog
                {
                    LogType = dto.LogType,
                    LogValue = dto.LogValue,
                    Details = dto.Details,
                    LogDate = dto.LogDate,
                    UserId = userId
                };

                await _context.HealthLogs.AddAsync(log);
                await _context.SaveChangesAsync();

                var createdDto = new HealthLogDto
                {
                    Id = log.Id,
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
                var log = await _context.HealthLogs.FindAsync(id);
                if (log != null)
                {
                    // Check if this HealthLog is linked to a specific exercise completion
                    var completion = await _context.WorkoutExerciseCompletions.FirstOrDefaultAsync(c => c.HealthLogId == id);
                    if (completion != null)
                    {
                        int dayId = completion.WorkoutDayId;
                        DateTime sessionDate = completion.SessionDate;
                        int compUserId = completion.UserId;

                        // Delete or invalidate the corresponding exercise completion record
                        _context.WorkoutExerciseCompletions.Remove(completion);
                        await _context.SaveChangesAsync();

                        // Recalculate remaining workout session progress
                        var workoutDay = await _context.WorkoutDays
                            .Include(d => d.Exercises)
                                .ThenInclude(e => e.Exercise)
                            .FirstOrDefaultAsync(d => d.Id == dayId);

                        if (workoutDay != null)
                        {
                            var allExerciseIds = workoutDay.Exercises.Select(e => e.Id).ToList();
                            var remainingCompletions = await _context.WorkoutExerciseCompletions
                                .Where(c => c.UserId == compUserId && c.WorkoutDayId == dayId && c.SessionDate == sessionDate)
                                .ToListAsync();

                            var existingLog = await _context.WorkoutSessionLogs
                                .FirstOrDefaultAsync(l => l.UserId == compUserId && l.WorkoutDayId == dayId && l.SessionDate == sessionDate);

                            if (remainingCompletions.Any())
                            {
                                int completedDurationMinutes = 0;
                                int completedCalories = 0;

                                var completedExercises = workoutDay.Exercises
                                    .Where(e => remainingCompletions.Any(c => c.WorkoutDayExerciseId == e.Id))
                                    .ToList();

                                foreach (var ex in completedExercises)
                                {
                                    var comp = remainingCompletions.FirstOrDefault(c => c.WorkoutDayExerciseId == ex.Id);
                                    int exMinutes = comp != null && comp.ActualDurationMinutes > 0 ? comp.ActualDurationMinutes : 0;
                                    if (exMinutes <= 0)
                                    {
                                        int sets = Math.Max(1, ex.Sets);
                                        int restSecs = ex.RestSeconds > 0 ? ex.RestSeconds : 60;
                                        int exSeconds = (sets * 45) + (Math.Max(0, sets - 1) * restSecs);
                                        exMinutes = Math.Max(1, (int)Math.Round(exSeconds / 60.0));
                                    }
                                    completedDurationMinutes += exMinutes;

                                    float met = ex.Exercise?.EstimatedMetValue ?? 5.0f;
                                    int exCal = (int)Math.Round((met * 3.5f * 70.0f / 200.0f) * exMinutes);
                                    completedCalories += exCal;
                                }

                                bool allDone = allExerciseIds.Any() && allExerciseIds.All(exId => remainingCompletions.Any(c => c.WorkoutDayExerciseId == exId));

                                if (existingLog != null)
                                {
                                    existingLog.IsCompleted = allDone;
                                    existingLog.ActualDurationMinutes = Math.Clamp(completedDurationMinutes, 0, 1440);
                                    existingLog.EstimatedCaloriesBurned = completedCalories;
                                }
                            }
                            else
                            {
                                // If no completed exercises remain, reset or remove the session log so progress returns to 0%
                                if (existingLog != null)
                                {
                                    _context.WorkoutSessionLogs.Remove(existingLog);
                                }
                            }
                        }
                    }
                    else
                    {
                        var linkedSession = await _context.WorkoutSessionLogs.FirstOrDefaultAsync(s => s.HealthLogId == id);
                        if (linkedSession != null)
                        {
                            linkedSession.HealthLogId = null;
                        }
                    }

                    _context.HealthLogs.Remove(log);
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<bool>.Success(true, "Health log deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete health log: {ex.Message}");
            }
        }
    }
}
