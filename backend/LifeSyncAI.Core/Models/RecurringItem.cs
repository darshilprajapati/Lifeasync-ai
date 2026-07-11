using System;

namespace LifeSyncAI.Core.Models
{
    public class RecurringItem
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // 'Loan', 'EMI', 'Bill'
        public string Frequency { get; set; } = string.Empty; // 'Monthly', 'Yearly'
        public DateTime DueDate { get; set; }
        public bool IsPaid { get; set; }
        public int UserId { get; set; }
    }
}
