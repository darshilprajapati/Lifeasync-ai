using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class MockEmailService : IEmailService
    {
        public Task SendEmailAsync(string toEmail, string subject, string htmlContent)
        {
            return Task.CompletedTask;
        }

        public Task SendReportNotificationAsync(string toEmail, string userName, string reportType, string period, byte[] pdfBytes)
        {
            return Task.CompletedTask;
        }
    }

    public class AuthenticationServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly AuthenticationService _authService;

        public AuthenticationServiceTests()
        {
            // Set up in-memory SQLite connection for isolated tests
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

            _emailService = new MockEmailService();
            _authService = new AuthenticationService(_context, _configuration, _emailService);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task RegisterAsync_WithValidDetails_CreatesAccountSuccessfully()
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                FullName = "Jane Doe",
                Email = "jane.doe@example.com",
                Password = "SecurePassword123!"
            };

            // Act
            var result = await _authService.RegisterAsync(registerDto);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal("Jane Doe", result.Data.FullName);
            Assert.Equal("jane.doe@example.com", result.Data.Email);

            // Verify persisted in database
            var savedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "jane.doe@example.com");
            Assert.NotNull(savedUser);
            Assert.NotEqual("SecurePassword123!", savedUser.PasswordHash);
        }

        [Theory]
        [InlineData("invalid-email")]
        [InlineData("no-at-sign.com")]
        [InlineData("@missing-user.com")]
        [InlineData("missing-dot@domain")]
        public async Task RegisterAsync_WithInvalidEmail_ReturnsFailure(string invalidEmail)
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                FullName = "Jane Doe",
                Email = invalidEmail,
                Password = "SecurePassword123!"
            };

            // Act
            var result = await _authService.RegisterAsync(registerDto);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("Invalid email", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("")]
        [InlineData("12345")]
        public async Task RegisterAsync_WithInvalidPassword_ReturnsFailure(string shortPassword)
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                FullName = "Jane Doe",
                Email = "valid@example.com",
                Password = shortPassword
            };

            // Act
            var result = await _authService.RegisterAsync(registerDto);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Contains("Password", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task RegisterAsync_WithDuplicateEmail_RejectsDuplicate()
        {
            // Arrange
            var registerDto1 = new RegisterDto
            {
                FullName = "First User",
                Email = "duplicate@example.com",
                Password = "Password123!"
            };

            var registerDto2 = new RegisterDto
            {
                FullName = "Second User",
                Email = "duplicate@example.com",
                Password = "AnotherPassword123!"
            };

            // Act
            var firstResult = await _authService.RegisterAsync(registerDto1);
            var secondResult = await _authService.RegisterAsync(registerDto2);

            // Assert
            Assert.True(firstResult.IsSuccess);
            Assert.False(secondResult.IsSuccess);
            Assert.Contains("already exists", secondResult.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task LoginAsync_AfterSuccessfulRegistration_AuthenticatesUser()
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                FullName = "John Smith",
                Email = "john.smith@example.com",
                Password = "Password123!"
            };
            await _authService.RegisterAsync(registerDto);

            var loginDto = new LoginDto
            {
                Email = "john.smith@example.com",
                Password = "Password123!"
            };

            // Act
            var loginResult = await _authService.LoginAsync(loginDto);

            // Assert
            Assert.True(loginResult.IsSuccess);
            Assert.NotNull(loginResult.Data.User);
            Assert.False(string.IsNullOrEmpty(loginResult.Data.AccessToken));
            Assert.False(string.IsNullOrEmpty(loginResult.Data.RefreshToken));
        }

        [Fact]
        public async Task LoginAsync_WithWrongPassword_Fails()
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                FullName = "John Smith",
                Email = "john.wrong@example.com",
                Password = "Password123!"
            };
            await _authService.RegisterAsync(registerDto);

            var loginDto = new LoginDto
            {
                Email = "john.wrong@example.com",
                Password = "WrongPassword999!"
            };

            // Act
            var loginResult = await _authService.LoginAsync(loginDto);

            // Assert
            Assert.False(loginResult.IsSuccess);
            Assert.Contains("Invalid email or password", loginResult.Message);
        }
    }
}
