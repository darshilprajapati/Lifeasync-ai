namespace LifeSyncAI.Core.DTO.Output.Finance
{
    public class UserBudgetDto
    {
        public int Id { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal MonthlyLimit { get; set; }
        public decimal Spent { get; set; }
        public decimal Remaining { get; set; }
        public int Percentage { get; set; }
        public bool IsOverBudget { get; set; }
    }
}
