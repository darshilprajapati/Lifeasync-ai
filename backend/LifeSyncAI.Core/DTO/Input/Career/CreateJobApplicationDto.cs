using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Career
{
    public class CreateJobApplicationDto : IValidatableObject
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

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // Restrict year strictly to a 4-digit valid calendar year between 1900 and 2100
            if (AppliedDate.Year < 1900 || AppliedDate.Year > 2100)
            {
                yield return new ValidationResult(
                    "Applied Date year must be a valid 4-digit year between 1900 and 2100.",
                    new[] { nameof(AppliedDate) });
            }

            // Check leap year / calendar day validity
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
