using System;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Career
{
    public class CreateJobApplicationDto
    {
        [Required(ErrorMessage = "Company is required.")]
        [StringLength(200, ErrorMessage = "Company cannot exceed 200 characters.")]
        public string Company { get; set; } = string.Empty;

        [Required(ErrorMessage = "Position is required.")]
        [StringLength(200, ErrorMessage = "Position cannot exceed 200 characters.")]
        public string Position { get; set; } = string.Empty;

        [Required(ErrorMessage = "Status is required.")]
        [RegularExpression("^(Applied|Interviewing|Offered|Rejected)$", ErrorMessage = "Status must be: Applied, Interviewing, Offered, or Rejected.")]
        public string Status { get; set; } = string.Empty;

        [Required(ErrorMessage = "Applied Date is required.")]
        public DateTime AppliedDate { get; set; }

        public string? Notes { get; set; }
    }
}
