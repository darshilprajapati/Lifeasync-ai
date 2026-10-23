using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Finance;
using LifeSyncAI.Core.DTO.Output.Finance;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IFinanceService
    {
        Task<ApiResponse<List<TransactionDto>>> GetTransactionsAsync(int userId);
        Task<ApiResponse<TransactionDto>> CreateTransactionAsync(CreateTransactionDto dto, int userId);
        Task<ApiResponse<TransactionDto>> UpdateTransactionAsync(int id, UpdateTransactionDto dto, int userId);
        Task<ApiResponse<bool>> DeleteTransactionAsync(int id, int userId = 0);
        Task<ApiResponse<FinanceSummaryDto>> GetSummaryAsync(int userId);
        
        // Recurring Bills & Loans
        Task<ApiResponse<List<RecurringItem>>> GetRecurringItemsAsync(int userId);
        Task<ApiResponse<RecurringItem>> CreateRecurringItemAsync(CreateRecurringItemDto dto, int userId);
        Task<ApiResponse<bool>> DeleteRecurringItemAsync(int id, int userId = 0);
        Task<ApiResponse<TransactionDto>> PayRecurringItemAsync(int id, int userId);

        // Budget Planner
        Task<ApiResponse<List<UserBudgetDto>>> GetBudgetsAsync(int userId);
        Task<ApiResponse<UserBudgetDto>> CreateBudgetAsync(int userId, CreateUserBudgetDto dto);
        Task<ApiResponse<UserBudgetDto>> UpdateBudgetAsync(int userId, int id, UpdateUserBudgetDto dto);
        Task<ApiResponse<bool>> DeleteBudgetAsync(int userId, int id);
    }
}
