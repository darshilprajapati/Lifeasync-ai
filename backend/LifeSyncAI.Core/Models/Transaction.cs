using System;

namespace LifeSyncAI.Core.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // 'Income' or 'Expense'
        public DateTime Date { get; set; }
        public string Category { get; set; } = string.Empty;
        public int UserId { get; set; }
    }
}
