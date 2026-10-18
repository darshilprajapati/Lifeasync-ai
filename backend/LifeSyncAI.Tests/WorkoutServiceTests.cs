using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.API.Controllers;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;
using LifeSyncAI.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class WorkoutServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;
        private readonly WorkoutService _workoutService;
        private readonly User _testUser;

        public WorkoutServiceTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();

            // Seed exercise catalog
            DatabaseSeeder.SeedAsync(_context).GetAwaiter().GetResult();

            _testUser = new User
            {
                FullName = "Fitness Enthusiast",
                Email = "fitness@example.com",
                PasswordHash = "hash123"
            };
            _context.Users.Add(_testUser);
            _context.SaveChangesAsync().GetAwaiter().GetResult();

            _workoutService = new WorkoutService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task GetExercisesAsync_WithoutEquipment_ReturnsOnlyBodyweightExercises()
        {
            // Act: query without equipment
            var result = await _workoutService.GetExercisesAsync(requiresEquipment: false);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotEmpty(result.Data);
            Assert.All(result.Data, ex => Assert.False(ex.RequiresEquipment));
        }

        [Fact]
        public async Task GetExercisesAsync_WithEquipmentList_ReturnsCompatibleAndBodyweight()
        {
            // Act: user has only "Dumbbells"
            var equipmentList = new List<string> { "Dumbbells" };
            var result = await _workoutService.GetExercisesAsync(equipmentList: equipmentList);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotEmpty(result.Data);

            // Every returned exercise must either require no equipment OR use Dumbbells
            Assert.All(result.Data, ex =>
            {
                if (ex.RequiresEquipment)
                {
                    Assert.Equal("Dumbbells", ex.EquipmentType, ignoreCase: true);
                }
            });
        }

        [Fact]
        public async Task GetActivePlanAsync_WhenUserHasNoPlan_CreatesDefaultStarterPlan()
        {
            // Act
            var result = await _workoutService.GetActivePlanAsync(_testUser.Id);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.True(result.Data.IsActive);
            Assert.Equal(7, result.Data.Days.Count);

            // Verify Monday to Sunday structure
            var days = result.Data.Days;
            Assert.Equal(DayOfWeek.Monday, days[0].DayOfWeek);
            Assert.Equal(DayOfWeek.Sunday, days[6].DayOfWeek);

            // Has active training days and rest days
            Assert.Contains(days, d => !d.IsRestDay && d.Exercises.Any());
            Assert.Contains(days, d => d.IsRestDay);
        }

        [Fact]
        public async Task CreateOrUpdatePlanAsync_DeactivatesPreviousPlan_AndCreatesNewPlan()
        {
            // Arrange: create initial starter plan
            await _workoutService.GetActivePlanAsync(_testUser.Id);

            var exercises = await _context.Exercises.Where(e => !e.RequiresEquipment).Take(3).ToListAsync();

            var customDto = new CreateWorkoutPlanDto
            {
                Title = "High Intensity Bodyweight",
                Goal = "Fat Loss",
                FitnessLevel = "Intermediate",
                DaysPerWeek = 4,
                Days = new List<UpdateWorkoutDayDto>
                {
                    new UpdateWorkoutDayDto
                    {
                        DayOfWeek = DayOfWeek.Monday,
                        FocusTitle = "HIIT Circuit",
                        IsRestDay = false,
                        TargetDurationMinutes = 35,
                        Exercises = new List<WorkoutDayExerciseInputDto>
                        {
                            new WorkoutDayExerciseInputDto { ExerciseId = exercises[0].Id, Sets = 4, Reps = 15, RestSeconds = 45, OrderIndex = 0 },
                            new WorkoutDayExerciseInputDto { ExerciseId = exercises[1].Id, Sets = 4, Reps = 15, RestSeconds = 45, OrderIndex = 1 }
                        }
                    },
                    new UpdateWorkoutDayDto
                    {
                        DayOfWeek = DayOfWeek.Tuesday,
                        FocusTitle = "Active Recovery",
                        IsRestDay = true,
                        TargetDurationMinutes = 0,
                        RestDayNotes = "Light walk and mobility."
                    }
                }
            };

            // Act
            var result = await _workoutService.CreateOrUpdatePlanAsync(_testUser.Id, customDto);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal("High Intensity Bodyweight", result.Data.Title);
            Assert.Equal(2, result.Data.Version); // bumped version

            // Verify previous plan is deactivated
            var allPlans = await _context.UserWorkoutPlans.Where(p => p.UserId == _testUser.Id).ToListAsync();
            Assert.Equal(2, allPlans.Count);
            Assert.Single(allPlans, p => p.IsActive);
        }

        [Fact]
        public async Task UpdateDayAsync_CustomizesExercises_SetsRepsAndRest()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            var exercises = await _context.Exercises.Take(2).ToListAsync();

            var updateDto = new UpdateWorkoutDayDto
            {
                DayOfWeek = DayOfWeek.Monday,
                FocusTitle = "Upper Body Hypertrophy",
                IsRestDay = false,
                TargetDurationMinutes = 40,
                Exercises = new List<WorkoutDayExerciseInputDto>
                {
                    new WorkoutDayExerciseInputDto { ExerciseId = exercises[0].Id, Sets = 4, Reps = 8, RestSeconds = 90, OrderIndex = 0 },
                    new WorkoutDayExerciseInputDto { ExerciseId = exercises[1].Id, Sets = 3, Reps = 12, RestSeconds = 60, OrderIndex = 1 }
                }
            };

            // Act
            var updateResult = await _workoutService.UpdateDayAsync(_testUser.Id, monday.Id, updateDto);

            // Assert
            Assert.True(updateResult.IsSuccess);
            Assert.Equal("Upper Body Hypertrophy", updateResult.Data.FocusTitle);
            Assert.Equal(2, updateResult.Data.Exercises.Count);
            Assert.Equal(4, updateResult.Data.Exercises[0].Sets);
            Assert.Equal(8, updateResult.Data.Exercises[0].Reps);
            Assert.Equal(90, updateResult.Data.Exercises[0].RestSeconds);
        }

        [Fact]
        public async Task LogSessionAsync_BridgesToHealthLogs_WithWorkoutType_NeverCalories()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);
            var sessionDate = new DateTime(2026, 10, 19);

            var logDto = new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 35,
                Notes = "Crushed today's session!"
            };

            // Act
            var logResult = await _workoutService.LogSessionAsync(_testUser.Id, logDto);

            // Assert
            Assert.True(logResult.IsSuccess);
            Assert.True(logResult.Data.IsCompleted);
            Assert.Equal(35, logResult.Data.ActualDurationMinutes);
            Assert.True(logResult.Data.EstimatedCaloriesBurned > 0);
            Assert.NotNull(logResult.Data.HealthLogId);

            // Verify HealthLog was created with LogType = "Workout", NEVER "Calories"
            var healthLogs = await _context.HealthLogs.Where(h => h.UserId == _testUser.Id).ToListAsync();
            Assert.Single(healthLogs);
            var hl = healthLogs[0];
            Assert.Equal("Workout", hl.LogType);
            Assert.Equal(35f, hl.LogValue);
            Assert.NotEqual("Calories", hl.LogType); // Strict requirement: dietary calories only!
        }

        [Fact]
        public async Task DeleteSessionLogAsync_RemovesSessionLog_AndLinkedHealthLog()
        {
            // Arrange: log a session
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            var logResult = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = new DateTime(2026, 10, 19),
                IsCompleted = true,
                ActualDurationMinutes = 30
            });

            int sessionLogId = logResult.Data.Id;
            int? healthLogId = logResult.Data.HealthLogId;
            Assert.NotNull(healthLogId);

            // Act: delete session
            var deleteResult = await _workoutService.DeleteSessionLogAsync(_testUser.Id, sessionLogId);

            // Assert
            Assert.True(deleteResult.IsSuccess);

            // Both session log and health log must be deleted
            var remainingSession = await _context.WorkoutSessionLogs.FindAsync(sessionLogId);
            Assert.Null(remainingSession);

            var remainingHealthLog = await _context.HealthLogs.FindAsync(healthLogId.Value);
            Assert.Null(remainingHealthLog);
        }

        [Fact]
        public async Task GenerateAiPlan_WithoutEquipment_GeneratesBodyweightPlan()
        {
            // Arrange
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Fat Loss",
                FitnessLevel = "Beginner",
                DaysPerWeek = 4,
                PreferredDurationMinutes = 30,
                HasEquipment = false
            };

            // Act
            var aiResult = await _workoutService.GenerateAiPlanAsync(_testUser.Id, req);

            // Assert
            Assert.True(aiResult.IsSuccess);
            Assert.NotNull(aiResult.Data);
            Assert.Equal(4, aiResult.Data.DaysPerWeek);
            Assert.Equal("Deterministic", aiResult.Data.Source);
            Assert.NotEmpty(aiResult.Data.SuggestedDays);

            // All exercises in the suggested plan must require NO equipment
            var allExercises = aiResult.Data.SuggestedDays
                .SelectMany(d => d.Exercises)
                .ToList();

            Assert.NotEmpty(allExercises);
            Assert.All(allExercises, e => Assert.False(e.RequiresEquipment));
        }

        [Fact]
        public async Task GenerateAiPlan_WithEquipment_IncludesCompatibleExercises()
        {
            // Arrange
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Muscle Building",
                FitnessLevel = "Intermediate",
                DaysPerWeek = 5,
                PreferredDurationMinutes = 45,
                HasEquipment = true,
                AvailableEquipment = new List<string> { "Dumbbells", "Pull Up Bar" }
            };

            // Act
            var aiResult = await _workoutService.GenerateAiPlanAsync(_testUser.Id, req);

            // Assert
            Assert.True(aiResult.IsSuccess);
            Assert.Equal(5, aiResult.Data.DaysPerWeek);

            var allExercises = aiResult.Data.SuggestedDays
                .SelectMany(d => d.Exercises)
                .ToList();

            Assert.NotEmpty(allExercises);

            // None should require equipment not in user's list
            var allowed = new HashSet<string>(new[] { "None", "Dumbbells", "Pull Up Bar" }, StringComparer.OrdinalIgnoreCase);
            Assert.All(allExercises, e =>
            {
                if (e.RequiresEquipment)
                {
                    Assert.Contains(e.EquipmentType, allowed);
                }
            });
        }

        [Fact]
        public async Task WorkoutController_GetExercises_ReturnsOkWithExercises()
        {
            // Arrange
            var controller = new WorkoutController(_workoutService);
            SetControllerUser(controller, _testUser.Id);

            // Act
            var actionResult = await controller.GetExercises(requiresEquipment: false, category: "Core", search: null, equipmentList: null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<List<ExerciseDto>>>(okResult.Value);
            Assert.True(response.IsSuccess);
            Assert.NotEmpty(response.Data);
            Assert.All(response.Data, e => Assert.Equal("Core", e.Category));
        }

        [Fact]
        public async Task SyncPlannerAsync_CreatesEvents_AndRepeatingDoesNotDuplicate()
        {
            // Arrange: user has starter plan
            await _workoutService.GetActivePlanAsync(_testUser.Id);

            // Add an existing unrelated planner event for the same week
            var monday = new DateTime(2026, 10, 19);
            var unrelatedEvent = new PlannerEvent
            {
                UserId = _testUser.Id,
                Title = "Project Meeting",
                Description = "Discuss quarterly roadmap",
                StartTime = monday.AddHours(14),
                EndTime = monday.AddHours(15),
                CreatedAt = DateTime.UtcNow
            };
            await _context.PlannerEvents.AddAsync(unrelatedEvent);
            await _context.SaveChangesAsync();

            // Act 1: Sync plan to planner
            var syncResult1 = await _workoutService.SyncPlannerAsync(_testUser.Id, monday);

            // Assert 1
            Assert.True(syncResult1.IsSuccess);
            Assert.True(syncResult1.Data > 0);

            var weekEnd = monday.AddDays(7);
            var eventsAfterSync1 = await _context.PlannerEvents
                .Where(e => e.UserId == _testUser.Id && e.StartTime >= monday && e.StartTime < weekEnd)
                .ToListAsync();

            // Total events = 1 unrelated + synced non-rest days
            Assert.Equal(1 + syncResult1.Data, eventsAfterSync1.Count);
            Assert.Contains(eventsAfterSync1, e => e.Title == "Project Meeting"); // Unrelated event unaffected!

            var syncedWorkoutEvents = eventsAfterSync1.Where(e => e.Description != null && e.Description.Contains("[WorkoutSync:DayId:")).ToList();
            Assert.Equal(syncResult1.Data, syncedWorkoutEvents.Count);
            Assert.All(syncedWorkoutEvents, e =>
            {
                Assert.Equal(8, e.StartTime.Hour);
                Assert.NotNull(e.ReminderTime);
                Assert.Equal(e.StartTime.AddMinutes(-30), e.ReminderTime);
            });

            // Act 2: Repeating sync must be idempotent and NOT create duplicates
            var syncResult2 = await _workoutService.SyncPlannerAsync(_testUser.Id, monday);
            Assert.True(syncResult2.IsSuccess);

            var eventsAfterSync2 = await _context.PlannerEvents
                .Where(e => e.UserId == _testUser.Id && e.StartTime >= monday && e.StartTime < weekEnd)
                .ToListAsync();

            Assert.Equal(eventsAfterSync1.Count, eventsAfterSync2.Count); // Count is identical, zero duplicates!
        }

        [Fact]
        public async Task Authorization_UserCannotUpdateAnotherUsersDay_OrDeleteAnotherUsersSession()
        {
            // Arrange: create second user
            var user2 = new User
            {
                FullName = "Malicious Actor",
                Email = "malicious@example.com",
                PasswordHash = "hash"
            };
            await _context.Users.AddAsync(user2);
            await _context.SaveChangesAsync();

            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            // User 1 logs a session
            var logResult = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = new DateTime(2026, 10, 19),
                IsCompleted = true,
                ActualDurationMinutes = 25
            });
            Assert.True(logResult.IsSuccess);

            // Act 1: User 2 tries to update User 1's workout day
            var updateAttempt = await _workoutService.UpdateDayAsync(user2.Id, monday.Id, new UpdateWorkoutDayDto
            {
                DayOfWeek = DayOfWeek.Monday,
                FocusTitle = "Tampered Routine"
            });

            // Assert 1: Forbidden / unauthorized
            Assert.False(updateAttempt.IsSuccess);
            Assert.Contains("Unauthorized", updateAttempt.Message, StringComparison.OrdinalIgnoreCase);

            // Act 2: User 2 tries to delete User 1's session log
            var deleteAttempt = await _workoutService.DeleteSessionLogAsync(user2.Id, logResult.Data.Id);

            // Assert 2: Must fail, not found for user2
            Assert.False(deleteAttempt.IsSuccess);

            // Verify User 1's session log remains intact
            var logStillExists = await _context.WorkoutSessionLogs.AnyAsync(l => l.Id == logResult.Data.Id);
            Assert.True(logStillExists);

            // Act 3: User 2 tries to log a session for User 1's workout day (cross-user day injection)
            var crossUserLogAttempt = await _workoutService.LogSessionAsync(user2.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = new DateTime(2026, 10, 19),
                IsCompleted = true,
                ActualDurationMinutes = 30
            });

            // Assert 3: Must fail with Unauthorized error
            Assert.False(crossUserLogAttempt.IsSuccess);
            Assert.Contains("Unauthorized", crossUserLogAttempt.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task LogSessionAsync_ClampsDurationToBounds()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            // Act: submit session with extreme duration (10,000 minutes)
            var result = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = new DateTime(2026, 10, 20),
                IsCompleted = true,
                ActualDurationMinutes = 10000
            });

            // Assert: Clamped to maximum 360 minutes
            Assert.True(result.IsSuccess);
            Assert.Equal(360, result.Data.ActualDurationMinutes);
        }

        [Fact]
        public async Task LogSessionAsync_RepeatedCallsAreIdempotent_DoesNotDuplicateLogs()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);
            var sessionDate = new DateTime(2026, 10, 19);

            // Act 1: First completion call
            var result1 = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 30
            });
            Assert.True(result1.IsSuccess);

            // Act 2: Repeated completion call (e.g. user submits again with 40 mins)
            var result2 = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 40
            });
            Assert.True(result2.IsSuccess);

            // Assert: Only ONE session log and ONE health log exist
            var sessionLogs = await _context.WorkoutSessionLogs
                .Where(l => l.UserId == _testUser.Id && l.WorkoutDayId == monday.Id && l.SessionDate == sessionDate)
                .ToListAsync();
            Assert.Single(sessionLogs);
            Assert.Equal(40, sessionLogs[0].ActualDurationMinutes);

            var healthLogs = await _context.HealthLogs
                .Where(h => h.UserId == _testUser.Id && h.LogType == "Workout")
                .ToListAsync();
            Assert.Single(healthLogs);
            Assert.Equal(40f, healthLogs[0].LogValue);
        }

        [Fact]
        public async Task LogSessionAsync_UncompleteSession_RemovesLinkedHealthLog()
        {
            // Arrange: log completed session
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);
            var sessionDate = new DateTime(2026, 10, 19);

            await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 30
            });

            var initialHealthLogs = await _context.HealthLogs.Where(h => h.UserId == _testUser.Id && h.LogType == "Workout").ToListAsync();
            Assert.Single(initialHealthLogs);

            // Act: uncomplete via LogSessionAsync with IsCompleted = false
            var uncompleteResult = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = false
            });

            // Assert
            Assert.True(uncompleteResult.IsSuccess);
            Assert.False(uncompleteResult.Data.IsCompleted);
            Assert.Null(uncompleteResult.Data.HealthLogId);

            // Linked HealthLog must be cleanly removed
            var remainingHealthLogs = await _context.HealthLogs.Where(h => h.UserId == _testUser.Id && h.LogType == "Workout").ToListAsync();
            Assert.Empty(remainingHealthLogs);
        }

        [Fact]
        public async Task Workout_ElevatesLifeScore_RespectingWorkoutCap_AndPreservingCalorieIntake()
        {
            // Arrange
            var lifeScoreService = new LifeScoreService(_context);
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);
            var sessionDate = new DateTime(2026, 10, 19);

            // Act 1: 30-minute workout
            await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 30
            });

            var score30 = await lifeScoreService.GetDailyLifeScoreAsync(_testUser.Id, sessionDate);
            Assert.True(score30.IsSuccess);
            // 30 mins earns exactly (30/30)*15 = 15.0 pts
            Assert.Equal(15.0, score30.Data.Breakdown.Workout);
            // Strict check: dietary calorie logging was NOT triggered
            Assert.Equal(0.0, score30.Data.Breakdown.Calories);

            // Act 2: 90-minute workout (should cap at 15.0 pts max)
            await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 90
            });

            var score90 = await lifeScoreService.GetDailyLifeScoreAsync(_testUser.Id, sessionDate);
            Assert.True(score90.IsSuccess);
            // Cap at 15.0 must be respected
            Assert.Equal(15.0, score90.Data.Breakdown.Workout);
            Assert.Equal(0.0, score90.Data.Breakdown.Calories);
        }

        [Fact]
        public async Task ReportProcessor_IncludesWorkoutSessionsAndBurnedCalories_SeparatelyFromDietaryCalories()
        {
            // Arrange: log workout session and separate dietary calorie health log
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);
            var sessionDate = DateTime.UtcNow.Date;

            await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = sessionDate,
                IsCompleted = true,
                ActualDurationMinutes = 45
            });

            // Log separate dietary calories consumed
            await _context.HealthLogs.AddAsync(new HealthLog
            {
                UserId = _testUser.Id,
                LogType = "Calories",
                LogValue = 2200,
                LogDate = sessionDate,
                Details = "Daily food consumption"
            });
            await _context.SaveChangesAsync();

            // Instantiate ReportProcessorService with dummies
            var serviceProvider = new ServiceCollection().BuildServiceProvider();
            var service = new ReportProcessorService(
                new ReportQueue(),
                new ReportRepository(),
                serviceProvider.GetRequiredService<IServiceScopeFactory>(),
                Microsoft.Extensions.Logging.Abstractions.NullLogger<ReportProcessorService>.Instance);

            var buildMethod = typeof(ReportProcessorService).GetMethod("BuildReportContentAsync", 
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.NotNull(buildMethod);

            var task = (Task<string>)buildMethod.Invoke(service, new object[] { _testUser.Id, "Fitness User", "Health", "Weekly", _context })!;
            var reportContent = await task;

            // Assert: Workout sessions and active energy burned are present
            Assert.Contains("Workout Plans Completed: 1 sessions", reportContent);
            Assert.Contains("Active Burn", reportContent);
            // Assert: Dietary calories are tracked separately as consumed
            Assert.Contains("Total Calories Consumed: 2200 kcal", reportContent);
        }

        [Fact]
        public async Task WorkoutController_MissingOrInvalidUserIdClaim_ReturnsUnauthorized()
        {
            // Arrange: controller with unauthenticated / empty user
            var controller = new WorkoutController(_workoutService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };

            // Act & Assert for key endpoints
            var planAction = await controller.GetActivePlan(null);
            Assert.IsType<UnauthorizedObjectResult>(planAction.Result);

            var sessionAction = await controller.LogSession(new LogWorkoutSessionDto());
            Assert.IsType<UnauthorizedObjectResult>(sessionAction.Result);

            var deleteAction = await controller.DeleteSessionLog(1);
            Assert.IsType<UnauthorizedObjectResult>(deleteAction.Result);

            var syncAction = await controller.SyncPlanner(null);
            Assert.IsType<UnauthorizedObjectResult>(syncAction.Result);
        }

        [Fact]
        public async Task CreateOrUpdatePlanAsync_NullDaysList_HandlesGracefullyWithoutThrowing()
        {
            // Arrange
            var dto = new CreateWorkoutPlanDto
            {
                Title = "Minimal Routine",
                Goal = "Stay Fit",
                FitnessLevel = "Beginner",
                DaysPerWeek = 3,
                Days = null! // Simulating incoming JSON payload with null "days"
            };

            // Act
            var result = await _workoutService.CreateOrUpdatePlanAsync(_testUser.Id, dto);

            // Assert: Must not crash, should create default 7-day template
            Assert.True(result.IsSuccess);
            Assert.NotNull(result.Data);
            Assert.Equal(7, result.Data.Days.Count);
            Assert.All(result.Data.Days, d => Assert.True(d.IsRestDay));
        }

        [Fact]
        public async Task GetActivePlanAsync_AcrossDifferentWeeks_MaintainsCalendarDateSpecificCompletionState()
        {
            // Arrange: create active plan
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = planResult.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            var week1Monday = new DateTime(2026, 10, 12);
            var week2Monday = new DateTime(2026, 10, 19);

            // Log completion specifically on Week 1 Monday
            var logResult = await _workoutService.LogSessionAsync(_testUser.Id, new LogWorkoutSessionDto
            {
                WorkoutDayId = monday.Id,
                SessionDate = week1Monday,
                IsCompleted = true,
                ActualDurationMinutes = 30
            });
            Assert.True(logResult.IsSuccess);

            // Act: query plan for Week 1
            var week1Plan = await _workoutService.GetActivePlanAsync(_testUser.Id, week1Monday);
            var week1MondayDay = week1Plan.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            // Act: query plan for Week 2
            var week2Plan = await _workoutService.GetActivePlanAsync(_testUser.Id, week2Monday);
            var week2MondayDay = week2Plan.Data.Days.First(d => d.DayOfWeek == DayOfWeek.Monday);

            // Assert: Week 1 reflects completed, Week 2 is NOT marked completed (decoupled by calendar date)
            Assert.True(week1MondayDay.IsCompletedForDate);
            Assert.NotNull(week1MondayDay.SessionLogId);

            Assert.False(week2MondayDay.IsCompletedForDate);
            Assert.Null(week2MondayDay.SessionLogId);
        }

        [Fact]
        public async Task DatabaseSeeder_SQLite_InitializesWorkoutTables_OnPreExistingDatabase()
        {
            // Arrange: create an SQLite database that ALREADY has Users table (simulating upgrade scenario)
            using var connection = new SqliteConnection("DataSource=:memory:");
            connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(connection)
                .Options;

            using (var initContext = new ApplicationDbContext(options))
            {
                // Create only the base schema with Users
                await initContext.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""Users"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""FullName"" TEXT NOT NULL,
                        ""Email"" TEXT NOT NULL,
                        ""PasswordHash"" TEXT NOT NULL,
                        ""Role"" INTEGER NOT NULL DEFAULT 1,
                        ""Status"" INTEGER NOT NULL DEFAULT 1,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );
                    CREATE TABLE IF NOT EXISTS ""PlannerEvents"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""UserId"" INTEGER NOT NULL,
                        ""Title"" TEXT NOT NULL,
                        ""StartTime"" TEXT NOT NULL,
                        ""EndTime"" TEXT NOT NULL,
                        ""IsCompleted"" INTEGER NOT NULL DEFAULT 0,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );
                ");
                // Pre-populate a user so Users.AnyAsync() returns true
                await initContext.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO ""Users"" (""FullName"", ""Email"", ""PasswordHash"") VALUES ('Existing User', 'exist@example.com', 'hash');
                ");
            }

            // Act: Run DatabaseSeeder on this pre-existing database
            using (var seedContext = new ApplicationDbContext(options))
            {
                await DatabaseSeeder.SeedAsync(seedContext);

                // Assert: All workout tables exist and exercise catalog is seeded
                var exercises = await seedContext.Exercises.ToListAsync();
                Assert.NotEmpty(exercises);

                var userPlans = await seedContext.UserWorkoutPlans.ToListAsync();
                Assert.NotNull(userPlans);

                var workoutDays = await seedContext.WorkoutDays.ToListAsync();
                Assert.NotNull(workoutDays);

                var sessionLogs = await seedContext.WorkoutSessionLogs.ToListAsync();
                Assert.NotNull(sessionLogs);
            }
        }

        [Theory]
        [InlineData(1)]
        [InlineData(2)]
        [InlineData(5)]
        [InlineData(7)]
        public async Task GenerateAiPlan_Supports1To7DaysPerWeek(int days)
        {
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Build Muscle",
                FitnessLevel = "Intermediate",
                DaysPerWeek = days,
                PreferredDurationMinutes = 45,
                WorkoutMode = "Without Equipment"
            };

            var result = await _workoutService.GenerateAiPlanAsync(_testUser.Id, req);

            Assert.True(result.IsSuccess);
            Assert.Equal(days, result.Data.DaysPerWeek);
            Assert.Equal(7, result.Data.SuggestedDays.Count);
            int nonRestDays = result.Data.SuggestedDays.Count(d => !d.IsRestDay);
            Assert.Equal(days, nonRestDays);
        }

        [Theory]
        [InlineData(5)]
        [InlineData(30)]
        [InlineData(120)]
        public async Task GenerateAiPlan_DurationLimitsAreRespected(int durationMinutes)
        {
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Stay Fit",
                FitnessLevel = "Beginner",
                DaysPerWeek = 3,
                PreferredDurationMinutes = durationMinutes,
                WorkoutMode = "Without Equipment"
            };

            var result = await _workoutService.GenerateAiPlanAsync(_testUser.Id, req);

            Assert.True(result.IsSuccess);
            var activeDays = result.Data.SuggestedDays.Where(d => !d.IsRestDay).ToList();
            Assert.All(activeDays, d =>
            {
                Assert.InRange(d.TargetDurationMinutes, 1, 150);
                Assert.NotEmpty(d.Exercises);
            });
        }

        [Fact]
        public async Task GenerateAiPlan_HybridModeCombinesEquipmentAndBodyweight()
        {
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Build Muscle",
                FitnessLevel = "Intermediate",
                DaysPerWeek = 4,
                PreferredDurationMinutes = 45,
                WorkoutMode = "Hybrid",
                HasEquipment = true,
                AvailableEquipment = new List<string> { "Dumbbells", "Pull Up Bar" },
                FocusAreas = new List<string> { "Chest", "Back" }
            };

            var result = await _workoutService.GenerateAiPlanAsync(_testUser.Id, req);

            Assert.True(result.IsSuccess);
            var allExercises = result.Data.SuggestedDays
                .Where(d => !d.IsRestDay)
                .SelectMany(d => d.Exercises)
                .ToList();

            Assert.Contains(allExercises, e => !e.RequiresEquipment);
            Assert.Contains(allExercises, e => e.RequiresEquipment);
        }

        [Fact]
        public async Task GenerateAiPlan_ProducesVariationAcrossRepeatedRequests()
        {
            var exercises = await _context.Exercises.ToListAsync();
            var req = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Build Muscle",
                FitnessLevel = "Intermediate",
                DaysPerWeek = 4,
                PreferredDurationMinutes = 45,
                WorkoutMode = "Without Equipment"
            };

            var plan1 = DeterministicWorkoutGenerator.GeneratePlan(req, exercises, randomSeed: 101);
            var plan2 = DeterministicWorkoutGenerator.GeneratePlan(req, exercises, randomSeed: 999);

            var exNames1 = plan1.SuggestedDays.Where(d => !d.IsRestDay).SelectMany(d => d.Exercises.Select(e => e.ExerciseName)).ToList();
            var exNames2 = plan2.SuggestedDays.Where(d => !d.IsRestDay).SelectMany(d => d.Exercises.Select(e => e.ExerciseName)).ToList();

            // Distinct seeds produce varied exercise sequences when alternatives exist
            bool areIdentical = exNames1.SequenceEqual(exNames2);
            Assert.False(areIdentical);
        }

        [Fact]
        public async Task ToggleExerciseCompletion_TodayOnly_PersistsAndAllowsUndo()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();

            var today = DateTime.UtcNow.Date;

            // Act 1: Complete today's exercise
            var completeResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, today, true);

            // Assert 1
            Assert.True(completeResult.IsSuccess);
            Assert.True(completeResult.Data.Exercises.First(e => e.Id == exercise.Id).IsCompleted);

            // Act 2: Undo completion
            var undoResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, today, false);

            // Assert 2
            Assert.True(undoResult.IsSuccess);
            Assert.False(undoResult.Data.Exercises.First(e => e.Id == exercise.Id).IsCompleted);
        }

        [Fact]
        public async Task ToggleExerciseCompletion_PastOrFutureDate_IsRejected()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();

            var yesterday = DateTime.UtcNow.Date.AddDays(-1);
            var tomorrow = DateTime.UtcNow.Date.AddDays(1);

            // Act & Assert
            var pastResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, yesterday, true);
            Assert.False(pastResult.IsSuccess);

            var futureResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, tomorrow, true);
            Assert.False(futureResult.IsSuccess);
        }

        [Fact]
        public async Task ToggleExerciseCompletion_CompletingAllExercises_MarksDayAndBridgesHealthLog()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var today = DateTime.UtcNow.Date;

            // Act: Mark every exercise complete
            foreach (var ex in activeDay.Exercises)
            {
                var stepResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, ex.Id, today, true);
                Assert.True(stepResult.IsSuccess);
            }

            // Assert: Day is completed
            var updatedDay = await _workoutService.GetWorkoutDayAsync(_testUser.Id, activeDay.Id, today);
            Assert.True(updatedDay.IsSuccess);
            Assert.True(updatedDay.Data.IsCompletedForDate);
            Assert.Equal(activeDay.Exercises.Count, updatedDay.Data.CompletedExercisesCount);

            // Assert: HealthLog was bridged for this user
            var healthLogs = await _context.HealthLogs.Where(h => h.UserId == _testUser.Id && h.LogType == "Workout").ToListAsync();
            Assert.NotEmpty(healthLogs);
        }

        [Fact]
        public async Task UpdateDayAsync_PastDate_IsRejected()
        {
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay);

            var pastUpdateDto = new UpdateWorkoutDayDto
            {
                FocusTitle = "Attempted Past Modification",
                TargetDate = DateTime.UtcNow.Date.AddDays(-2)
            };

            var result = await _workoutService.UpdateDayAsync(_testUser.Id, activeDay.Id, pastUpdateDto);
            Assert.False(result.IsSuccess);
            Assert.Contains("immutable", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task ExerciseCompletion_UserIsolation_RejectsCrossUserCompletion()
        {
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var exercise = planResult.Data.Days.First(d => !d.IsRestDay).Exercises.First();

            var otherUser = new User { FullName = "Other User", Email = "other@example.com", PasswordHash = "hash" };
            _context.Users.Add(otherUser);
            await _context.SaveChangesAsync();

            var result = await _workoutService.ToggleExerciseCompletionAsync(otherUser.Id, exercise.Id, DateTime.UtcNow.Date, true);
            Assert.False(result.IsSuccess);
            Assert.Contains("Unauthorized", result.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task ToggleExerciseCompletion_WithClientReferenceDate_ValidatesAgainstClientLocalDay()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();

            // Client local day is Sunday, Oct 18, 2026
            var clientToday = new DateTime(2026, 10, 18);
            var pastDate = new DateTime(2026, 10, 17);
            var futureDate = new DateTime(2026, 10, 19);

            // Act 1: Complete today's session (Oct 18) using clientReferenceDate
            var completeResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, clientToday, true, clientToday);
            Assert.True(completeResult.IsSuccess);
            Assert.True(completeResult.Data.Exercises.First(e => e.Id == exercise.Id).IsCompleted);

            // Act 2: Attempting to complete yesterday (Oct 17) must be rejected
            var pastResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, pastDate, true, clientToday);
            Assert.False(pastResult.IsSuccess);
            Assert.Contains("Past workouts are view-only", pastResult.Message);

            // Act 3: Attempting to complete tomorrow (Oct 19) must be rejected
            var futureResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, futureDate, true, clientToday);
            Assert.False(futureResult.IsSuccess);
            Assert.Contains("Future workouts cannot be completed early", futureResult.Message);

            // Act 4: Undo completion on today's session succeeds
            var undoResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, clientToday, false, clientToday);
            Assert.True(undoResult.IsSuccess);
            Assert.False(undoResult.Data.Exercises.First(e => e.Id == exercise.Id).IsCompleted);
        }

        [Fact]
        public async Task WorkoutController_CompleteExercise_WithTimezoneHeader_EnforcesTodayDateMatching()
        {
            // Arrange
            var controller = new WorkoutController(_workoutService);
            SetControllerUser(controller, _testUser.Id);

            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();

            // Set timezone header to Asia/Kolkata
            controller.HttpContext.Request.Headers["X-Client-Timezone"] = "Asia/Kolkata";
            controller.HttpContext.Request.Headers["X-Client-Offset"] = "-330";

            var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
            var expectedToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;

            // Act: Complete for expected user today
            var actionResult = await controller.CompleteExercise(exercise.Id, expectedToday);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var response = Assert.IsType<ApiResponse<WorkoutDayDto>>(okResult.Value);
            Assert.True(response.IsSuccess);
        }

        [Fact]
        public async Task WorkoutActions_DoNotModifyPlannerEvents_EnsuresPlannerIndependence()
        {
            // Arrange
            int initialPlannerEventCount = await _context.PlannerEvents.CountAsync();

            // Act 1: Get or generate active plan
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            Assert.True(planResult.IsSuccess);

            // Act 2: Generate AI plan
            var genReq = new GenerateAiWorkoutPlanRequestDto
            {
                Goal = "Build Muscle",
                FitnessLevel = "Beginner",
                DaysPerWeek = 4,
                PreferredDurationMinutes = 30,
                WorkoutMode = "Without Equipment"
            };
            var aiResult = await _workoutService.GenerateAiPlanAsync(_testUser.Id, genReq);
            Assert.True(aiResult.IsSuccess);

            // Act 3: Complete and Undo an exercise
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();
            var today = DateTime.UtcNow.Date;

            var completeResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, today, true);
            Assert.True(completeResult.IsSuccess);

            var undoResult = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, today, false);
            Assert.True(undoResult.IsSuccess);

            // Assert: Absolutely no PlannerEvents were added or modified
            int finalPlannerEventCount = await _context.PlannerEvents.CountAsync();
            Assert.Equal(initialPlannerEventCount, finalPlannerEventCount);
        }

        [Fact]
        public async Task SyncPlannerAsync_NeverSyncsRestDaysOrDaysWithRestTitle()
        {
            // Arrange: Ensure user has a plan with both active workout and rest days
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var monday = new DateTime(2026, 10, 19);

            // Act: Perform explicit sync
            var syncResult = await _workoutService.SyncPlannerAsync(_testUser.Id, monday);
            Assert.True(syncResult.IsSuccess);

            // Assert: Verify synced events in database
            var syncedEvents = await _context.PlannerEvents
                .Where(e => e.UserId == _testUser.Id && e.Description != null && e.Description.Contains("[WorkoutSync:DayId:"))
                .ToListAsync();

            // None of the synced events must have "Rest" in title or description
            Assert.NotEmpty(syncedEvents);
            Assert.All(syncedEvents, evt =>
            {
                Assert.DoesNotContain("Rest", evt.Title, StringComparison.OrdinalIgnoreCase);
                Assert.DoesNotContain("Complete Rest Day", evt.Description, StringComparison.OrdinalIgnoreCase);
            });
        }

        [Fact]
        public async Task CompletingSingleExercise_ProducesExactlyOneCompletedExercise_IdempotentOnRepeatedCalls()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();
            var monday = new DateTime(2026, 10, 19);

            // Act 1: Complete 1 exercise
            var res1 = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, monday, true, clientReferenceDate: monday);
            Assert.True(res1.IsSuccess, res1.Message);

            // Verify week summary
            var summary1 = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);
            Assert.True(summary1.IsSuccess, summary1.Message);
            Assert.Equal(1, summary1.Data.CompletedExercises);

            // Act 2: Repeated completion call (idempotency check)
            var res2 = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, monday, true, clientReferenceDate: monday);
            Assert.True(res2.IsSuccess, res2.Message);

            var summary2 = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);
            Assert.True(summary2.IsSuccess, summary2.Message);
            Assert.Equal(1, summary2.Data.CompletedExercises);

            // Act 3: Undo completion
            var undoRes = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, monday, false, clientReferenceDate: monday);
            Assert.True(undoRes.IsSuccess, undoRes.Message);

            var summaryUndo = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);
            Assert.True(summaryUndo.IsSuccess, summaryUndo.Message);
            Assert.Equal(0, summaryUndo.Data.CompletedExercises);
        }

        [Fact]
        public async Task PlannedExercises_ContributeNothingToCompletedWorkMetrics_AndAllMuscleGroupsZeroWhenEmpty()
        {
            // Arrange: User with active plan, 0 completions
            var monday = new DateTime(2026, 10, 19);

            // Act
            var summary = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);

            // Assert
            Assert.True(summary.IsSuccess, summary.Message);
            Assert.Equal(0, summary.Data.CompletedExercises);
            Assert.Equal(0, summary.Data.CompletedWorkouts);
            Assert.Equal(0, summary.Data.TotalMinutesExercised);
            Assert.Equal(0, summary.Data.TotalEstimatedCaloriesBurned);

            // All standard muscle groups must be exactly 0%
            var completedDist = summary.Data.CompletedMuscleGroupFocusPercentages;
            Assert.NotNull(completedDist);
            var standardGroups = new[] { "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio" };
            foreach (var group in standardGroups)
            {
                Assert.True(completedDist.ContainsKey(group));
                Assert.Equal(0, completedDist[group]);
            }

            // Coaching tips should provide foundational beginner advice when 0 exercises are completed
            Assert.NotEmpty(summary.Data.PersonalizedCoachingTips);
            Assert.Contains(summary.Data.PersonalizedCoachingTips, t => t.Contains("Personalized Insights"));
        }

        [Fact]
        public async Task CompletedExercise_UpdatesOnlyRelevantMuscleGroup_CalculatesActualDurationAndCalories()
        {
            // Arrange
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise = activeDay.Exercises.First();
            var monday = new DateTime(2026, 10, 19);

            // Act: Complete exercise
            var res = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, monday, true, clientReferenceDate: monday);
            Assert.True(res.IsSuccess, res.Message);

            // Assert
            var summary = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);
            Assert.True(summary.IsSuccess, summary.Message);
            Assert.Equal(1, summary.Data.CompletedExercises);

            // Verify actual duration is based on completed exercise (~4-5 mins), not full planned 30 mins
            Assert.True(summary.Data.TotalMinutesExercised > 0);
            Assert.True(summary.Data.TotalMinutesExercised < activeDay.TargetDurationMinutes);

            // Verify calories are based on completed exercise (~20-40 kcal), not full planned 270 kcal
            Assert.True(summary.Data.TotalEstimatedCaloriesBurned > 0);
            Assert.True(summary.Data.TotalEstimatedCaloriesBurned < 200);

            // Muscle group focus: the targeted category must be > 0 and others 0
            var exCat = exercise.Category;
            if (summary.Data.CompletedMuscleGroupFocusPercentages.ContainsKey(exCat))
            {
                Assert.Equal(100, summary.Data.CompletedMuscleGroupFocusPercentages[exCat]);
            }

            // Check HealthLog consistency
            var healthLogs = await _context.HealthLogs
                .Where(h => h.UserId == _testUser.Id && h.LogType == "Workout" && h.LogDate.Date == monday.Date)
                .ToListAsync();
            Assert.Single(healthLogs);
            Assert.Equal(summary.Data.TotalMinutesExercised, healthLogs[0].LogValue);

            // Act 2: Undo exercise reverses everything
            var undoRes = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise.Id, monday, false, clientReferenceDate: monday);
            Assert.True(undoRes.IsSuccess, undoRes.Message);

            var postUndoSummary = await _workoutService.GetWeekSummaryAsync(_testUser.Id, monday);
            Assert.Equal(0, postUndoSummary.Data.CompletedExercises);
            Assert.Equal(0, postUndoSummary.Data.TotalMinutesExercised);
            Assert.Equal(0, postUndoSummary.Data.TotalEstimatedCaloriesBurned);

            var remainingHealthLogs = await _context.HealthLogs
                .Where(h => h.UserId == _testUser.Id && h.LogType == "Workout" && h.LogDate.Date == monday.Date)
                .ToListAsync();
            Assert.Empty(remainingHealthLogs);
        }

        [Fact]
        public async Task MultiUserIsolation_WorkoutMetricsIsolatedPerAuthenticatedUser()
        {
            // Arrange: create a second user
            var user2 = new User
            {
                FullName = "Other User",
                Email = "other@example.com",
                PasswordHash = "hash456"
            };
            _context.Users.Add(user2);
            await _context.SaveChangesAsync();

            var monday = new DateTime(2026, 10, 19);
            var planResult1 = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay1 = planResult1.Data.Days.First(d => !d.IsRestDay && d.Exercises.Any());
            var exercise1 = activeDay1.Exercises.First();

            // Act: user 1 completes an exercise
            await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday);

            // User 2 gets active plan and summary
            await _workoutService.GetActivePlanAsync(user2.Id);
            var summary2 = await _workoutService.GetWeekSummaryAsync(user2.Id, monday);

            // Assert: User 2 has 0 completed exercises, 0 mins, 0 calories, all 0% muscle distribution
            Assert.True(summary2.IsSuccess, summary2.Message);
            Assert.Equal(0, summary2.Data.CompletedExercises);
            Assert.Equal(0, summary2.Data.TotalMinutesExercised);
            Assert.Equal(0, summary2.Data.TotalEstimatedCaloriesBurned);
            foreach (var kvp in summary2.Data.CompletedMuscleGroupFocusPercentages)
            {
                Assert.Equal(0, kvp.Value);
            }
        }

        [Fact]
        public async Task WorkoutDurationTracking_UpdatesHealthOverviewLog_AccumulatesMultipleExercisesAndIsIdempotent()
        {
            // Arrange
            var healthService = new HealthService(_context);
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Count >= 2);
            var exercise1 = activeDay.Exercises[0];
            var exercise2 = activeDay.Exercises[1];
            var monday = new DateTime(2026, 10, 19);

            // Initial state: Health logs have 0 workout minutes
            var initialHealthLogs = await healthService.GetLogsAsync(_testUser.Id, monday);
            Assert.True(initialHealthLogs.IsSuccess);
            Assert.DoesNotContain(initialHealthLogs.Data, l => l.LogType == "Workout");

            // Act 1: Complete exercise 1
            var res1 = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday);
            Assert.True(res1.IsSuccess, res1.Message);

            // Assert: HealthLog exists with calculated duration for exercise 1
            var healthLogs1 = await healthService.GetLogsAsync(_testUser.Id, monday);
            var workoutLog1 = Assert.Single(healthLogs1.Data, l => l.LogType == "Workout");
            float duration1 = workoutLog1.LogValue;
            Assert.True(duration1 > 0);
            Assert.True(duration1 < activeDay.TargetDurationMinutes);

            // Act 2: Repeated completion of exercise 1 (idempotency check)
            var resRepeat = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday);
            Assert.True(resRepeat.IsSuccess, resRepeat.Message);

            var healthLogsRepeat = await healthService.GetLogsAsync(_testUser.Id, monday);
            var workoutLogRepeat = Assert.Single(healthLogsRepeat.Data, l => l.LogType == "Workout");
            Assert.Equal(duration1, workoutLogRepeat.LogValue);

            // Act 3: Complete exercise 2 -> duration accumulates
            var res2 = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise2.Id, monday, true, clientReferenceDate: monday);
            Assert.True(res2.IsSuccess, res2.Message);

            var healthLogs2 = await healthService.GetLogsAsync(_testUser.Id, monday);
            var totalDuration2 = healthLogs2.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.True(totalDuration2 > duration1);

            // Act 4: Undo exercise 2 -> duration reverses back to duration1
            var undoRes2 = await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise2.Id, monday, false, clientReferenceDate: monday);
            Assert.True(undoRes2.IsSuccess, undoRes2.Message);

            var healthLogsAfterUndo = await healthService.GetLogsAsync(_testUser.Id, monday);
            var totalAfterUndo = healthLogsAfterUndo.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(duration1, totalAfterUndo);
        }

        [Fact]
        public async Task WorkoutDurationTracking_WithActualDuration_UpdatesAccuratelyAndEditsCorrectly()
        {
            // Arrange
            var healthService = new HealthService(_context);
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Count >= 2);
            var exercise1 = activeDay.Exercises[0];
            var exercise2 = activeDay.Exercises[1];
            var monday = new DateTime(2026, 10, 19);

            // Step 1: Reject invalid actual minutes (0 and negative)
            var zeroResult = await _workoutService.ToggleExerciseCompletionAsync(
                _testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 0);
            Assert.False(zeroResult.IsSuccess);
            Assert.Contains("positive", zeroResult.Message, StringComparison.OrdinalIgnoreCase);

            var negResult = await _workoutService.ToggleExerciseCompletionAsync(
                _testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: -5);
            Assert.False(negResult.IsSuccess);

            // Step 2: Complete exercise 1 with 8 minutes
            var res1 = await _workoutService.ToggleExerciseCompletionAsync(
                _testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 8);
            Assert.True(res1.IsSuccess);
            var dayDto1 = res1.Data;
            var ex1Dto = dayDto1.Exercises.First(e => e.Id == exercise1.Id);
            Assert.True(ex1Dto.IsCompleted);
            Assert.Equal(8, ex1Dto.ActualDurationMinutes);

            var healthLogs1 = await healthService.GetLogsAsync(_testUser.Id, monday);
            var total1 = healthLogs1.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(8, total1);

            // Step 3: Complete exercise 2 with 12 minutes -> total becomes 20
            var res2 = await _workoutService.ToggleExerciseCompletionAsync(
                _testUser.Id, exercise2.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 12);
            Assert.True(res2.IsSuccess);

            var healthLogs2 = await healthService.GetLogsAsync(_testUser.Id, monday);
            var total2 = healthLogs2.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(20, total2);

            // Step 4: Correct exercise 1 duration from 8 to 10 minutes -> total becomes 22
            var resEdit = await _workoutService.ToggleExerciseCompletionAsync(
                _testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 10);
            Assert.True(resEdit.IsSuccess);
            var ex1Edited = resEdit.Data.Exercises.First(e => e.Id == exercise1.Id);
            Assert.Equal(10, ex1Edited.ActualDurationMinutes);

            var healthLogs3 = await healthService.GetLogsAsync(_testUser.Id, monday);
            var total3 = healthLogs3.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(22, total3);

            // Step 5: Verify no personal planner tasks were created
            var plannerEventsCount = await _context.PlannerEvents.CountAsync(p => p.UserId == _testUser.Id);
            Assert.Equal(0, plannerEventsCount);
        }

        [Fact]
        public async Task HealthActivityLog_Deletion_SynchronizesWithWorkoutSessionProgress()
        {
            // Arrange
            var healthService = new HealthService(_context);
            var planResult = await _workoutService.GetActivePlanAsync(_testUser.Id);
            var activeDay = planResult.Data.Days.First(d => !d.IsRestDay && d.Exercises.Count >= 2);
            var exercise1 = activeDay.Exercises[0];
            var exercise2 = activeDay.Exercises[1];
            var monday = new DateTime(2026, 10, 19);

            // Complete both exercises (8m and 12m)
            await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise1.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 8);
            await _workoutService.ToggleExerciseCompletionAsync(_testUser.Id, exercise2.Id, monday, true, clientReferenceDate: monday, actualDurationMinutes: 12);

            var dayBeforeDelete = (await _workoutService.GetWorkoutDayAsync(_testUser.Id, activeDay.Id, monday)).Data;
            Assert.Equal(2, dayBeforeDelete.Exercises.Count(e => e.IsCompleted));

            // Find exercise 1's completion and linked HealthLog
            var comp1 = await _context.WorkoutExerciseCompletions.FirstAsync(c => c.UserId == _testUser.Id && c.WorkoutDayExerciseId == exercise1.Id && c.SessionDate == monday);
            Assert.NotNull(comp1.HealthLogId);

            // Act: Delete exercise 1's HealthLog from Health Activity
            var deleteResult = await healthService.DeleteLogAsync(comp1.HealthLogId.Value);
            Assert.True(deleteResult.IsSuccess);

            // Assert: Exercise 1 is now incomplete, Exercise 2 is still complete
            var dayAfterDelete = (await _workoutService.GetWorkoutDayAsync(_testUser.Id, activeDay.Id, monday)).Data;
            var ex1After = dayAfterDelete.Exercises.First(e => e.Id == exercise1.Id);
            var ex2After = dayAfterDelete.Exercises.First(e => e.Id == exercise2.Id);

            Assert.False(ex1After.IsCompleted);
            Assert.True(ex2After.IsCompleted);
            Assert.Equal(1, dayAfterDelete.Exercises.Count(e => e.IsCompleted));

            // Total Health Activity workout duration now reflects only exercise 2 (12 mins)
            var healthLogsAfter = await healthService.GetLogsAsync(_testUser.Id, monday);
            var totalRemaining = healthLogsAfter.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(12, totalRemaining);

            // Delete remaining exercise 2's HealthLog -> returns to 0%
            var comp2 = await _context.WorkoutExerciseCompletions.FirstAsync(c => c.UserId == _testUser.Id && c.WorkoutDayExerciseId == exercise2.Id && c.SessionDate == monday);
            Assert.NotNull(comp2.HealthLogId);
            await healthService.DeleteLogAsync(comp2.HealthLogId.Value);

            var dayAfterAllDeleted = (await _workoutService.GetWorkoutDayAsync(_testUser.Id, activeDay.Id, monday)).Data;
            Assert.Equal(0, dayAfterAllDeleted.Exercises.Count(e => e.IsCompleted));
            Assert.False(dayAfterAllDeleted.IsCompletedForDate);

            var healthLogsFinal = await healthService.GetLogsAsync(_testUser.Id, monday);
            var totalFinal = healthLogsFinal.Data.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            Assert.Equal(0, totalFinal);
        }

        [Fact]
        public async Task CustomExercises_ArePrivateToOwner_AndAddableToRoutines()
        {
            // Arrange
            var userB = new User
            {
                FullName = "User B",
                Email = "userb@lifesync.ai",
                PasswordHash = "hash123"
            };
            _context.Users.Add(userB);
            await _context.SaveChangesAsync();

            var customDto = new CreateCustomExerciseDto
            {
                Name = "Nordic Hamstring Curl",
                Category = "Legs",
                TargetMuscles = "Hamstrings, Glutes",
                SecondaryMuscles = "Calves, Lower Back",
                RequiresEquipment = false,
                EquipmentType = "Bodyweight",
                DifficultyLevel = "Advanced",
                DefaultSets = 4,
                DefaultReps = 6,
                DefaultRestSeconds = 90,
                Description = "High eccentric tension hamstring developer.",
                Instructions = "Anchor feet firmly, slowly lower body with controlled eccentric tempo.",
                VideoUrl = "https://www.youtube.com/watch?v=sample"
            };

            // Act 1: User A creates custom exercise
            var createRes = await _workoutService.CreateCustomExerciseAsync(_testUser.Id, customDto);
            Assert.True(createRes.IsSuccess);
            Assert.True(createRes.Data.IsCustom);
            Assert.Equal(_testUser.Id, createRes.Data.UserId);

            // Act 2: User A lists exercises -> finds it
            var userAList = await _workoutService.GetExercisesAsync(userId: _testUser.Id);
            Assert.Contains(userAList.Data, e => e.Name == "Nordic Hamstring Curl" && e.IsCustom);

            // Act 3: User B lists exercises -> DOES NOT see User A's custom exercise (private)
            var userBList = await _workoutService.GetExercisesAsync(userId: userB.Id);
            Assert.DoesNotContain(userBList.Data, e => e.Name == "Nordic Hamstring Curl");
        }

        private static void SetControllerUser(ControllerBase controller, int userId)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, "test@example.com")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }
    }
}
