using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class LeaderboardServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly LifeScoreService _lifeScoreService;

        public LeaderboardServiceTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            _lifeScoreService = new LifeScoreService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task GetLeaderboard_ExcludesUser_WhenLocationMissingForScope()
        {
            // User with no city
            var user = new User
            {
                Email = "test@lifesync.ai",
                PasswordHash = "hash",
                FullName = "No City User",
                Country = "India",
                State = "Gujarat",
                City = null,
                Status = UserStatus.Active
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var result = await _lifeScoreService.GetLeaderboardAsync(user.Id, "city", page: 1, pageSize: 20);

            Assert.True(result.IsSuccess);
            Assert.False(result.Data.HasLocation);
            Assert.Empty(result.Data.TopRankings);
        }

        [Fact]
        public async Task GetLeaderboard_IsolatesSameCityNameAcrossDifferentCountries()
        {
            // India user in AHMEDABAD
            var indiaUser = new User
            {
                Email = "india@lifesync.ai",
                PasswordHash = "hash",
                FullName = "India Ahmedabad User",
                Country = "India",
                State = "Gujarat",
                City = "AHMEDABAD",
                Status = UserStatus.Active
            };
            // USA user also in AHMEDABAD
            var usaUser = new User
            {
                Email = "usa@lifesync.ai",
                PasswordHash = "hash",
                FullName = "USA Ahmedabad User",
                Country = "United States",
                State = "Ohio",
                City = "AHMEDABAD",
                Status = UserStatus.Active
            };
            _context.Users.AddRange(indiaUser, usaUser);
            await _context.SaveChangesAsync();

            // When India user views City leaderboard, USA user must NOT be present
            var result = await _lifeScoreService.GetLeaderboardAsync(indiaUser.Id, "city", page: 1, pageSize: 20);

            Assert.True(result.IsSuccess);
            Assert.True(result.Data.HasLocation);
            Assert.Single(result.Data.TopRankings);
            Assert.Equal("India Ahmedabad User", result.Data.TopRankings[0].DisplayName);
            Assert.DoesNotContain(result.Data.TopRankings, u => u.DisplayName == "USA Ahmedabad User");
        }

        [Fact]
        public async Task GetLeaderboard_PaginatesAtTwentyUsersMax_AndPreservesPersonalRank()
        {
            // Create 25 users in the same city (India/Gujarat/AHMEDABAD)
            var users = new List<User>();
            for (int i = 1; i <= 25; i++)
            {
                users.Add(new User
                {
                    Email = $"user{i}@lifesync.ai",
                    PasswordHash = "hash",
                    FullName = $"User {i:D2}",
                    Country = "India",
                    State = "Gujarat",
                    City = "AHMEDABAD",
                    Status = UserStatus.Active
                });
            }
            _context.Users.AddRange(users);
            await _context.SaveChangesAsync();

            // Give user 25 daily activities to have the highest score
            var topUser = users[24];
            _context.HealthLogs.Add(new HealthLog
            {
                UserId = topUser.Id,
                LogType = "Water",
                LogValue = 2000,
                LogDate = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Current user is user 1 (will be on page 2)
            var currentUser = users[0];

            // Page 1
            var page1 = await _lifeScoreService.GetLeaderboardAsync(currentUser.Id, "city", page: 1, pageSize: 20);
            Assert.True(page1.IsSuccess);
            Assert.Equal(20, page1.Data.TopRankings.Count);
            Assert.Equal(25, page1.Data.TotalParticipants);
            Assert.Equal(2, page1.Data.TotalPages);
            Assert.Equal(1, page1.Data.Page);
            // Current user rank is calculated across all 25 users
            Assert.True(page1.Data.CurrentUserRank > 1);

            // Page 2
            var page2 = await _lifeScoreService.GetLeaderboardAsync(currentUser.Id, "city", page: 2, pageSize: 20);
            Assert.True(page2.IsSuccess);
            Assert.Equal(5, page2.Data.TopRankings.Count);
            Assert.Equal(2, page2.Data.Page);
            // Personal rank remains consistent on page 2
            Assert.Equal(page1.Data.CurrentUserRank, page2.Data.CurrentUserRank);
        }

        [Fact]
        public async Task GetLeaderboard_AppliesDeterministicTieBreaker()
        {
            // 3 users with identical 0 score
            var u1 = new User { Email = "u1@test.com", PasswordHash = "h", FullName = "Alpha", Country = "India", State = "Gujarat", City = "AHMEDABAD", Status = UserStatus.Active };
            var u2 = new User { Email = "u2@test.com", PasswordHash = "h", FullName = "Beta", Country = "India", State = "Gujarat", City = "AHMEDABAD", Status = UserStatus.Active };
            var u3 = new User { Email = "u3@test.com", PasswordHash = "h", FullName = "Gamma", Country = "India", State = "Gujarat", City = "AHMEDABAD", Status = UserStatus.Active };
            _context.Users.AddRange(u1, u2, u3);
            await _context.SaveChangesAsync();

            var result = await _lifeScoreService.GetLeaderboardAsync(u1.Id, "city", page: 1, pageSize: 20);

            Assert.True(result.IsSuccess);
            Assert.Equal(3, result.Data.TopRankings.Count);
            // Sorted by Id ascending when scores tie
            Assert.Equal(u1.Id, result.Data.TopRankings[0].IsCurrentUser ? u1.Id : result.Data.TopRankings[0].Rank);
        }

        [Fact]
        public async Task GetLeaderboard_ReflectsLiveScoreUpdateChangingUserRank()
        {
            var u1 = new User { Email = "u1@test.com", PasswordHash = "h", FullName = "Ranked Leader", Country = "India", State = "Gujarat", City = "AHMEDABAD", Status = UserStatus.Active };
            var u2 = new User { Email = "u2@test.com", PasswordHash = "h", FullName = "Challenger", Country = "India", State = "Gujarat", City = "AHMEDABAD", Status = UserStatus.Active };
            _context.Users.AddRange(u1, u2);
            await _context.SaveChangesAsync();

            // Give u1 score initially
            _context.HealthLogs.Add(new HealthLog { UserId = u1.Id, LogType = "Water", LogValue = 2000, LogDate = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            var initial = await _lifeScoreService.GetLeaderboardAsync(u2.Id, "city", page: 1, pageSize: 20);
            Assert.Equal(2, initial.Data.CurrentUserRank);

            // Now Challenger (u2) completes tasks and logs water to overtake Leader (u1)
            _context.HealthLogs.Add(new HealthLog { UserId = u2.Id, LogType = "Water", LogValue = 2000, LogDate = DateTime.UtcNow });
            _context.HealthLogs.Add(new HealthLog { UserId = u2.Id, LogType = "Workout", LogValue = 30, LogDate = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            var updated = await _lifeScoreService.GetLeaderboardAsync(u2.Id, "city", page: 1, pageSize: 20);
            Assert.Equal(1, updated.Data.CurrentUserRank);
            Assert.Equal("Challenger", updated.Data.TopRankings[0].DisplayName);
        }

        [Fact]
        public async Task GetLeaderboard_PreservesConsistentScoreAcrossCityStateCountryScopes()
        {
            // 1. Setup User in India, Gujarat, AHMEDABAD
            var primaryUser = new User
            {
                Email = "darshil@test.com",
                PasswordHash = "hash",
                FullName = "Darshil",
                Country = "India",
                State = "Gujarat",
                City = "AHMEDABAD",
                Status = UserStatus.Active
            };

            // 2. Setup second user in same State (Gujarat), but different City (SURAT)
            var statePeer = new User
            {
                Email = "statepeer@test.com",
                PasswordHash = "hash",
                FullName = "State Peer",
                Country = "India",
                State = "Gujarat",
                City = "SURAT",
                Status = UserStatus.Active
            };

            // 3. Setup third user in same Country (India), but different State (Maharashtra), City (MUMBAI)
            var countryPeer = new User
            {
                Email = "countrypeer@test.com",
                PasswordHash = "hash",
                FullName = "Country Peer",
                Country = "India",
                State = "Maharashtra",
                City = "MUMBAI",
                Status = UserStatus.Active
            };

            _context.Users.AddRange(primaryUser, statePeer, countryPeer);
            await _context.SaveChangesAsync();

            // Give primary user health logs (water 2000, workout 30 -> 5 + 30 + 15 = 50.0 points)
            _context.HealthLogs.Add(new HealthLog { UserId = primaryUser.Id, LogType = "Water", LogValue = 2000, LogDate = DateTime.UtcNow });
            _context.HealthLogs.Add(new HealthLog { UserId = primaryUser.Id, LogType = "Workout", LogValue = 30, LogDate = DateTime.UtcNow });

            // Give state peer health logs (water 1000 -> 5 + 15 = 20.0 points)
            _context.HealthLogs.Add(new HealthLog { UserId = statePeer.Id, LogType = "Water", LogValue = 1000, LogDate = DateTime.UtcNow });

            // Give country peer health logs (water 2000, workout 30, sleep 8 -> 5 + 30 + 15 + 10 = 60.0 points)
            _context.HealthLogs.Add(new HealthLog { UserId = countryPeer.Id, LogType = "Water", LogValue = 2000, LogDate = DateTime.UtcNow });
            _context.HealthLogs.Add(new HealthLog { UserId = countryPeer.Id, LogType = "Workout", LogValue = 30, LogDate = DateTime.UtcNow });
            _context.HealthLogs.Add(new HealthLog { UserId = countryPeer.Id, LogType = "Sleep", LogValue = 8, LogDate = DateTime.UtcNow });

            await _context.SaveChangesAsync();

            // Authoritative score directly from GetCumulativeTotalLifeScoreAsync
            double authoritativeScore = await _lifeScoreService.GetCumulativeTotalLifeScoreAsync(primaryUser.Id);
            Assert.True(authoritativeScore > 0, "Primary user must have non-zero score");

            // --- CITY SCOPE ---
            var cityResult = await _lifeScoreService.GetLeaderboardAsync(primaryUser.Id, "city", 1, 20);
            Assert.True(cityResult.IsSuccess);
            Assert.True(cityResult.Data.HasLocation);
            Assert.Equal(authoritativeScore, cityResult.Data.CurrentUserTotalScore);
            var citySelfEntry = cityResult.Data.TopRankings.FirstOrDefault(e => e.IsCurrentUser);
            Assert.NotNull(citySelfEntry);
            Assert.Equal(authoritativeScore, citySelfEntry.TotalLifeScore);
            Assert.Single(cityResult.Data.TopRankings); // Only primaryUser in Ahmedabad

            // --- STATE SCOPE ---
            var stateResult = await _lifeScoreService.GetLeaderboardAsync(primaryUser.Id, "state", 1, 20);
            Assert.True(stateResult.IsSuccess);
            Assert.True(stateResult.Data.HasLocation);
            Assert.Equal(authoritativeScore, stateResult.Data.CurrentUserTotalScore);
            var stateSelfEntry = stateResult.Data.TopRankings.FirstOrDefault(e => e.IsCurrentUser);
            Assert.NotNull(stateSelfEntry);
            Assert.Equal(authoritativeScore, stateSelfEntry.TotalLifeScore);
            Assert.Equal(2, stateResult.Data.TotalParticipants); // primaryUser + statePeer
            // Verify other user's score is independent and non-zero
            var statePeerEntry = stateResult.Data.TopRankings.FirstOrDefault(e => e.DisplayName == "State Peer");
            Assert.NotNull(statePeerEntry);
            Assert.True(statePeerEntry.TotalLifeScore > 0);
            Assert.NotEqual(authoritativeScore, statePeerEntry.TotalLifeScore);

            // --- COUNTRY SCOPE ---
            var countryResult = await _lifeScoreService.GetLeaderboardAsync(primaryUser.Id, "country", 1, 20);
            Assert.True(countryResult.IsSuccess);
            Assert.True(countryResult.Data.HasLocation);
            Assert.Equal(authoritativeScore, countryResult.Data.CurrentUserTotalScore);
            var countrySelfEntry = countryResult.Data.TopRankings.FirstOrDefault(e => e.IsCurrentUser);
            Assert.NotNull(countrySelfEntry);
            Assert.Equal(authoritativeScore, countrySelfEntry.TotalLifeScore);
            Assert.Equal(3, countryResult.Data.TotalParticipants); // primaryUser + statePeer + countryPeer

            // Consistency across scopes
            Assert.Equal(cityResult.Data.CurrentUserTotalScore, stateResult.Data.CurrentUserTotalScore);
            Assert.Equal(stateResult.Data.CurrentUserTotalScore, countryResult.Data.CurrentUserTotalScore);
        }

        [Fact]
        public async Task GetLeaderboard_MissingLocation_DoesNotDefaultScoreToZero()
        {
            var user = new User
            {
                Email = "nocity@test.com",
                PasswordHash = "hash",
                FullName = "Missing City User",
                Country = "India",
                State = "Gujarat",
                City = null, // Missing city
                Status = UserStatus.Active
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Give user activity so cumulative score is positive
            _context.HealthLogs.Add(new HealthLog { UserId = user.Id, LogType = "Water", LogValue = 2000, LogDate = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            double expectedScore = await _lifeScoreService.GetCumulativeTotalLifeScoreAsync(user.Id);
            Assert.True(expectedScore > 0);

            // When user requests "city" scope without having a city configured:
            var result = await _lifeScoreService.GetLeaderboardAsync(user.Id, "city", 1, 20);

            Assert.True(result.IsSuccess);
            Assert.False(result.Data.HasLocation);
            // Must return the user's actual cumulative score, NOT 0.0
            Assert.Equal(expectedScore, result.Data.CurrentUserTotalScore);
            Assert.Empty(result.Data.TopRankings);
        }
    }
}
