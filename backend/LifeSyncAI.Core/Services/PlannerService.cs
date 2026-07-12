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
                    .Where(e => e.UserId == userId)
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

                var plannerEvent = new PlannerEvent
                {
                    Title = dto.Title,
                    Description = dto.Description,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    IsCompleted = dto.IsCompleted,
                    UserId = userId
                };

                await _context.PlannerEvents.AddAsync(plannerEvent);
                await _context.SaveChangesAsync();

                var createdDto = new PlannerEventDto
                {
                    Id = plannerEvent.Id,
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
                var plannerEvent = await _context.PlannerEvents.FindAsync(id);
                if (plannerEvent != null)
                {
                    plannerEvent.IsCompleted = isCompleted;
                    await _context.SaveChangesAsync();
                }

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
                var plannerEvent = await _context.PlannerEvents.FindAsync(id);
                if (plannerEvent != null)
                {
                    _context.PlannerEvents.Remove(plannerEvent);
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<bool>.Success(true, "Event deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete event: {ex.Message}");
            }
        }
    }
}
