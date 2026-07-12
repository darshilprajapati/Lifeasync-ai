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
                var apps = await _context.JobApplications
                    .Where(a => a.UserId == userId)
                    .ToListAsync();

                var dtos = apps.Select(a => new JobApplicationDto
                {
                    Id = a.Id,
                    Company = a.Company,
                    Position = a.Position,
                    Status = a.Status,
                    AppliedDate = a.AppliedDate,
                    Notes = a.Notes,
                    UserId = a.UserId
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
                var app = new JobApplication
                {
                    Company = dto.Company,
                    Position = dto.Position,
                    Status = dto.Status,
                    AppliedDate = dto.AppliedDate,
                    Notes = dto.Notes,
                    UserId = userId
                };

                await _context.JobApplications.AddAsync(app);
                await _context.SaveChangesAsync();

                var createdDto = new JobApplicationDto
                {
                    Id = app.Id,
                    Company = dto.Company,
                    Position = dto.Position,
                    Status = dto.Status,
                    AppliedDate = dto.AppliedDate,
                    Notes = dto.Notes,
                    UserId = userId
                };

                return ApiResponse<JobApplicationDto>.Success(createdDto, "Job application tracked successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<JobApplicationDto>.Fail($"Failed to create job application: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> UpdateStatusAsync(int id, string status)
        {
            try
            {
                var app = await _context.JobApplications.FindAsync(id);
                if (app != null)
                {
                    app.Status = status;
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<bool>.Success(true, "Job application status updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to update status: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteApplicationAsync(int id)
        {
            try
            {
                var app = await _context.JobApplications.FindAsync(id);
                if (app != null)
                {
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
