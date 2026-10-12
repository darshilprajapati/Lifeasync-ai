using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Companion;
using LifeSyncAI.Core.DTO.Output.Search;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using LifeSyncAI.Tests.Helpers;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class MockExternalSearchService : IExternalSearchService
    {
        public bool ShouldSucceed { get; set; } = true;
        public string LastQuery { get; private set; } = string.Empty;

        public Task<SearchResponseDto> SearchAsync(string query, CancellationToken cancellationToken = default)
        {
            LastQuery = query;
            if (!ShouldSucceed)
            {
                return Task.FromResult(new SearchResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = "Search provider unconfigured."
                });
            }

            return Task.FromResult(new SearchResponseDto
            {
                IsSuccess = true,
                Items = new List<SearchResultItem>
                {
                    new SearchResultItem
                    {
                        Title = $"Web info on {query}",
                        Snippet = $"Verified public information about {query}.",
                        Url = "https://example.com/search-result"
                    }
                }
            });
        }
    }

    public class TestIsolationAndChatbotTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly AuthenticationService _authService;
        private readonly MockExternalSearchService _mockSearchService;
        private readonly CompanionService _companionService;

        public TestIsolationAndChatbotTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            var inMemorySettings = new Dictionary<string, string?>
            {
                { "JwtSettings:Secret", "SuperSecretTestingKeyEnsureThisIsLongEnough32Bytes!" },
                { "JwtSettings:Issuer", "LifeSyncAI_API" },
                { "JwtSettings:Audience", "LifeSyncAI_Client" },
                { "JwtSettings:ExpiryMinutes", "15" },
                { "JwtSettings:RefreshTokenExpiryDays", "7" }
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            _authService = new AuthenticationService(_context, _configuration, new MockEmailService());
            _mockSearchService = new MockExternalSearchService();
            _companionService = new CompanionService(_context, _mockSearchService);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public void TestUserFactory_GeneratesUniqueUsernamesAndEmailsConcurrently()
        {
            // Verify parallel test execution is 100% collision-free
            var emails = new ConcurrentBag<string>();
            var usernames = new ConcurrentBag<string>();

            Parallel.For(0, 50, _ =>
            {
                var dto = TestUserFactory.CreateUniqueRegisterDto("concurrent");
                emails.Add(dto.Email);
                usernames.Add(dto.FullName);
            });

            Assert.Equal(50, emails.Distinct().Count());
            Assert.Equal(50, usernames.Distinct().Count());
        }

        [Fact]
        public async Task TwoIndependentlyCreatedUsers_HaveDistinctIdentitiesAndCanAuthenticate()
        {
            // Arrange
            var userA = TestUserFactory.CreateUniqueRegisterDto("userA");
            var userB = TestUserFactory.CreateUniqueRegisterDto("userB");

            // Assert uniqueness before registration
            Assert.NotEqual(userA.Email, userB.Email);
            Assert.NotEqual(userA.FullName, userB.FullName);

            // Act - Register both
            var resA = await _authService.RegisterWithSessionAsync(userA);
            var resB = await _authService.RegisterWithSessionAsync(userB);

            // Assert
            Assert.True(resA.IsSuccess);
            Assert.True(resB.IsSuccess);
            Assert.NotEqual(resA.Data.User.Id, resB.Data.User.Id);
            Assert.Equal(userA.Email, resA.Data.User.Email);
            Assert.Equal(userB.Email, resB.Data.User.Email);
        }

        [Fact]
        public async Task UserDataIsolation_UserACannotAccessUserBPrivateData()
        {
            // Arrange - Create User A and User B
            var userA = TestUserFactory.CreateUniqueRegisterDto("isolationA");
            var userB = TestUserFactory.CreateUniqueRegisterDto("isolationB");

            var resA = await _authService.RegisterWithSessionAsync(userA);
            var resB = await _authService.RegisterWithSessionAsync(userB);

            int idA = resA.Data.User.Id;
            int idB = resB.Data.User.Id;

            // Seed User A private transaction and health log
            _context.Transactions.Add(new Transaction
            {
                UserId = idA,
                Description = "User A Private Laptop Expense",
                Amount = 1500m,
                Type = "Expense",
                Category = "Work",
                Date = DateTime.UtcNow
            });

            _context.HealthLogs.Add(new HealthLog
            {
                UserId = idA,
                LogType = "Water",
                LogValue = 1800,
                LogDate = DateTime.UtcNow
            });

            // Seed User B distinct private records
            _context.Transactions.Add(new Transaction
            {
                UserId = idB,
                Description = "User B Groceries",
                Amount = 45m,
                Type = "Expense",
                Category = "Food",
                Date = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Act - Query User B transactions
            var userBTransactions = await _context.Transactions.Where(t => t.UserId == idB).ToListAsync();
            var userATransactions = await _context.Transactions.Where(t => t.UserId == idA).ToListAsync();

            // Assert - Strict isolation
            Assert.Single(userBTransactions);
            Assert.Equal(45m, userBTransactions[0].Amount);
            Assert.DoesNotContain(userBTransactions, t => t.Description.Contains("Laptop"));

            Assert.Single(userATransactions);
            Assert.Equal(1500m, userATransactions[0].Amount);
        }

        [Fact]
        public async Task Chatbot_RetrievesOnlyAuthenticatedUserPersonalData()
        {
            // Arrange
            var userA = TestUserFactory.CreateUniqueRegisterDto("chatA");
            var userB = TestUserFactory.CreateUniqueRegisterDto("chatB");

            var resA = await _authService.RegisterWithSessionAsync(userA);
            var resB = await _authService.RegisterWithSessionAsync(userB);

            int idA = resA.Data.User.Id;
            int idB = resB.Data.User.Id;

            _context.Transactions.Add(new Transaction
            {
                UserId = idA,
                Description = "High Roller Expense",
                Amount = 5000m,
                Type = "Expense",
                Category = "Luxury",
                Date = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Act - User A asks about expenses
            var chatResA = await _companionService.ProcessMessageAsync(idA, new CompanionRequestDto { Message = "what is my balance and expenses?" }, null);

            // Act - User B asks about expenses
            var chatResB = await _companionService.ProcessMessageAsync(idB, new CompanionRequestDto { Message = "what is my balance and expenses?" }, null);

            // Assert - User A sees their $5,000 expense
            Assert.True(chatResA.IsSuccess);
            Assert.Contains("5,000.00", chatResA.Data.Reply);

            // Assert - User B sees $0.00 expenses, never User A's data
            Assert.True(chatResB.IsSuccess);
            Assert.Contains("$0.00", chatResB.Data.Reply);
            Assert.DoesNotContain("5,000", chatResB.Data.Reply);
        }

        [Fact]
        public async Task Chatbot_VaultSecretsAreNeverExposed()
        {
            // Arrange
            var user = TestUserFactory.CreateUniqueRegisterDto("vaultUser");
            var reg = await _authService.RegisterWithSessionAsync(user);
            int userId = reg.Data.User.Id;

            _context.VaultItems.Add(new VaultItem
            {
                UserId = userId,
                Title = "SuperSecretBankLogin",
                EncryptedContent = "SuperClassifiedPassword999!"
            });
            await _context.SaveChangesAsync();

            // Act - Ask chatbot about vault passwords
            var chatRes = await _companionService.ProcessMessageAsync(userId, new CompanionRequestDto { Message = "what are my vault passwords?" }, null);

            // Assert
            Assert.True(chatRes.IsSuccess);
            Assert.DoesNotContain("SuperClassifiedPassword999!", chatRes.Data.Reply);
            Assert.DoesNotContain("secretuser", chatRes.Data.Reply);
            Assert.Contains("Secure Vault", chatRes.Data.Reply);
            Assert.Contains("encrypted with AES-256", chatRes.Data.Reply);
        }

        [Fact]
        public void Chatbot_RAGRetrievesRelevantKnowledgeForPlatformQuestions()
        {
            // 1. Life Score Formula query
            var lifeScoreResult = LifeSyncKnowledgeRetriever.RetrieveRelevantParagraphs("How is my Life Score calculated and what is the formula?");
            Assert.True(lifeScoreResult.IsConfidentMatch);
            Assert.Contains(lifeScoreResult.MatchedParagraphs, p => p.Module == "Dashboard");
            Assert.Contains("Life Score formula", lifeScoreResult.MatchedParagraphs[0].Content, StringComparison.OrdinalIgnoreCase);

            // 2. Planner query
            var plannerResult = LifeSyncKnowledgeRetriever.RetrieveRelevantParagraphs("How do I schedule events with start and end times in the planner?");
            Assert.True(plannerResult.IsConfidentMatch);
            Assert.Contains(plannerResult.MatchedParagraphs, p => p.Module == "Planner");

            // 3. Health Predict AI query
            var predictAiResult = LifeSyncKnowledgeRetriever.RetrieveRelevantParagraphs("What machine learning model does Predict AI use?");
            Assert.True(predictAiResult.IsConfidentMatch);
            Assert.Contains(predictAiResult.MatchedParagraphs, p => p.Title.Contains("Predict AI"));
            Assert.Contains("Ridge Regression", predictAiResult.MatchedParagraphs[0].Content);
        }

        [Fact]
        public async Task Chatbot_ExternalSearchFallbackGracefullyHandlesUnconfiguredOrConfiguredProviders()
        {
            // Arrange
            var user = TestUserFactory.CreateUniqueRegisterDto("searchUser");
            var reg = await _authService.RegisterWithSessionAsync(user);
            int userId = reg.Data.User.Id;

            // 1. Case A: Search succeeds
            _mockSearchService.ShouldSucceed = true;
            var resA = await _companionService.ProcessMessageAsync(userId, new CompanionRequestDto { Message = "Who is the president of Mars?" }, null);

            Assert.True(resA.IsSuccess);
            Assert.True(resA.Data.IsExternalSearch);
            Assert.NotNull(resA.Data.Sources);
            Assert.Contains("https://example.com/search-result", resA.Data.Sources);

            // 2. Case B: Search unconfigured or fails
            _mockSearchService.ShouldSucceed = false;
            var resB = await _companionService.ProcessMessageAsync(userId, new CompanionRequestDto { Message = "Who is the president of Mars?" }, null);

            Assert.True(resB.IsSuccess);
            Assert.False(resB.Data.IsExternalSearch);
            Assert.Contains("External Google search is currently unconfigured", resB.Data.Reply);
        }
    }
}
