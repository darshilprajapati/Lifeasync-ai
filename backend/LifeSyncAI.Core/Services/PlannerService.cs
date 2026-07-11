using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Planner;
using LifeSyncAI.Core.DTO.Output.Planner;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class PlannerService : IPlannerService
    {
        private readonly ApplicationDbContext _context;

        public PlannerService(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task ResetOldEventsAsync(int userId, DateTime clientDate)
        {
            try
            {
                var clientToday = clientDate.Date;
                var oldEvents = await _context.PlannerEvents
                    .Where(e => e.UserId == userId && e.StartTime < clientToday)
                    .ToListAsync();
                
                if (oldEvents.Any())
                {
                    _context.PlannerEvents.RemoveRange(oldEvents);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error resetting old planner events: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<PlannerEventDto>>> GetEventsAsync(int userId, DateTime clientDate)
        {
            try
            {
                await ResetOldEventsAsync(userId, clientDate);

                var events = await _context.PlannerEvents
                    .FromSqlRaw("EXEC dbo.sp_GetPlannerEvents @UserId = {0}", userId)
                    .ToListAsync();

                var dtos = events.Select(e => new PlannerEventDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    IsCompleted = e.IsCompleted,
                    UserId = e.UserId
                }).ToList();

                return ApiResponse<List<PlannerEventDto>>.Success(dtos, "Planner events retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<PlannerEventDto>>.Fail($"Failed to load planner events: {ex.Message}");
            }
        }

        public async Task<ApiResponse<PlannerEventDto>> CreateEventAsync(CreatePlannerEventDto dto, int userId, DateTime clientDate)
        {
            try
            {
                await ResetOldEventsAsync(userId, clientDate);

                // Execute stored procedure and read the returned NewId
                var idList = await _context.Database
                    .SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreatePlannerEvent @Title = {0}, @Description = {1}, @StartTime = {2}, @EndTime = {3}, @IsCompleted = {4}, @UserId = {5}",
                        dto.Title, dto.Description, dto.StartTime, dto.EndTime, dto.IsCompleted, userId)
                    .ToListAsync();

                var newId = (int)idList.FirstOrDefault();

                var createdDto = new PlannerEventDto
                {
                    Id = newId,
                    Title = dto.Title,
                    Description = dto.Description,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    IsCompleted = dto.IsCompleted,
                    UserId = userId
                };

                return ApiResponse<PlannerEventDto>.Success(createdDto, "Planner event created successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PlannerEventDto>.Fail($"Failed to create planner event: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> ToggleEventAsync(int id, bool isCompleted)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_TogglePlannerEvent @Id = {0}, @IsCompleted = {1}",
                    id, isCompleted);

                return ApiResponse<bool>.Success(true, "Event status toggled successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to toggle event: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteEventAsync(int id)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_DeletePlannerEvent @Id = {0}",
                    id);

                return ApiResponse<bool>.Success(true, "Event deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete event: {ex.Message}");
            }
        }
    }
}
