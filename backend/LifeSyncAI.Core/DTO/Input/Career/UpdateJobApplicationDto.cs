using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Career
{
    public class UpdateJobApplicationDto : IValidatableObject
    {
        [Required(ErrorMessage = "Company is required.")]
        [StringLength(200, ErrorMessage = "Company cannot exceed 200 characters.")]
        public string Company { get; set; } = string.Empty;

        [Required(ErrorMessage = "Position is required.")]
        [StringLength(200, ErrorMessage = "Position cannot exceed 200 characters.")]
        public string Position { get; set; } = string.Empty;

        [Required(ErrorMessage = "Status is required.")]
        [RegularExpression("^(Saved|Applied|Interview|Interviewing|Offered|Rejected)$", ErrorMessage = "Status must be: Saved, Applied, Interview, Interviewing, Offered, or Rejected.")]
        public string Status { get; set; } = string.Empty;

        [Required(ErrorMessage = "Applied Date is required.")]
        public DateTime AppliedDate { get; set; }

        public string? Notes { get; set; }
        public string? Category { get; set; }
        public string? JobType { get; set; }
        public string? WorkplaceType { get; set; }
        public string? Location { get; set; }
        public string? Salary { get; set; }
        public string? Url { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (AppliedDate.Year < 1900 || AppliedDate.Year > 2100)
            {
                yield return new ValidationResult(
                    "Applied Date year must be a valid 4-digit year between 1900 and 2100.",
                    new[] { nameof(AppliedDate) });
            }

            int year = AppliedDate.Year;
            int month = AppliedDate.Month;
            int day = AppliedDate.Day;
            int maxDays = DateTime.DaysInMonth(year, month);

            if (day > maxDays)
            {
                yield return new ValidationResult(
                    $"Day {day} is invalid for month {month} in year {year}.",
                    new[] { nameof(AppliedDate) });
            }
        }
    }
}
