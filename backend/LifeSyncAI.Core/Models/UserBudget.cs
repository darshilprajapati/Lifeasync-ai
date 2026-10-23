using System;

namespace LifeSyncAI.Core.Models
{
    /// <summary>
    /// User configurable monthly budget limits per expense category.
    /// </summary>
    public class UserBudget : BaseEntity
    {
        public int UserId { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal MonthlyLimit { get; set; }
    }
}
