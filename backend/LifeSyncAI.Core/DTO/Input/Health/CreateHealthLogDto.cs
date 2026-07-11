using System;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Health
{
    public class CreateHealthLogDto
    {
        [Required(ErrorMessage = "Log type is required.")]
        [RegularExpression("^(Water|Workout|Sleep|Steps|Calories)$", ErrorMessage = "LogType must be either 'Water', 'Workout', 'Sleep', 'Steps', or 'Calories'.")]
        public string LogType { get; set; } = string.Empty;

        [Required(ErrorMessage = "Log value is required.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "LogValue must be positive.")]
        public float LogValue { get; set; }

        public string? Details { get; set; }

        [Required(ErrorMessage = "Log date is required.")]
        public DateTime LogDate { get; set; }
    }
}
