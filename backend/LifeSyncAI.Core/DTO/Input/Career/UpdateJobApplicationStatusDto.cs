using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Career
{
    public class UpdateJobApplicationStatusDto
    {
        [Required(ErrorMessage = "Status is required.")]
        [RegularExpression("^(Saved|Applied|Interview|Interviewing|Offered|Rejected)$", ErrorMessage = "Status must be: Saved, Applied, Interview, Interviewing, Offered, or Rejected.")]
        public string Status { get; set; } = string.Empty;

        public string? Note { get; set; }
    }
}
