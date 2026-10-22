using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Career;
using LifeSyncAI.Core.DTO.Output.Career;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class CareerService : ICareerService
    {
        private readonly ApplicationDbContext _context;

        public CareerService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<JobApplicationDto>>> GetApplicationsAsync(int userId)
        {
            try
            {
                List<JobApplication> apps;
                try
                {
                    apps = await _context.JobApplications
                        .Include(a => a.StageHistories)
                        .Where(a => a.UserId == userId)
                        .OrderByDescending(a => a.AppliedDate)
                        .ToListAsync();
                }
                catch (Exception ex) when (ex.Message.Contains("JobApplicationStageHistories", StringComparison.OrdinalIgnoreCase))
                {
                    // Fallback if stage history table has not yet been migrated
                    apps = await _context.JobApplications
                        .Where(a => a.UserId == userId)
                        .OrderByDescending(a => a.AppliedDate)
                        .ToListAsync();
                }

                var dtos = apps.Select(a => new JobApplicationDto
                {
                    Id = a.Id,
                    Company = a.Company,
                    Position = a.Position,
                    Status = a.Status,
                    AppliedDate = a.AppliedDate,
                    Notes = a.Notes,
                    Category = a.Category,
                    JobType = a.JobType,
                    WorkplaceType = a.WorkplaceType,
                    Location = a.Location,
                    Salary = a.Salary,
                    Url = a.Url,
                    UserId = a.UserId,
                    StageHistories = (a.StageHistories ?? Enumerable.Empty<JobApplicationStageHistory>())
                        .OrderBy(h => h.TransitionDate)
                        .Select(h => new JobApplicationStageHistoryDto
                        {
                            Id = h.Id,
                            JobApplicationId = h.JobApplicationId,
                            FromStage = h.FromStage,
                            ToStage = h.ToStage,
                            TransitionDate = h.TransitionDate,
                            Note = h.Note
                        }).ToList()
                }).ToList();

                return ApiResponse<List<JobApplicationDto>>.Success(dtos, "Job applications retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<JobApplicationDto>>.Fail($"Failed to load job applications: {ex.Message}");
            }
        }

        public async Task<ApiResponse<JobApplicationDto>> CreateApplicationAsync(CreateJobApplicationDto dto, int userId)
        {
            try
            {
                if (dto.AppliedDate.Year < 1900 || dto.AppliedDate.Year > 2100)
                {
                    return ApiResponse<JobApplicationDto>.Fail("Applied Date year must be a valid 4-digit year between 1900 and 2100.");
                }

                var app = new JobApplication
                {
                    Company = dto.Company.Trim(),
                    Position = dto.Position.Trim(),
                    Status = dto.Status.Trim(),
                    AppliedDate = dto.AppliedDate,
                    Notes = dto.Notes?.Trim(),
                    Category = dto.Category?.Trim(),
                    JobType = dto.JobType?.Trim(),
                    WorkplaceType = dto.WorkplaceType?.Trim(),
                    Location = dto.Location?.Trim(),
                    Salary = dto.Salary?.Trim(),
                    Url = dto.Url?.Trim(),
                    UserId = userId
                };

                // Add initial transition history
                app.StageHistories.Add(new JobApplicationStageHistory
                {
                    FromStage = "Created",
                    ToStage = dto.Status.Trim(),
                    TransitionDate = DateTime.UtcNow,
                    Note = !string.IsNullOrWhiteSpace(dto.Notes) ? dto.Notes.Trim() : "Application added to board.",
                    UserId = userId
                });

                await _context.JobApplications.AddAsync(app);
                await _context.SaveChangesAsync();

                var createdDto = new JobApplicationDto
                {
                    Id = app.Id,
                    Company = app.Company,
                    Position = app.Position,
                    Status = app.Status,
                    AppliedDate = app.AppliedDate,
                    Notes = app.Notes,
                    Category = app.Category,
                    JobType = app.JobType,
                    WorkplaceType = app.WorkplaceType,
                    Location = app.Location,
                    Salary = app.Salary,
                    Url = app.Url,
                    UserId = userId,
                    StageHistories = app.StageHistories.Select(h => new JobApplicationStageHistoryDto
                    {
                        Id = h.Id,
                        JobApplicationId = h.JobApplicationId,
                        FromStage = h.FromStage,
                        ToStage = h.ToStage,
                        TransitionDate = h.TransitionDate,
                        Note = h.Note
                    }).ToList()
                };

                return ApiResponse<JobApplicationDto>.Success(createdDto, "Job application tracked successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<JobApplicationDto>.Fail($"Failed to create job application: {ex.Message}");
            }
        }

        public async Task<ApiResponse<JobApplicationDto>> UpdateApplicationAsync(int id, UpdateJobApplicationDto dto, int userId)
        {
            try
            {
                var app = await _context.JobApplications
                    .Include(a => a.StageHistories)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (app == null || app.UserId != userId)
                {
                    return ApiResponse<JobApplicationDto>.Fail("Job application not found or access denied.");
                }

                if (dto.AppliedDate.Year < 1900 || dto.AppliedDate.Year > 2100)
                {
                    return ApiResponse<JobApplicationDto>.Fail("Applied Date year must be a valid 4-digit year between 1900 and 2100.");
                }

                // If status changed, record transition history
                string oldStatus = app.Status;
                string newStatus = dto.Status.Trim();
                if (!string.Equals(oldStatus, newStatus, StringComparison.OrdinalIgnoreCase))
                {
                    app.StageHistories.Add(new JobApplicationStageHistory
                    {
                        JobApplicationId = app.Id,
                        FromStage = oldStatus,
                        ToStage = newStatus,
                        TransitionDate = DateTime.UtcNow,
                        Note = dto.Notes?.Trim(),
                        UserId = userId
                    });
                }

                app.Company = dto.Company.Trim();
                app.Position = dto.Position.Trim();
                app.Status = newStatus;
                app.AppliedDate = dto.AppliedDate;
                app.Notes = dto.Notes?.Trim();
                app.Category = dto.Category?.Trim();
                app.JobType = dto.JobType?.Trim();
                app.WorkplaceType = dto.WorkplaceType?.Trim();
                app.Location = dto.Location?.Trim();
                app.Salary = dto.Salary?.Trim();
                app.Url = dto.Url?.Trim();

                await _context.SaveChangesAsync();

                var updatedDto = new JobApplicationDto
                {
                    Id = app.Id,
                    Company = app.Company,
                    Position = app.Position,
                    Status = app.Status,
                    AppliedDate = app.AppliedDate,
                    Notes = app.Notes,
                    Category = app.Category,
                    JobType = app.JobType,
                    WorkplaceType = app.WorkplaceType,
                    Location = app.Location,
                    Salary = app.Salary,
                    Url = app.Url,
                    UserId = userId,
                    StageHistories = app.StageHistories.OrderBy(h => h.TransitionDate).Select(h => new JobApplicationStageHistoryDto
                    {
                        Id = h.Id,
                        JobApplicationId = h.JobApplicationId,
                        FromStage = h.FromStage,
                        ToStage = h.ToStage,
                        TransitionDate = h.TransitionDate,
                        Note = h.Note
                    }).ToList()
                };

                return ApiResponse<JobApplicationDto>.Success(updatedDto, "Job application updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<JobApplicationDto>.Fail($"Failed to update job application: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> UpdateStatusAsync(int id, string status, string? note = null, int userId = 0)
        {
            try
            {
                var app = await _context.JobApplications
                    .Include(a => a.StageHistories)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (app == null || (userId > 0 && app.UserId != userId))
                {
                    return ApiResponse<bool>.Fail("Job application not found or access denied.");
                }

                string oldStatus = app.Status;
                string newStatus = status.Trim();

                if (!string.Equals(oldStatus, newStatus, StringComparison.OrdinalIgnoreCase))
                {
                    var transition = new JobApplicationStageHistory
                    {
                        JobApplicationId = app.Id,
                        FromStage = oldStatus,
                        ToStage = newStatus,
                        TransitionDate = DateTime.UtcNow,
                        Note = !string.IsNullOrWhiteSpace(note) ? note.Trim() : null,
                        UserId = app.UserId
                    };

                    try
                    {
                        _context.JobApplicationStageHistories.Add(transition);
                        app.Status = newStatus;
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex) when (ex.Message.Contains("JobApplicationStageHistories", StringComparison.OrdinalIgnoreCase))
                    {
                        _context.Entry(transition).State = EntityState.Detached;
                        app.Status = newStatus;
                        await _context.SaveChangesAsync();
                    }
                }
                else if (!string.IsNullOrWhiteSpace(note))
                {
                    try
                    {
                        // If status didn't change but a note was submitted for this stage, append or update note
                        var latestHistory = (app.StageHistories ?? Enumerable.Empty<JobApplicationStageHistory>())
                            .OrderByDescending(h => h.TransitionDate)
                            .FirstOrDefault();
                        if (latestHistory != null && string.IsNullOrEmpty(latestHistory.Note))
                        {
                            latestHistory.Note = note.Trim();
                        }
                        else
                        {
                            var noteRecord = new JobApplicationStageHistory
                            {
                                JobApplicationId = app.Id,
                                FromStage = app.Status,
                                ToStage = app.Status,
                                TransitionDate = DateTime.UtcNow,
                                Note = note.Trim(),
                                UserId = app.UserId
                            };
                            _context.JobApplicationStageHistories.Add(noteRecord);
                        }
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex) when (ex.Message.Contains("JobApplicationStageHistories", StringComparison.OrdinalIgnoreCase))
                    {
                        // Ignore stage history note if table not yet migrated
                    }
                }

                return ApiResponse<bool>.Success(true, "Job application status updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to update status: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteApplicationAsync(int id, int userId = 0)
        {
            try
            {
                var app = await _context.JobApplications.FindAsync(id);
                if (app != null)
                {
                    if (userId > 0 && app.UserId != userId)
                    {
                        return ApiResponse<bool>.Fail("Access denied.");
                    }
                    _context.JobApplications.Remove(app);
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<bool>.Success(true, "Job application deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete application: {ex.Message}");
            }
        }
    }
}
