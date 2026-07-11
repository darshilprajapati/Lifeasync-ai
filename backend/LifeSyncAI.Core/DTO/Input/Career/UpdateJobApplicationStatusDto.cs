using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Career
{
    public class UpdateJobApplicationStatusDto
    {
        [Required(ErrorMessage = "Status is required.")]
        [RegularExpression("^(Applied|Interviewing|Offered|Rejected)$", ErrorMessage = "Status must be: Applied, Interviewing, Offered, or Rejected.")]
        public string Status { get; set; } = string.Empty;
    }
}
