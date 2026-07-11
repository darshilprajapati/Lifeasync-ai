using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Career;
using LifeSyncAI.Core.DTO.Output.Career;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface ICareerService
    {
        Task<ApiResponse<List<JobApplicationDto>>> GetApplicationsAsync(int userId);
        Task<ApiResponse<JobApplicationDto>> CreateApplicationAsync(CreateJobApplicationDto dto, int userId);
        Task<ApiResponse<bool>> UpdateStatusAsync(int id, string status);
        Task<ApiResponse<bool>> DeleteApplicationAsync(int id);
    }
}
