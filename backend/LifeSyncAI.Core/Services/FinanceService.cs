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
                    .Where(t => t.UserId == userId)
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
                var transaction = new Transaction
                {
                    Description = dto.Description,
                    Amount = dto.Amount,
                    Type = dto.Type,
                    Date = dto.Date,
                    Category = dto.Category,
                    UserId = userId
                };

                await _context.Transactions.AddAsync(transaction);
                await _context.SaveChangesAsync();

                var createdDto = new TransactionDto
                {
                    Id = transaction.Id,
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

        public async Task<ApiResponse<TransactionDto>> UpdateTransactionAsync(int id, UpdateTransactionDto dto, int userId)
        {
            try
            {
                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction == null || transaction.UserId != userId)
                {
                    return ApiResponse<TransactionDto>.Fail("Transaction not found or access denied.");
                }

                transaction.Description = dto.Description.Trim();
                transaction.Amount = dto.Amount;
                transaction.Type = dto.Type.Trim();
                transaction.Date = dto.Date;
                transaction.Category = dto.Category.Trim();

                await _context.SaveChangesAsync();

                var updatedDto = new TransactionDto
                {
                    Id = transaction.Id,
                    Description = transaction.Description,
                    Amount = transaction.Amount,
                    Type = transaction.Type,
                    Date = transaction.Date,
                    Category = transaction.Category,
                    UserId = userId
                };

                return ApiResponse<TransactionDto>.Success(updatedDto, "Transaction updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<TransactionDto>.Fail($"Failed to update transaction: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteTransactionAsync(int id, int userId = 0)
        {
            try
            {
                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction != null)
                {
                    if (userId > 0 && transaction.UserId != userId)
                    {
                        return ApiResponse<bool>.Fail("Transaction not found or access denied.");
                    }
                    _context.Transactions.Remove(transaction);
                    await _context.SaveChangesAsync();
                }

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
                var userTransactions = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .ToListAsync();

                decimal totalIncome = userTransactions
                    .Where(t => t.Type.Equals("Income", StringComparison.OrdinalIgnoreCase))
                    .Sum(t => t.Amount);

                decimal totalExpense = userTransactions
                    .Where(t => t.Type.Equals("Expense", StringComparison.OrdinalIgnoreCase))
                    .Sum(t => t.Amount);

                decimal balance = totalIncome - totalExpense;

                var summary = new FinanceSummaryDto
                {
                    TotalIncome = totalIncome,
                    TotalExpense = totalExpense,
                    Balance = balance
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

        public async Task<ApiResponse<bool>> DeleteRecurringItemAsync(int id, int userId = 0)
        {
            try
            {
                var item = await _context.RecurringItems.FindAsync(id);
                if (item == null) return ApiResponse<bool>.Fail("Recurring commitment not found.");
                if (userId > 0 && item.UserId != userId) return ApiResponse<bool>.Fail("Access denied.");

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

                var transaction = new Transaction
                {
                    Description = transactionDesc,
                    Amount = item.Amount,
                    Type = transactionType,
                    Date = transactionDate,
                    Category = transactionCategory,
                    UserId = userId
                };

                await _context.Transactions.AddAsync(transaction);

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
                    Id = transaction.Id,
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

        public async Task<ApiResponse<List<UserBudgetDto>>> GetBudgetsAsync(int userId)
        {
            try
            {
                var budgets = await _context.UserBudgets
                    .Where(b => b.UserId == userId)
                    .OrderBy(b => b.Category)
                    .ToListAsync();

                // If no budgets configured, provide standard defaults
                if (!budgets.Any())
                {
                    var defaults = new List<(string Cat, decimal Limit)>
                    {
                        ("Food", 6000m),
                        ("Shopping", 400m),
                        ("Entertainment", 300m),
                        ("Utilities", 250m),
                        ("Transport", 200m)
                    };

                    foreach (var d in defaults)
                    {
                        var ub = new UserBudget
                        {
                            UserId = userId,
                            Category = d.Cat,
                            MonthlyLimit = d.Limit
                        };
                        await _context.UserBudgets.AddAsync(ub);
                    }
                    await _context.SaveChangesAsync();

                    budgets = await _context.UserBudgets
                        .Where(b => b.UserId == userId)
                        .OrderBy(b => b.Category)
                        .ToListAsync();
                }

                // Calculate current month's actual expenses per category
                var now = DateTime.UtcNow;
                var startOfMonth = new DateTime(now.Year, now.Month, 1);
                var monthlyExpenses = await _context.Transactions
                    .Where(t => t.UserId == userId && t.Type.ToLower() == "expense" && t.Date >= startOfMonth)
                    .ToListAsync();

                var dtos = budgets.Select(b =>
                {
                    var spent = monthlyExpenses
                        .Where(t => string.Equals(t.Category, b.Category, StringComparison.OrdinalIgnoreCase))
                        .Sum(t => t.Amount);

                    var pct = b.MonthlyLimit > 0 ? (int)Math.Round((spent / b.MonthlyLimit) * 100) : 0;
                    var remaining = b.MonthlyLimit - spent;

                    return new UserBudgetDto
                    {
                        Id = b.Id,
                        Category = b.Category,
                        MonthlyLimit = b.MonthlyLimit,
                        Spent = spent,
                        Remaining = remaining,
                        Percentage = pct,
                        IsOverBudget = spent > b.MonthlyLimit
                    };
                }).ToList();

                return ApiResponse<List<UserBudgetDto>>.Success(dtos, "Budgets retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<UserBudgetDto>>.Fail($"Failed to load budgets: {ex.Message}");
            }
        }

        public async Task<ApiResponse<UserBudgetDto>> CreateBudgetAsync(int userId, CreateUserBudgetDto dto)
        {
            try
            {
                var catName = dto.Category?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(catName))
                    return ApiResponse<UserBudgetDto>.Fail("Category name cannot be empty.");

                if (dto.MonthlyLimit <= 0)
                    return ApiResponse<UserBudgetDto>.Fail("Monthly limit must be greater than zero.");

                var exists = await _context.UserBudgets
                    .AnyAsync(b => b.UserId == userId && b.Category.ToLower() == catName.ToLower());
                if (exists)
                    return ApiResponse<UserBudgetDto>.Fail($"A budget for category '{catName}' already exists.");

                var budget = new UserBudget
                {
                    UserId = userId,
                    Category = catName,
                    MonthlyLimit = dto.MonthlyLimit
                };

                await _context.UserBudgets.AddAsync(budget);
                await _context.SaveChangesAsync();

                var now = DateTime.UtcNow;
                var startOfMonth = new DateTime(now.Year, now.Month, 1);
                var spent = await _context.Transactions
                    .Where(t => t.UserId == userId && t.Type.ToLower() == "expense" && t.Date >= startOfMonth && t.Category.ToLower() == catName.ToLower())
                    .SumAsync(t => t.Amount);

                var pct = budget.MonthlyLimit > 0 ? (int)Math.Round((spent / budget.MonthlyLimit) * 100) : 0;

                var resultDto = new UserBudgetDto
                {
                    Id = budget.Id,
                    Category = budget.Category,
                    MonthlyLimit = budget.MonthlyLimit,
                    Spent = spent,
                    Remaining = budget.MonthlyLimit - spent,
                    Percentage = pct,
                    IsOverBudget = spent > budget.MonthlyLimit
                };

                return ApiResponse<UserBudgetDto>.Success(resultDto, "Budget created successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<UserBudgetDto>.Fail($"Failed to create budget: {ex.Message}");
            }
        }

        public async Task<ApiResponse<UserBudgetDto>> UpdateBudgetAsync(int userId, int id, UpdateUserBudgetDto dto)
        {
            try
            {
                var budget = await _context.UserBudgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
                if (budget == null)
                    return ApiResponse<UserBudgetDto>.Fail("Budget not found or access denied.");

                var catName = dto.Category?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(catName))
                    return ApiResponse<UserBudgetDto>.Fail("Category name cannot be empty.");

                if (dto.MonthlyLimit <= 0)
                    return ApiResponse<UserBudgetDto>.Fail("Monthly limit must be greater than zero.");

                // If renamed category, verify no conflict
                if (!string.Equals(budget.Category, catName, StringComparison.OrdinalIgnoreCase))
                {
                    var conflict = await _context.UserBudgets
                        .AnyAsync(b => b.UserId == userId && b.Id != id && b.Category.ToLower() == catName.ToLower());
                    if (conflict)
                        return ApiResponse<UserBudgetDto>.Fail($"A budget for category '{catName}' already exists.");
                }

                budget.Category = catName;
                budget.MonthlyLimit = dto.MonthlyLimit;

                await _context.SaveChangesAsync();

                var now = DateTime.UtcNow;
                var startOfMonth = new DateTime(now.Year, now.Month, 1);
                var spent = await _context.Transactions
                    .Where(t => t.UserId == userId && t.Type.ToLower() == "expense" && t.Date >= startOfMonth && t.Category.ToLower() == catName.ToLower())
                    .SumAsync(t => t.Amount);

                var pct = budget.MonthlyLimit > 0 ? (int)Math.Round((spent / budget.MonthlyLimit) * 100) : 0;

                var resultDto = new UserBudgetDto
                {
                    Id = budget.Id,
                    Category = budget.Category,
                    MonthlyLimit = budget.MonthlyLimit,
                    Spent = spent,
                    Remaining = budget.MonthlyLimit - spent,
                    Percentage = pct,
                    IsOverBudget = spent > budget.MonthlyLimit
                };

                return ApiResponse<UserBudgetDto>.Success(resultDto, "Budget updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<UserBudgetDto>.Fail($"Failed to update budget: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteBudgetAsync(int userId, int id)
        {
            try
            {
                var budget = await _context.UserBudgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
                if (budget == null)
                    return ApiResponse<bool>.Fail("Budget not found or access denied.");

                _context.UserBudgets.Remove(budget);
                await _context.SaveChangesAsync();

                return ApiResponse<bool>.Success(true, "Budget deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete budget: {ex.Message}");
            }
        }
    }
}
