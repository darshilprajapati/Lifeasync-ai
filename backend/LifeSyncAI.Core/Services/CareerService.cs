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
                    .FromSqlRaw("EXEC dbo.sp_GetJobApplications @UserId = {0}", userId)
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
                var idList = await _context.Database
                    .SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreateJobApplication @Company = {0}, @Position = {1}, @Status = {2}, @AppliedDate = {3}, @Notes = {4}, @UserId = {5}",
                        dto.Company, dto.Position, dto.Status, dto.AppliedDate, dto.Notes, userId)
                    .ToListAsync();

                var newId = (int)idList.FirstOrDefault();

                var createdDto = new JobApplicationDto
                {
                    Id = newId,
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
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_UpdateJobApplicationStatus @Id = {0}, @Status = {1}",
                    id, status);

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
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_DeleteJobApplication @Id = {0}",
                    id);

                return ApiResponse<bool>.Success(true, "Job application deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete application: {ex.Message}");
            }
        }
    }
}
