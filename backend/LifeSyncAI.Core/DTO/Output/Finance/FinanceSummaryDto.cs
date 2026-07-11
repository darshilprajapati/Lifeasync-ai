namespace LifeSyncAI.Core.DTO.Output.Finance
{
    public class FinanceSummaryDto
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal Balance { get; set; }
        public decimal ProjectedMonthlyRecurring { get; set; }
        public decimal ProjectedYearlyRecurring { get; set; }
    }

    public class FinanceDbSummary
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal Balance { get; set; }
    }
}
