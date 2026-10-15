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
        private const string InvalidTimeRangeMessage = "The end time must be later than the start time. Choose a valid deadline for your task.";
        private readonly ApplicationDbContext _context;

        public PlannerService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<PlannerEventDto>>> GetEventsAsync(int userId, DateTime clientDate)
        {
            try
            {
                var events = await _context.PlannerEvents
                    .Where(e => e.UserId == userId)
                    .OrderBy(e => e.StartTime)
                    .ToListAsync();

                var nowUtc = DateTime.UtcNow;
                bool stateModified = false;

                // Evaluate overdue incomplete tasks to ensure missed-deadline penalties are recorded idempotently
                foreach (var ev in events)
                {
                    if (!ev.IsCompleted && nowUtc > ev.EndTime && !ev.MissedDeadlinePenalized)
                    {
                        ev.MissedDeadlinePenalized = true;
                        ev.PenaltyAppliedAt = nowUtc;
                        ev.UpdatedAt = nowUtc;
                        stateModified = true;
                    }
                }

                if (stateModified)
                {
                    await _context.SaveChangesAsync();
                }

                var dtos = events.Select(e => new PlannerEventDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    StartTime = e.StartTime,
                    EndTime = e.EndTime,
                    IsCompleted = e.IsCompleted,
                    CompletedAt = e.CompletedAt,
                    MissedDeadlinePenalized = e.MissedDeadlinePenalized,
                    ReminderSent = e.ReminderSent,
                    ReminderTime = e.ReminderTime,
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
                // Strict validation: End time must strictly exceed start time
                if (dto.EndTime <= dto.StartTime)
                {
                    return ApiResponse<PlannerEventDto>.Fail(InvalidTimeRangeMessage);
                }

                var nowUtc = DateTime.UtcNow;
                var plannerEvent = new PlannerEvent
                {
                    Title = dto.Title.Trim(),
                    Description = dto.Description?.Trim(),
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    ReminderTime = dto.ReminderTime,
                    IsCompleted = dto.IsCompleted,
                    CompletedAt = dto.IsCompleted ? nowUtc : null,
                    CreatedAt = nowUtc,
                    UpdatedAt = nowUtc,
                    UserId = userId
                };

                await _context.PlannerEvents.AddAsync(plannerEvent);
                await _context.SaveChangesAsync();

                var createdDto = new PlannerEventDto
                {
                    Id = plannerEvent.Id,
                    Title = plannerEvent.Title,
                    Description = plannerEvent.Description,
                    StartTime = plannerEvent.StartTime,
                    EndTime = plannerEvent.EndTime,
                    IsCompleted = plannerEvent.IsCompleted,
                    CompletedAt = plannerEvent.CompletedAt,
                    MissedDeadlinePenalized = plannerEvent.MissedDeadlinePenalized,
                    ReminderSent = plannerEvent.ReminderSent,
                    ReminderTime = plannerEvent.ReminderTime,
                    UserId = userId
                };

                return ApiResponse<PlannerEventDto>.Success(createdDto, "Planner event created successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PlannerEventDto>.Fail($"Failed to create planner event: {ex.Message}");
            }
        }

        public async Task<ApiResponse<PlannerEventDto>> UpdateEventAsync(int id, UpdatePlannerEventDto dto, int userId)
        {
            try
            {
                // Strict validation: End time must strictly exceed start time
                if (dto.EndTime <= dto.StartTime)
                {
                    return ApiResponse<PlannerEventDto>.Fail(InvalidTimeRangeMessage);
                }

                var plannerEvent = await _context.PlannerEvents.FindAsync(id);
                if (plannerEvent == null || plannerEvent.UserId != userId)
                {
                    return ApiResponse<PlannerEventDto>.Fail("Event not found or access denied.");
                }

                var nowUtc = DateTime.UtcNow;

                // Recalculate reminder eligibility if deadline changed to future > 1 hour
                if (dto.EndTime != plannerEvent.EndTime && dto.EndTime > nowUtc.AddMinutes(65))
                {
                    plannerEvent.ReminderSent = false;
                    plannerEvent.ReminderSentAt = null;
                }

                // If user scheduled a new custom reminder time in future, allow sending again
                if (dto.ReminderTime != plannerEvent.ReminderTime)
                {
                    plannerEvent.ReminderTime = dto.ReminderTime;
                    if (dto.ReminderTime > nowUtc)
                    {
                        plannerEvent.ReminderSent = false;
                        plannerEvent.ReminderSentAt = null;
                    }
                }

                // Note: A deadline change cannot retroactively erase an already-recorded penalty.
                // MissedDeadlinePenalized is preserved.

                plannerEvent.Title = dto.Title.Trim();
                plannerEvent.Description = dto.Description?.Trim();
                plannerEvent.StartTime = dto.StartTime;
                plannerEvent.EndTime = dto.EndTime;
                plannerEvent.UpdatedAt = nowUtc;

                if (dto.IsCompleted && !plannerEvent.IsCompleted)
                {
                    plannerEvent.IsCompleted = true;
                    plannerEvent.CompletedAt = nowUtc;
                    if (nowUtc > plannerEvent.EndTime)
                    {
                        plannerEvent.MissedDeadlinePenalized = true;
                        plannerEvent.PenaltyAppliedAt ??= nowUtc;
                    }
                }
                else if (!dto.IsCompleted && plannerEvent.IsCompleted)
                {
                    plannerEvent.IsCompleted = false;
                    plannerEvent.CompletedAt = null;
                    if (nowUtc > plannerEvent.EndTime)
                    {
                        plannerEvent.MissedDeadlinePenalized = true;
                        plannerEvent.PenaltyAppliedAt ??= nowUtc;
                    }
                }

                await _context.SaveChangesAsync();

                var updatedDto = new PlannerEventDto
                {
                    Id = plannerEvent.Id,
                    Title = plannerEvent.Title,
                    Description = plannerEvent.Description,
                    StartTime = plannerEvent.StartTime,
                    EndTime = plannerEvent.EndTime,
                    IsCompleted = plannerEvent.IsCompleted,
                    CompletedAt = plannerEvent.CompletedAt,
                    MissedDeadlinePenalized = plannerEvent.MissedDeadlinePenalized,
                    ReminderSent = plannerEvent.ReminderSent,
                    ReminderTime = plannerEvent.ReminderTime,
                    UserId = plannerEvent.UserId
                };

                return ApiResponse<PlannerEventDto>.Success(updatedDto, "Planner event updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<PlannerEventDto>.Fail($"Failed to update planner event: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> ToggleEventAsync(int id, bool isCompleted, int userId = 0)
        {
            try
            {
                var plannerEvent = await _context.PlannerEvents.FindAsync(id);
                if (plannerEvent == null || (userId > 0 && plannerEvent.UserId != userId))
                {
                    return ApiResponse<bool>.Fail("Event not found or access denied.");
                }

                var nowUtc = DateTime.UtcNow;
                plannerEvent.IsCompleted = isCompleted;
                plannerEvent.UpdatedAt = nowUtc;

                if (isCompleted)
                {
                    plannerEvent.CompletedAt = nowUtc;
                    // If completed AFTER the deadline, mark as penalized (completing late does NOT remove the penalty)
                    if (nowUtc > plannerEvent.EndTime)
                    {
                        plannerEvent.MissedDeadlinePenalized = true;
                        plannerEvent.PenaltyAppliedAt ??= nowUtc;
                        await RecordPersistentPenaltyLogAsync(plannerEvent);
                    }
                }
                else
                {
                    plannerEvent.CompletedAt = null;
                    // If unchecked when past the deadline, it's overdue
                    if (nowUtc > plannerEvent.EndTime)
                    {
                        plannerEvent.MissedDeadlinePenalized = true;
                        plannerEvent.PenaltyAppliedAt ??= nowUtc;
                        await RecordPersistentPenaltyLogAsync(plannerEvent);
                    }
                }

                await _context.SaveChangesAsync();
                return ApiResponse<bool>.Success(true, "Event status toggled successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to toggle event: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteEventAsync(int id, int userId = 0)
        {
            try
            {
                var plannerEvent = await _context.PlannerEvents.FindAsync(id);
                if (plannerEvent == null || (userId > 0 && plannerEvent.UserId != userId))
                {
                    return ApiResponse<bool>.Fail("Event not found or access denied.");
                }

                var nowUtc = DateTime.UtcNow;

                // Crucial requirement: If task missed its deadline or was penalized, the penalty
                // MUST remain deducted from the user's score even after deleting the event!
                if (plannerEvent.MissedDeadlinePenalized || (nowUtc > plannerEvent.EndTime && !plannerEvent.IsCompleted))
                {
                    await RecordPersistentPenaltyLogAsync(plannerEvent);
                }

                _context.PlannerEvents.Remove(plannerEvent);
                await _context.SaveChangesAsync();

                return ApiResponse<bool>.Success(true, "Event deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete event: {ex.Message}");
            }
        }

        private async Task RecordPersistentPenaltyLogAsync(PlannerEvent plannerEvent)
        {
            try
            {
                string refId = plannerEvent.Id.ToString();
                bool alreadyLogged = await _context.UserNotificationLogs.AnyAsync(n =>
                    n.UserId == plannerEvent.UserId &&
                    n.NotificationType == "MissedDeadlinePenalty" &&
                    n.ReferenceId == refId);

                if (!alreadyLogged)
                {
                    await _context.UserNotificationLogs.AddAsync(new UserNotificationLog
                    {
                        UserId = plannerEvent.UserId,
                        NotificationType = "MissedDeadlinePenalty",
                        ReferenceId = refId,
                        SentAt = plannerEvent.EndTime,
                        RecipientEmail = string.Empty,
                        IsSuccess = true,
                        Details = $"Missed deadline penalty (-2 pts) permanently retained for task '{plannerEvent.Title}'."
                    });
                }
            }
            catch
            {
                // Non-blocking log persistence
            }
        }
    }
}
