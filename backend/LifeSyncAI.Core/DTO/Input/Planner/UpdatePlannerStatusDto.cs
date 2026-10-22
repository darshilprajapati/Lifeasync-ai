using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Planner
{
    public class UpdatePlannerStatusDto
    {
        [Required(ErrorMessage = "Status is required.")]
        public string Status { get; set; } = "Todo";
    }
}
