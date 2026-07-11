using System;
using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Planner
{
    public class CreatePlannerEventDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [StringLength(250, ErrorMessage = "Title cannot exceed 250 characters.")]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Start Time is required.")]
        public DateTime StartTime { get; set; }

        [Required(ErrorMessage = "End Time is required.")]
        public DateTime EndTime { get; set; }

        public bool IsCompleted { get; set; } = false;
    }
}
