using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Career;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class CareerDateValidationTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly CareerService _careerService;

        public CareerDateValidationTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            _careerService = new CareerService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private async Task<User> CreateTestUserAsync()
        {
            var user = new User
            {
                Email = "career_tester@example.com",
                FullName = "Career Tester",
                PasswordHash = "hash",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        [Fact]
        public async Task Career_ValidFourDigitYear_Succeeds()
        {
            var user = await CreateTestUserAsync();
            var validDate = new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc);

            var dto = new CreateJobApplicationDto
            {
                Company = "Acme Corp",
                Position = "Software Engineer",
                Status = "Applied",
                AppliedDate = validDate,
                Notes = "Referred by colleague"
            };

            // Test Model Validation
            var validationContext = new ValidationContext(dto);
            var validationResults = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(dto, validationContext, validationResults, true);

            Assert.True(isValid);
            Assert.Empty(validationResults);

            // Test Service Execution
            var result = await _careerService.CreateApplicationAsync(dto, user.Id);
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal("Acme Corp", result.Data.Company);
            Assert.Equal(2026, result.Data.AppliedDate.Year);
        }

        [Theory]
        [InlineData(1899)] // Out of range year (< 1900)
        [InlineData(1750)] // Past 4-digit year (< 1900)
        [InlineData(2105)] // Future out of range year (> 2100)
        [InlineData(9999)] // Max .NET year (> 2100)
        public async Task Career_OutOfRangeYear_FailsValidationAndServiceRejects(int invalidYear)
        {
            var user = await CreateTestUserAsync();
            var invalidDate = new DateTime(invalidYear, 6, 15, 0, 0, 0, DateTimeKind.Utc);

            var dto = new CreateJobApplicationDto
            {
                Company = "Futuristic Tech",
                Position = "AI Architect",
                Status = "Applied",
                AppliedDate = invalidDate
            };

            // Model Validation check
            var validationContext = new ValidationContext(dto);
            var validationResults = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(dto, validationContext, validationResults, true);

            Assert.False(isValid);
            Assert.Contains(validationResults, v => v.ErrorMessage!.Contains("Applied Date year must be a valid 4-digit year between 1900 and 2100."));

            // Service execution check (even if validation bypassed)
            var result = await _careerService.CreateApplicationAsync(dto, user.Id);
            Assert.False(result.IsSuccess);
            Assert.Equal("Applied Date year must be a valid 4-digit year between 1900 and 2100.", result.Message);
        }

        [Theory]
        [InlineData("202626-06-15")] // 6-digit year string
        [InlineData("20261-06-15")]  // 5-digit year string
        public void Career_SixDigitOrFiveDigitYearString_CannotBindToValidDateTime(string invalidYearString)
        {
            // Verifies that a 5-digit or 6-digit year string is invalid for standard ISO dates in .NET
            bool parsed = DateTime.TryParse(invalidYearString, out _);
            Assert.False(parsed);
        }

        [Fact]
        public async Task Career_LeapYearFebruary29_Succeeds()
        {
            var user = await CreateTestUserAsync();
            // 2024 is a leap year (Feb 29 is valid)
            var leapDate = new DateTime(2024, 2, 29, 0, 0, 0, DateTimeKind.Utc);

            var dto = new CreateJobApplicationDto
            {
                Company = "Leap Co",
                Position = "Developer",
                Status = "Interviewing",
                AppliedDate = leapDate
            };

            var validationContext = new ValidationContext(dto);
            var validationResults = new List<ValidationResult>();
            bool isValid = Validator.TryValidateObject(dto, validationContext, validationResults, true);

            Assert.True(isValid);

            var result = await _careerService.CreateApplicationAsync(dto, user.Id);
            Assert.True(result.IsSuccess);
            Assert.Equal(29, result.Data!.AppliedDate.Day);
            Assert.Equal(2, result.Data.AppliedDate.Month);
            Assert.Equal(2024, result.Data.AppliedDate.Year);
        }
    }
}
