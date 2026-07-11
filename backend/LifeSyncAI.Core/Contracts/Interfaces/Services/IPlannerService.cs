using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Planner;
using LifeSyncAI.Core.DTO.Output.Planner;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IPlannerService
    {
        Task<ApiResponse<List<PlannerEventDto>>> GetEventsAsync(int userId, System.DateTime clientDate);
        Task<ApiResponse<PlannerEventDto>> CreateEventAsync(CreatePlannerEventDto dto, int userId, System.DateTime clientDate);
        Task<ApiResponse<bool>> ToggleEventAsync(int id, bool isCompleted);
        Task<ApiResponse<bool>> DeleteEventAsync(int id);
    }
}
