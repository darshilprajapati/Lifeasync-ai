using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Career;
using LifeSyncAI.Core.DTO.Input.Finance;
using LifeSyncAI.Core.DTO.Input.Planner;
using LifeSyncAI.Core.DTO.Input.Vault;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class ModuleUpgradeTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly PlannerService _plannerService;
        private readonly CareerService _careerService;
        private readonly FinanceService _financeService;
        private readonly VaultService _vaultService;
        private readonly AiInsightsService _aiInsightsService;

        public ModuleUpgradeTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            _plannerService = new PlannerService(_context);
            _careerService = new CareerService(_context);
            _financeService = new FinanceService(_context);
            _vaultService = new VaultService(_context);
            _aiInsightsService = new AiInsightsService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private async Task<User> CreateUserAsync(string email = "testuser@example.com")
        {
            var user = new User
            {
                Email = email,
                FullName = "Test User",
                PasswordHash = "hash123",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        // ==========================================
        // 1. PLANNER TESTS
        // ==========================================

        [Fact]
        public async Task Planner_CreateTaskInSpecificStatus_PersistsCorrectly()
        {
            var user = await CreateUserAsync("planner_user1@test.com");
            var now = DateTime.UtcNow;

            var createDto = new CreatePlannerEventDto
            {
                Title = "Implement Kanban Board",
                Description = "Taskmate-style UI",
                StartTime = now.AddHours(1),
                EndTime = now.AddHours(3),
                Status = "InProgress",
                Priority = "High",
                Category = "Development"
            };

            var res = await _plannerService.CreateEventAsync(createDto, user.Id, now);
            Assert.True(res.IsSuccess);
            Assert.Equal("InProgress", res.Data.Status);
            Assert.Equal("High", res.Data.Priority);
            Assert.Equal("Development", res.Data.Category);
            Assert.False(res.Data.IsCompleted);
        }

        [Fact]
        public async Task Planner_UpdateStatus_MovesTaskBetweenColumns()
        {
            var user = await CreateUserAsync("planner_user2@test.com");
            var now = DateTime.UtcNow;

            var createDto = new CreatePlannerEventDto
            {
                Title = "Draft Architecture",
                StartTime = now.AddHours(1),
                EndTime = now.AddHours(4),
                Status = "Todo"
            };

            var created = await _plannerService.CreateEventAsync(createDto, user.Id, now);
            int eventId = created.Data.Id;

            // Move to InProgress
            var move1 = await _plannerService.UpdateStatusAsync(eventId, "InProgress", user.Id);
            Assert.True(move1.IsSuccess);

            var eventAfterMove1 = await _context.PlannerEvents.FindAsync(eventId);
            Assert.Equal("InProgress", eventAfterMove1!.Status);
            Assert.False(eventAfterMove1.IsCompleted);

            // Move to Completed
            var move2 = await _plannerService.UpdateStatusAsync(eventId, "Completed", user.Id);
            Assert.True(move2.IsSuccess);

            var eventAfterMove2 = await _context.PlannerEvents.FindAsync(eventId);
            Assert.Equal("Completed", eventAfterMove2!.Status);
            Assert.True(eventAfterMove2.IsCompleted);
            Assert.NotNull(eventAfterMove2.CompletedAt);
        }

        [Fact]
        public async Task Planner_OverduePenalty_IsIdempotentAndRetainedOnDelete()
        {
            var user = await CreateUserAsync("planner_user3@test.com");
            var pastTime = DateTime.UtcNow.AddHours(-5);

            var overdueEvent = new PlannerEvent
            {
                Title = "Missed Presentation",
                StartTime = pastTime.AddHours(-2),
                EndTime = pastTime, // in the past
                IsCompleted = false,
                UserId = user.Id,
                Status = "Todo"
            };
            _context.PlannerEvents.Add(overdueEvent);
            await _context.SaveChangesAsync();

            // Calling GetEventsAsync triggers idempotent penalty evaluation
            var listRes1 = await _plannerService.GetEventsAsync(user.Id, DateTime.UtcNow);
            Assert.True(listRes1.IsSuccess);

            var ev1 = await _context.PlannerEvents.FindAsync(overdueEvent.Id);
            Assert.True(ev1!.MissedDeadlinePenalized);
            var firstPenaltyDate = ev1.PenaltyAppliedAt;
            Assert.NotNull(firstPenaltyDate);

            // Recalculating again must NOT re-apply or duplicate penalty
            var listRes2 = await _plannerService.GetEventsAsync(user.Id, DateTime.UtcNow);
            Assert.True(listRes2.IsSuccess);
            var ev2 = await _context.PlannerEvents.FindAsync(overdueEvent.Id);
            Assert.Equal(firstPenaltyDate, ev2!.PenaltyAppliedAt);

            // Deleting overdue task retains penalty record in UserNotificationLogs
            var delRes = await _plannerService.DeleteEventAsync(overdueEvent.Id, user.Id);
            Assert.True(delRes.IsSuccess);

            var penaltyLog = await _context.UserNotificationLogs
                .FirstOrDefaultAsync(l => l.UserId == user.Id && l.ReferenceId == overdueEvent.Id.ToString());
            Assert.NotNull(penaltyLog);
            Assert.Equal("MissedDeadlinePenalty", penaltyLog.NotificationType);
        }

        // ==========================================
        // 2. CAREER TESTS
        // ==========================================

        [Fact]
        public async Task Career_CreateJob_AddsInitialStageHistory()
        {
            var user = await CreateUserAsync("career_user1@test.com");
            var createDto = new CreateJobApplicationDto
            {
                Company = "Stripe",
                Position = "Backend Engineer",
                Status = "Applied",
                AppliedDate = DateTime.UtcNow.Date,
                Notes = "Submitted referral link",
                Category = "Fintech",
                JobType = "Full-time",
                WorkplaceType = "Remote",
                Location = "San Francisco, CA",
                Salary = "$160k - $190k",
                Url = "https://stripe.com/jobs/123"
            };

            var res = await _careerService.CreateApplicationAsync(createDto, user.Id);
            Assert.True(res.IsSuccess);
            Assert.Equal("Stripe", res.Data.Company);
            Assert.Single(res.Data.StageHistories);
            Assert.Equal("Created", res.Data.StageHistories[0].FromStage);
            Assert.Equal("Applied", res.Data.StageHistories[0].ToStage);
        }

        [Fact]
        public async Task Career_StageTransition_RecordsHistoryWithOptionalNote()
        {
            var user = await CreateUserAsync("career_user2@test.com");
            var createDto = new CreateJobApplicationDto
            {
                Company = "Google",
                Position = "Systems Engineer",
                Status = "Applied",
                AppliedDate = DateTime.UtcNow.Date
            };

            var created = await _careerService.CreateApplicationAsync(createDto, user.Id);
            int appId = created.Data.Id;

            // Move to Interview with note
            string interviewNote = "Recruiter scheduled technical interview for next Monday.";
            var transition1 = await _careerService.UpdateStatusAsync(appId, "Interview", interviewNote, user.Id);
            Assert.True(transition1.IsSuccess);

            // Move to Offered without note (skip note)
            var transition2 = await _careerService.UpdateStatusAsync(appId, "Offered", null, user.Id);
            Assert.True(transition2.IsSuccess);

            var allApps = await _careerService.GetApplicationsAsync(user.Id);
            var app = allApps.Data.First(a => a.Id == appId);
            Assert.Equal("Offered", app.Status);

            // 3 histories: Initial Created->Applied, Applied->Interview (with note), Interview->Offered (no note)
            Assert.Equal(3, app.StageHistories.Count);
            Assert.Equal("Applied", app.StageHistories[1].FromStage);
            Assert.Equal("Interview", app.StageHistories[1].ToStage);
            Assert.Equal(interviewNote, app.StageHistories[1].Note);

            Assert.Equal("Interview", app.StageHistories[2].FromStage);
            Assert.Equal("Offered", app.StageHistories[2].ToStage);
            Assert.Null(app.StageHistories[2].Note);
        }

        [Fact]
        public async Task Career_UserIsolation_PreventsUnauthorizedAccess()
        {
            var user1 = await CreateUserAsync("user1@career.com");
            var user2 = await CreateUserAsync("user2@career.com");

            var createDto = new CreateJobApplicationDto
            {
                Company = "Apple",
                Position = "iOS Lead",
                Status = "Applied",
                AppliedDate = DateTime.UtcNow.Date
            };
            var created = await _careerService.CreateApplicationAsync(createDto, user1.Id);
            int appId = created.Data.Id;

            // User 2 cannot update status of user 1's job
            var failStatus = await _careerService.UpdateStatusAsync(appId, "Interview", "Hacked note", user2.Id);
            Assert.False(failStatus.IsSuccess);

            // User 2 cannot delete user 1's job
            var failDelete = await _careerService.DeleteApplicationAsync(appId, user2.Id);
            Assert.False(failDelete.IsSuccess);

            // Job still exists
            var check = await _context.JobApplications.FindAsync(appId);
            Assert.NotNull(check);
        }

        // ==========================================
        // 3. FINANCE TESTS
        // ==========================================

        [Fact]
        public async Task Finance_UpdateAndOwnership_WorksCleanly()
        {
            var user1 = await CreateUserAsync("fin1@test.com");
            var user2 = await CreateUserAsync("fin2@test.com");

            var createDto = new CreateTransactionDto
            {
                Description = "AWS Hosting",
                Amount = 150.00m,
                Type = "Expense",
                Date = DateTime.UtcNow,
                Category = "Cloud"
            };

            var created = await _financeService.CreateTransactionAsync(createDto, user1.Id);
            int txId = created.Data.Id;

            // User 2 cannot update
            var updateDto = new UpdateTransactionDto
            {
                Description = "AWS Enterprise",
                Amount = 250.00m,
                Type = "Expense",
                Date = DateTime.UtcNow,
                Category = "Cloud"
            };
            var failUpdate = await _financeService.UpdateTransactionAsync(txId, updateDto, user2.Id);
            Assert.False(failUpdate.IsSuccess);

            // User 1 can update
            var okUpdate = await _financeService.UpdateTransactionAsync(txId, updateDto, user1.Id);
            Assert.True(okUpdate.IsSuccess);
            Assert.Equal(250.00m, okUpdate.Data.Amount);

            // Summary checks
            var summary = await _financeService.GetSummaryAsync(user1.Id);
            Assert.Equal(250.00m, summary.Data.TotalExpense);
        }

        // ==========================================
        // 4. VAULT TESTS
        // ==========================================

        [Fact]
        public async Task Vault_EncryptionAndOwnership_ProtectsData()
        {
            var user1 = await CreateUserAsync("vault1@test.com");
            var user2 = await CreateUserAsync("vault2@test.com");

            var createDto = new CreateVaultItemDto
            {
                Title = "GitHub PAT",
                Content = "ghp_SuperSecretToken1234567890",
                Category = "Login"
            };

            var created = await _vaultService.CreateItemAsync(createDto, user1.Id);
            int itemId = created.Data.Id;

            // Verify stored in DB is encrypted and NOT plain text
            var dbItem = await _context.VaultItems.FindAsync(itemId);
            Assert.NotNull(dbItem);
            Assert.DoesNotContain("ghp_SuperSecretToken", dbItem.EncryptedContent);

            // User 2 cannot update or access
            var updateDto = new UpdateVaultItemDto
            {
                Title = "Hacked Title",
                Content = "Hacked Content",
                Category = "Login"
            };
            var failUpdate = await _vaultService.UpdateItemAsync(itemId, updateDto, user2.Id);
            Assert.False(failUpdate.IsSuccess);

            // User 2 cannot delete
            var failDelete = await _vaultService.DeleteItemAsync(itemId, user2.Id);
            Assert.False(failDelete.IsSuccess);

            // User 1 can update
            var okUpdate = await _vaultService.UpdateItemAsync(itemId, new UpdateVaultItemDto
            {
                Title = "GitHub PAT - Updated",
                Content = "ghp_RotatedSecretKey9999",
                Category = "Login"
            }, user1.Id);
            Assert.True(okUpdate.IsSuccess);
            Assert.Equal("ghp_RotatedSecretKey9999", okUpdate.Data.Content);
        }

        // ==========================================
        // 5. AI INSIGHTS TESTS
        // ==========================================

        [Fact]
        public async Task AiInsights_GeneratesInsightsWithoutExposingVaultSecrets()
        {
            var user = await CreateUserAsync("insights_user@test.com");

            // Seed Vault items
            await _vaultService.CreateItemAsync(new CreateVaultItemDto
            {
                Title = "Banking Master Password",
                Content = "SuperSensitiveBankPassword!123",
                Category = "Login"
            }, user.Id);

            // Seed an overdue planner task
            await _plannerService.CreateEventAsync(new CreatePlannerEventDto
            {
                Title = "Overdue Client Deliverable",
                StartTime = DateTime.UtcNow.AddDays(-2),
                EndTime = DateTime.UtcNow.AddDays(-1), // overdue
                Status = "Todo"
            }, user.Id, DateTime.UtcNow);

            var insightsRes = await _aiInsightsService.GenerateRecommendationsAsync(user.Id);
            Assert.True(insightsRes.IsSuccess);
            Assert.NotEmpty(insightsRes.Data);

            // Verify absolutely no Vault plain-text or cipher-text content leaked into insights
            foreach (var insight in insightsRes.Data)
            {
                Assert.DoesNotContain("SuperSensitiveBankPassword", insight.InsightText);
                Assert.DoesNotContain("Banking Master Password", insight.InsightText);
            }

            // Verify overdue insight generated
            Assert.Contains(insightsRes.Data, i => i.InsightText.Contains("Overdue Alert"));
        }
    }
}
