using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Finance;
using LifeSyncAI.Core.DTO.Output.Finance;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class FinanceService : IFinanceService
    {
        private readonly ApplicationDbContext _context;

        public FinanceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<TransactionDto>>> GetTransactionsAsync(int userId)
        {
            try
            {
                var transactions = await _context.Transactions
                    .FromSqlRaw("EXEC dbo.sp_GetTransactions @UserId = {0}", userId)
                    .ToListAsync();

                var dtos = transactions.Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Description = t.Description,
                    Amount = t.Amount,
                    Type = t.Type,
                    Date = t.Date,
                    Category = t.Category,
                    UserId = t.UserId
                }).ToList();

                return ApiResponse<List<TransactionDto>>.Success(dtos, "Transactions retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<TransactionDto>>.Fail($"Failed to load transactions: {ex.Message}");
            }
        }

        public async Task<ApiResponse<TransactionDto>> CreateTransactionAsync(CreateTransactionDto dto, int userId)
        {
            try
            {
                var idList = await _context.Database
                    .SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreateTransaction @Description = {0}, @Amount = {1}, @Type = {2}, @Date = {3}, @Category = {4}, @UserId = {5}",
                        dto.Description, dto.Amount, dto.Type, dto.Date, dto.Category, userId)
                    .ToListAsync();

                var newId = (int)idList.FirstOrDefault();

                var createdDto = new TransactionDto
                {
                    Id = newId,
                    Description = dto.Description,
                    Amount = dto.Amount,
                    Type = dto.Type,
                    Date = dto.Date,
                    Category = dto.Category,
                    UserId = userId
                };

                return ApiResponse<TransactionDto>.Success(createdDto, "Transaction recorded successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<TransactionDto>.Fail($"Failed to record transaction: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteTransactionAsync(int id)
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC dbo.sp_DeleteTransaction @Id = {0}",
                    id);

                return ApiResponse<bool>.Success(true, "Transaction deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete transaction: {ex.Message}");
            }
        }

        public async Task<ApiResponse<FinanceSummaryDto>> GetSummaryAsync(int userId)
        {
            try
            {
                var summaryList = await _context.Database
                    .SqlQueryRaw<FinanceDbSummary>("EXEC dbo.sp_GetFinanceSummary @UserId = {0}", userId)
                    .ToListAsync();

                var dbSummary = summaryList.FirstOrDefault() ?? new FinanceDbSummary
                {
                    TotalIncome = 0,
                    TotalExpense = 0,
                    Balance = 0
                };

                var summary = new FinanceSummaryDto
                {
                    TotalIncome = dbSummary.TotalIncome,
                    TotalExpense = dbSummary.TotalExpense,
                    Balance = dbSummary.Balance
                };

                // Add recurring commitments calculations
                var recurringItems = await _context.RecurringItems
                    .Where(r => r.UserId == userId)
                    .ToListAsync();

                decimal monthlySum = 0;
                decimal yearlySum = 0;

                foreach (var item in recurringItems)
                {
                    if (item.Frequency.Equals("Monthly", StringComparison.OrdinalIgnoreCase))
                    {
                        monthlySum += item.Amount;
                        yearlySum += item.Amount * 12;
                    }
                    else if (item.Frequency.Equals("Yearly", StringComparison.OrdinalIgnoreCase))
                    {
                        yearlySum += item.Amount;
                        monthlySum += item.Amount / 12;
                    }
                }

                summary.ProjectedMonthlyRecurring = Math.Round(monthlySum, 2);
                summary.ProjectedYearlyRecurring = Math.Round(yearlySum, 2);

                return ApiResponse<FinanceSummaryDto>.Success(summary, "Finance summary calculated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<FinanceSummaryDto>.Fail($"Failed to calculate finance summary: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<RecurringItem>>> GetRecurringItemsAsync(int userId)
        {
            try
            {
                // Sorted by Expiry/Due Date first (closest deadline first)
                var items = await _context.RecurringItems
                    .Where(r => r.UserId == userId)
                    .OrderBy(r => r.DueDate)
                    .ToListAsync();

                return ApiResponse<List<RecurringItem>>.Success(items, "Recurring items retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<RecurringItem>>.Fail($"Failed to retrieve recurring items: {ex.Message}");
            }
        }

        public async Task<ApiResponse<RecurringItem>> CreateRecurringItemAsync(CreateRecurringItemDto dto, int userId)
        {
            try
            {
                var item = new RecurringItem
                {
                    Description = dto.Description,
                    Amount = dto.Amount,
                    Type = dto.Type,
                    Frequency = dto.Frequency,
                    DueDate = dto.DueDate,
                    IsPaid = false,
                    UserId = userId
                };

                await _context.RecurringItems.AddAsync(item);
                await _context.SaveChangesAsync();

                return ApiResponse<RecurringItem>.Success(item, "Recurring commitment recorded successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<RecurringItem>.Fail($"Failed to record recurring commitment: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteRecurringItemAsync(int id)
        {
            try
            {
                var item = await _context.RecurringItems.FindAsync(id);
                if (item == null) return ApiResponse<bool>.Fail("Recurring commitment not found.");

                _context.RecurringItems.Remove(item);
                await _context.SaveChangesAsync();

                return ApiResponse<bool>.Success(true, "Recurring commitment deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete recurring commitment: {ex.Message}");
            }
        }

        public async Task<ApiResponse<TransactionDto>> PayRecurringItemAsync(int id, int userId)
        {
            try
            {
                var item = await _context.RecurringItems.FindAsync(id);
                if (item == null) return ApiResponse<TransactionDto>.Fail("Recurring commitment not found.");

                // 1. Log transaction automatically as an Expense
                var transactionDesc = $"Paid: {item.Description}";
                var transactionType = "Expense";
                var transactionCategory = item.Type; // Loan, EMI, or Bill
                var transactionDate = DateTime.UtcNow;

                var idList = await _context.Database
                    .SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreateTransaction @Description = {0}, @Amount = {1}, @Type = {2}, @Date = {3}, @Category = {4}, @UserId = {5}",
                        transactionDesc, item.Amount, transactionType, transactionDate, transactionCategory, userId)
                    .ToListAsync();

                var newTransactionId = (int)idList.FirstOrDefault();

                // 2. Advance the expiry/due date automatically based on frequency
                if (item.Frequency.Equals("Monthly", StringComparison.OrdinalIgnoreCase))
                {
                    item.DueDate = item.DueDate.AddMonths(1);
                }
                else if (item.Frequency.Equals("Yearly", StringComparison.OrdinalIgnoreCase))
                {
                    item.DueDate = item.DueDate.AddYears(1);
                }

                await _context.SaveChangesAsync();

                var transactionDto = new TransactionDto
                {
                    Id = newTransactionId,
                    Description = transactionDesc,
                    Amount = item.Amount,
                    Type = transactionType,
                    Date = transactionDate,
                    Category = transactionCategory,
                    UserId = userId
                };

                return ApiResponse<TransactionDto>.Success(transactionDto, "Committed bill paid and logged successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<TransactionDto>.Fail($"Failed to process payment: {ex.Message}");
            }
        }
    }
}
