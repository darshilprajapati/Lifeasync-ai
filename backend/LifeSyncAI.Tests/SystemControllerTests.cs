using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using LifeSyncAI.API.Controllers;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Output.System;
using LifeSyncAI.Core.Responses;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "LifeSyncAI.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    public class TestMockEmailService : LifeSyncAI.Core.Contracts.Interfaces.Services.IEmailService
    {
        public string? LastRecipient { get; private set; }
        public string? LastSubject { get; private set; }
        public string? LastBody { get; private set; }

        public Task SendEmailAsync(string toEmail, string subject, string body)
        {
            LastRecipient = toEmail;
            LastSubject = subject;
            LastBody = body;
            return Task.CompletedTask;
        }
    }

    public class SystemControllerTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly TestHostEnvironment _environment;
        private const string TestSecret = "TestSecretKeepAliveKey1234567890!";

        public SystemControllerTests()
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
                { "KeepAliveSettings:SecretKey", TestSecret }
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            _environment = new TestHostEnvironment { EnvironmentName = "Production" };
            _emailService = new TestMockEmailService();
        }

        private readonly TestMockEmailService _emailService;

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private SystemController CreateController(string? authHeader = null)
        {
            var controller = new SystemController(_context, _configuration, _environment, _emailService);
            var httpContext = new DefaultHttpContext();
            if (!string.IsNullOrEmpty(authHeader))
            {
                httpContext.Request.Headers["Authorization"] = authHeader;
            }
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };
            return controller;
        }

        [Fact]
        public async Task KeepAlive_WithValidKeyInHeader_ReturnsOkWithHealthyStatus()
        {
            // Arrange
            var controller = CreateController();

            // Act
            var actionResult = await controller.KeepAlive(TestSecret);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<KeepAliveResultDto>>(okResult.Value);
            Assert.True(response.IsSuccess);
            Assert.NotNull(response.Data);
            Assert.True(response.Data.DatabaseConnected);
            Assert.Equal("Healthy", response.Data.Status);
            Assert.Contains("IST", response.Data.TimestampIst);

            // Verify daily keep-alive email was dispatched to the required recipient
            Assert.Equal("gdarshil1203@gmail.com", _emailService.LastRecipient);
            Assert.NotNull(_emailService.LastSubject);
            Assert.Contains("Keep-Alive SUCCESS", _emailService.LastSubject);
        }

        [Fact]
        public async Task KeepAlive_WithInvalidKeyInHeader_ReturnsUnauthorized()
        {
            // Arrange
            var controller = CreateController();

            // Act
            var actionResult = await controller.KeepAlive("WrongInvalidKey999!");

            // Assert
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<KeepAliveResultDto>>(unauthorizedResult.Value);
            Assert.False(response.IsSuccess);
            Assert.Contains("Unauthorized", response.Message);
        }

        [Fact]
        public async Task KeepAlive_WithMissingKey_ReturnsUnauthorized()
        {
            // Arrange
            var controller = CreateController();

            // Act
            var actionResult = await controller.KeepAlive(null);

            // Assert
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<KeepAliveResultDto>>(unauthorizedResult.Value);
            Assert.False(response.IsSuccess);
            Assert.Contains("Unauthorized", response.Message);
        }

        [Fact]
        public async Task KeepAlive_WithValidBearerToken_ReturnsOk()
        {
            // Arrange
            var controller = CreateController(authHeader: $"Bearer {TestSecret}");

            // Act - header parameter is null, should fall back to Authorization header
            var actionResult = await controller.KeepAlive(null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<KeepAliveResultDto>>(okResult.Value);
            Assert.True(response.IsSuccess);
            Assert.NotNull(response.Data);
            Assert.True(response.Data.DatabaseConnected);
        }
    }
}
