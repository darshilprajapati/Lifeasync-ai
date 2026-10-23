using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Finance;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class HealthTargetsAndBudgetTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly HealthService _healthService;
        private readonly FinanceService _financeService;

        public HealthTargetsAndBudgetTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            _healthService = new HealthService(_context);
            _financeService = new FinanceService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private async Task<User> CreateUserAsync(string email = "targetuser@example.com")
        {
            var user = new User
            {
                Email = email,
                FullName = "Health & Budget Test User",
                PasswordHash = "hash123",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        // ==========================================
        // HEALTH TARGETS TESTS
        // ==========================================

        [Fact]
        public async Task GetTargets_ReturnsSensibleDefaults_WhenNoCustomTargetsConfigured()
        {
            var user = await CreateUserAsync("defaults@example.com");

            var res = await _healthService.GetTargetsAsync(user.Id);

            Assert.True(res.IsSuccess);
            Assert.NotNull(res.Data);
            Assert.Equal(2000, res.Data.DailyWaterGoal);
            Assert.Equal(8.0, res.Data.DailySleepGoal);
            Assert.Equal(10000, res.Data.DailyStepsGoal);
            Assert.Equal(2000, res.Data.DailyCalorieGoal);
            Assert.Equal(30, res.Data.DailyWorkoutGoal);
        }

        [Fact]
        public async Task UpdateTargets_PersistsCustomValues_AndReloadPreservesTargets()
        {
            var user = await CreateUserAsync("update@example.com");

            var updateDto = new UpdateHealthTargetsDto
            {
                DailyWaterGoal = 3200,
                DailySleepGoal = 7.5,
                DailyStepsGoal = 12500,
                DailyCalorieGoal = 2400,
                DailyWorkoutGoal = 45
            };

            var updateRes = await _healthService.UpdateTargetsAsync(user.Id, updateDto);
            Assert.True(updateRes.IsSuccess);
            Assert.Equal(3200, updateRes.Data.DailyWaterGoal);
            Assert.Equal(7.5, updateRes.Data.DailySleepGoal);
            Assert.Equal(12500, updateRes.Data.DailyStepsGoal);
            Assert.Equal(2400, updateRes.Data.DailyCalorieGoal);
            Assert.Equal(45, updateRes.Data.DailyWorkoutGoal);

            // Fetch again to verify persistence
            var reloadRes = await _healthService.GetTargetsAsync(user.Id);
            Assert.True(reloadRes.IsSuccess);
            Assert.Equal(3200, reloadRes.Data.DailyWaterGoal);
            Assert.Equal(7.5, reloadRes.Data.DailySleepGoal);
            Assert.Equal(12500, reloadRes.Data.DailyStepsGoal);
            Assert.Equal(2400, reloadRes.Data.DailyCalorieGoal);
            Assert.Equal(45, reloadRes.Data.DailyWorkoutGoal);
        }

        [Fact]
        public async Task UpdateTargets_RejectsOutOfBoundsValues()
        {
            var user = await CreateUserAsync("bounds@example.com");

            // Water < 250
            var lowWater = await _healthService.UpdateTargetsAsync(user.Id, new UpdateHealthTargetsDto { DailyWaterGoal = 100 });
            Assert.False(lowWater.IsSuccess);

            // Water > 10000
            var highWater = await _healthService.UpdateTargetsAsync(user.Id, new UpdateHealthTargetsDto { DailyWaterGoal = 15000 });
            Assert.False(highWater.IsSuccess);

            // Sleep > 24
            var highSleep = await _healthService.UpdateTargetsAsync(user.Id, new UpdateHealthTargetsDto { DailySleepGoal = 26 });
            Assert.False(highSleep.IsSuccess);

            // Workout > 360
            var highWorkout = await _healthService.UpdateTargetsAsync(user.Id, new UpdateHealthTargetsDto { DailyWorkoutGoal = 500 });
            Assert.False(highWorkout.IsSuccess);
        }

        // ==========================================
        // FINANCE BUDGET PLANNER TESTS
        // ==========================================

        [Fact]
        public async Task GetBudgets_SeedsInitialPresets_WhenUserHasNoBudgets()
        {
            var user = await CreateUserAsync("budgetuser@example.com");

            var res = await _financeService.GetBudgetsAsync(user.Id);

            Assert.True(res.IsSuccess);
            Assert.NotNull(res.Data);
            Assert.Equal(5, res.Data.Count);

            var food = res.Data.FirstOrDefault(b => b.Category == "Food");
            Assert.NotNull(food);
            Assert.Equal(6000m, food.MonthlyLimit);

            var shopping = res.Data.FirstOrDefault(b => b.Category == "Shopping");
            Assert.NotNull(shopping);
            Assert.Equal(400m, shopping.MonthlyLimit);
        }

        [Fact]
        public async Task CreateBudget_AddsNewCategory_AndCalculatesSpending()
        {
            var user = await CreateUserAsync("createbudget@example.com");

            // Add an expense transaction
            await _financeService.CreateTransactionAsync(new CreateTransactionDto
            {
                Description = "Health Insurance Premium",
                Amount = 1500m,
                Category = "Health & Medical",
                Type = "Expense",
                Date = DateTime.UtcNow
            }, user.Id);

            var res = await _financeService.CreateBudgetAsync(user.Id, new CreateUserBudgetDto
            {
                Category = "Health & Medical",
                MonthlyLimit = 3000m
            });

            Assert.True(res.IsSuccess);
            Assert.Equal("Health & Medical", res.Data.Category);
            Assert.Equal(3000m, res.Data.MonthlyLimit);
            Assert.Equal(1500m, res.Data.Spent);
            Assert.Equal(1500m, res.Data.Remaining);
            Assert.Equal(50, res.Data.Percentage);
            Assert.False(res.Data.IsOverBudget);
        }

        [Fact]
        public async Task UpdateBudget_ModifiesLimit_AndDetectsOverBudget()
        {
            var user = await CreateUserAsync("updatebudget@example.com");

            var created = await _financeService.CreateBudgetAsync(user.Id, new CreateUserBudgetDto
            {
                Category = "Groceries",
                MonthlyLimit = 5000m
            });
            Assert.True(created.IsSuccess);

            // Spend 4500
            await _financeService.CreateTransactionAsync(new CreateTransactionDto
            {
                Description = "Supermarket run",
                Amount = 4500m,
                Category = "Groceries",
                Type = "Expense",
                Date = DateTime.UtcNow
            }, user.Id);

            // Lower budget to 4000 -> Should now be over budget
            var updated = await _financeService.UpdateBudgetAsync(user.Id, created.Data.Id, new UpdateUserBudgetDto
            {
                Category = "Groceries",
                MonthlyLimit = 4000m
            });

            Assert.True(updated.IsSuccess);
            Assert.Equal(4000m, updated.Data.MonthlyLimit);
            Assert.Equal(4500m, updated.Data.Spent);
            Assert.True(updated.Data.IsOverBudget);
            Assert.Equal(112, updated.Data.Percentage); // 4500 / 4000 = 112.5 -> 112% (MidpointRounding.ToEven)
        }

        [Fact]
        public async Task DeleteBudget_RemovesBudget_WithoutModifyingTransactions()
        {
            var user = await CreateUserAsync("deletebudget@example.com");

            var created = await _financeService.CreateBudgetAsync(user.Id, new CreateUserBudgetDto
            {
                Category = "Books",
                MonthlyLimit = 1000m
            });
            Assert.True(created.IsSuccess);

            // Add transaction in this category
            var txRes = await _financeService.CreateTransactionAsync(new CreateTransactionDto
            {
                Description = "Programming Guide",
                Amount = 600m,
                Category = "Books",
                Type = "Expense",
                Date = DateTime.UtcNow
            }, user.Id);
            Assert.True(txRes.IsSuccess);

            // Delete the budget limit
            var delRes = await _financeService.DeleteBudgetAsync(user.Id, created.Data.Id);
            Assert.True(delRes.IsSuccess);

            // Transaction must remain intact!
            var txListRes = await _financeService.GetTransactionsAsync(user.Id);
            Assert.True(txListRes.IsSuccess);
            Assert.Single(txListRes.Data);
            Assert.Equal("Programming Guide", txListRes.Data[0].Description);
        }
    }
}
