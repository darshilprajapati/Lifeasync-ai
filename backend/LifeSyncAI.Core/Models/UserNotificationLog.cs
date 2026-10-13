using System;

namespace LifeSyncAI.Core.Models
{
    /// <summary>
    /// Records notification delivery events (e.g. 1-hour planner reminders, inactivity re-engagement milestones).
    /// Used to prevent duplicate dispatches and maintain delivery audit history.
    /// </summary>
    public class UserNotificationLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string NotificationType { get; set; } = string.Empty; // e.g. "PlannerReminder", "Inactivity_7d", "Inactivity_30d", "Inactivity_3m", "Inactivity_6m", "Inactivity_1y"
        public string? ReferenceId { get; set; } // e.g. planner event ID
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public string RecipientEmail { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string? Details { get; set; }
    }
}
