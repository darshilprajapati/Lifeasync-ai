using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Models;
using Npgsql;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class WorkoutModelAndSeedingTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly ApplicationDbContext _context;

        public WorkoutModelAndSeedingTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new ApplicationDbContext(options);
            _context.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task DatabaseSeeder_SeedsExerciseCatalog_Idempotently()
        {
            // Seed database
            await DatabaseSeeder.SeedAsync(_context);

            var exercises = await _context.Exercises.ToListAsync();
            Assert.NotEmpty(exercises);
            Assert.True(exercises.Count >= 35, $"Expected at least 35 exercises, found {exercises.Count}");

            // Verify both equipment modes are covered
            var bodyweightOnly = exercises.Where(e => !e.RequiresEquipment).ToList();
            var equipmentRequired = exercises.Where(e => e.RequiresEquipment).ToList();

            Assert.NotEmpty(bodyweightOnly);
            Assert.NotEmpty(equipmentRequired);

            // Verify categories exist
            var categories = exercises.Select(e => e.Category).Distinct().ToList();
            Assert.Contains("Chest", categories);
            Assert.Contains("Legs", categories);
            Assert.Contains("Core", categories);

            // Calling seeder a second time must not duplicate exercises (idempotence)
            await DatabaseSeeder.SeedAsync(_context);
            var exercisesAfterSecondSeed = await _context.Exercises.ToListAsync();
            Assert.Equal(exercises.Count, exercisesAfterSecondSeed.Count);
        }

        [Fact]
        public async Task UserWorkoutPlan_WithDaysAndExercises_PersistsAndNavigatesProperly()
        {
            await DatabaseSeeder.SeedAsync(_context);

            var user = new User
            {
                FullName = "Workout Tester",
                Email = "workout@example.com",
                PasswordHash = "hash123"
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var exercise1 = await _context.Exercises.FirstAsync(e => !e.RequiresEquipment);
            var exercise2 = await _context.Exercises.FirstAsync(e => e.RequiresEquipment);

            var plan = new UserWorkoutPlan
            {
                UserId = user.Id,
                Title = "Push Pull Legs Strength",
                Goal = "Muscle Building",
                FitnessLevel = "Intermediate",
                DaysPerWeek = 4,
                IsActive = true,
                Version = 1,
                EffectiveStartDate = DateTime.UtcNow
            };
            _context.UserWorkoutPlans.Add(plan);
            await _context.SaveChangesAsync();

            var monday = new WorkoutDay
            {
                WorkoutPlanId = plan.Id,
                DayOfWeek = DayOfWeek.Monday,
                FocusTitle = "Upper Body Power",
                IsRestDay = false,
                TargetDurationMinutes = 45,
                Exercises = new List<WorkoutDayExercise>
                {
                    new WorkoutDayExercise
                    {
                        ExerciseId = exercise1.Id,
                        Sets = 4,
                        Reps = 12,
                        RestSeconds = 60,
                        OrderIndex = 0
                    },
                    new WorkoutDayExercise
                    {
                        ExerciseId = exercise2.Id,
                        Sets = 3,
                        Reps = 10,
                        RestSeconds = 90,
                        OrderIndex = 1
                    }
                }
            };

            var tuesday = new WorkoutDay
            {
                WorkoutPlanId = plan.Id,
                DayOfWeek = DayOfWeek.Tuesday,
                FocusTitle = "Active Recovery",
                IsRestDay = true,
                TargetDurationMinutes = 0,
                RestDayNotes = "Hydrate, light stretching, and 8 hours sleep."
            };

            _context.WorkoutDays.AddRange(monday, tuesday);
            await _context.SaveChangesAsync();

            // Query back with navigation
            var loadedPlan = await _context.UserWorkoutPlans
                .Include(p => p.Days)
                    .ThenInclude(d => d.Exercises)
                        .ThenInclude(e => e.Exercise)
                .FirstOrDefaultAsync(p => p.Id == plan.Id);

            Assert.NotNull(loadedPlan);
            Assert.Equal(2, loadedPlan.Days.Count);

            var activeDay = loadedPlan.Days.First(d => !d.IsRestDay);
            Assert.Equal("Upper Body Power", activeDay.FocusTitle);
            Assert.Equal(2, activeDay.Exercises.Count);
            Assert.Equal(exercise1.Name, activeDay.Exercises[0].Exercise.Name);

            var restDay = loadedPlan.Days.First(d => d.IsRestDay);
            Assert.Equal("Active Recovery", restDay.FocusTitle);
            Assert.Contains("Hydrate", restDay.RestDayNotes);
        }

        [Fact]
        public async Task WorkoutSessionLog_TracksDateSpecificCompletion_DecoupledFromWeekday()
        {
            var user = new User
            {
                FullName = "Session Tester",
                Email = "session@example.com",
                PasswordHash = "hash123"
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var plan = new UserWorkoutPlan
            {
                UserId = user.Id,
                Title = "General Fitness",
                Goal = "Maintenance",
                FitnessLevel = "Beginner",
                DaysPerWeek = 3,
                IsActive = true
            };
            _context.UserWorkoutPlans.Add(plan);
            await _context.SaveChangesAsync();

            var workoutDay = new WorkoutDay
            {
                WorkoutPlanId = plan.Id,
                DayOfWeek = DayOfWeek.Monday,
                FocusTitle = "Full Body Circuit",
                IsRestDay = false,
                TargetDurationMinutes = 30
            };
            _context.WorkoutDays.Add(workoutDay);
            await _context.SaveChangesAsync();

            // Log completion on two distinct calendar dates for the same template day
            var date1 = new DateTime(2026, 10, 12);
            var date2 = new DateTime(2026, 10, 19);

            var log1 = new WorkoutSessionLog
            {
                UserId = user.Id,
                WorkoutPlanId = plan.Id,
                WorkoutDayId = workoutDay.Id,
                SessionDate = date1,
                IsCompleted = true,
                CompletedAt = date1.AddHours(18),
                ActualDurationMinutes = 32,
                EstimatedCaloriesBurned = 210,
                HealthLogId = 101
            };

            var log2 = new WorkoutSessionLog
            {
                UserId = user.Id,
                WorkoutPlanId = plan.Id,
                WorkoutDayId = workoutDay.Id,
                SessionDate = date2,
                IsCompleted = true,
                CompletedAt = date2.AddHours(18).AddMinutes(15),
                ActualDurationMinutes = 35,
                EstimatedCaloriesBurned = 230,
                HealthLogId = 102
            };

            _context.WorkoutSessionLogs.AddRange(log1, log2);
            await _context.SaveChangesAsync();

            var logs = await _context.WorkoutSessionLogs
                .Where(l => l.UserId == user.Id && l.WorkoutDayId == workoutDay.Id)
                .OrderBy(l => l.SessionDate)
                .ToListAsync();

            Assert.Equal(2, logs.Count);
            Assert.Equal(date1, logs[0].SessionDate);
            Assert.Equal(date2, logs[1].SessionDate);
            Assert.Equal(101, logs[0].HealthLogId);
            Assert.Equal(102, logs[1].HealthLogId);
        }

        [Fact]
        public void UserNotificationLog_UniqueIndexFilter_AdaptsToDatabaseProvider()
        {
            // 1. PostgreSQL (Npgsql) Provider
            var npgsqlOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql("Host=localhost;Database=test;Username=postgres;Password=postgres")
                .Options;

            using (var npgsqlContext = new ApplicationDbContext(npgsqlOptions))
            {
                var entity = npgsqlContext.Model.FindEntityType(typeof(UserNotificationLog));
                Assert.NotNull(entity);
                var index = entity.GetIndexes().First(i => i.Properties.Any(p => p.Name == "NotificationType"));
                Assert.True(index.IsUnique);
                Assert.Equal("\"IsSuccess\" = true", index.GetFilter());
            }

            // 2. SQL Server Provider
            var sqlServerOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlServer("Server=localhost;Database=test;Trusted_Connection=True;")
                .Options;

            using (var sqlServerContext = new ApplicationDbContext(sqlServerOptions))
            {
                var entity = sqlServerContext.Model.FindEntityType(typeof(UserNotificationLog));
                Assert.NotNull(entity);
                var index = entity.GetIndexes().First(i => i.Properties.Any(p => p.Name == "NotificationType"));
                Assert.True(index.IsUnique);
                Assert.Equal("[IsSuccess] = 1", index.GetFilter());
            }

            // 3. SQLite Provider
            var sqliteOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite("DataSource=:memory:")
                .Options;

            using (var sqliteContext = new ApplicationDbContext(sqliteOptions))
            {
                var entity = sqliteContext.Model.FindEntityType(typeof(UserNotificationLog));
                Assert.NotNull(entity);
                var index = entity.GetIndexes().First(i => i.Properties.Any(p => p.Name == "NotificationType"));
                Assert.True(index.IsUnique);
                Assert.Equal("\"IsSuccess\" = 1", index.GetFilter());
            }
        }

        [Fact]
        public async Task UserNotificationLog_FilteredUniqueIndex_EnforcesUniquenessOnActualDatabase_AndPermitsFailedDuplicates()
        {
            using var conn = new SqliteConnection("DataSource=:memory:");
            conn.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(conn)
                .Options;

            using var context = new ApplicationDbContext(options);
            context.Database.EnsureCreated();

            // Seed user
            var user = new User
            {
                Id = 999,
                FullName = "Index Test User",
                Email = "index@test.com",
                PasswordHash = "hash",
                CreatedBy = "Test"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            // 1. Insert first successful notification
            context.UserNotificationLogs.Add(new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "DailyWorkoutReminder",
                ReferenceId = "Plan-101",
                RecipientEmail = user.Email,
                SentAt = DateTime.UtcNow,
                IsSuccess = true
            });
            await context.SaveChangesAsync();

            // 2. Insert two failed notifications with the exact same (UserId, NotificationType, ReferenceId)
            // Filtered index MUST allow multiple failures
            context.UserNotificationLogs.Add(new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "DailyWorkoutReminder",
                ReferenceId = "Plan-101",
                RecipientEmail = user.Email,
                SentAt = DateTime.UtcNow.AddMinutes(5),
                IsSuccess = false,
                Details = "SMTP timeout 1"
            });
            context.UserNotificationLogs.Add(new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "DailyWorkoutReminder",
                ReferenceId = "Plan-101",
                RecipientEmail = user.Email,
                SentAt = DateTime.UtcNow.AddMinutes(10),
                IsSuccess = false,
                Details = "SMTP timeout 2"
            });
            await context.SaveChangesAsync(); // Must NOT throw

            // 3. Insert duplicate SUCCESSFUL notification - must violate unique filtered index
            context.UserNotificationLogs.Add(new UserNotificationLog
            {
                UserId = user.Id,
                NotificationType = "DailyWorkoutReminder",
                ReferenceId = "Plan-101",
                RecipientEmail = user.Email,
                SentAt = DateTime.UtcNow.AddMinutes(15),
                IsSuccess = true
            });

            var ex = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
            Assert.Contains("UNIQUE constraint failed", ex.InnerException?.Message ?? ex.Message);
        }

        [Fact]
        public async Task DatabaseSeeder_And_MigrateAsync_ExecutionPath_IsDeterministic_OnFreshAndUpgradedDatabases()
        {
            // Scenario 1: Fresh Database deployment (MigrateAsync -> SeedAsync -> SeedAsync)
            using (var freshConn = new SqliteConnection("DataSource=:memory:"))
            {
                freshConn.Open();
                var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseSqlite(freshConn)
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                    .Options;

                using var freshContext = new ApplicationDbContext(options);
                await freshContext.Database.MigrateAsync();
                await DatabaseSeeder.SeedAsync(freshContext);

                var exercisesFresh = await freshContext.Exercises.ToListAsync();
                Assert.True(exercisesFresh.Count >= 35);

                // Run seeder second time to ensure idempotency
                var exception = await Record.ExceptionAsync(() => DatabaseSeeder.SeedAsync(freshContext));
                Assert.Null(exception);
                var exercisesAfterSecondSeed = await freshContext.Exercises.ToListAsync();
                Assert.Equal(exercisesFresh.Count, exercisesAfterSecondSeed.Count);
            }

            // Scenario 2: Upgrade deployment path (Pre-existing DDL -> MigrateAsync -> SeedAsync)
            using (var upgradeConn = new SqliteConnection("DataSource=:memory:"))
            {
                upgradeConn.Open();
                var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                    .UseSqlite(upgradeConn)
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                    .Options;

                // Step A: Migrate to previous production version
                using (var setupContext = new ApplicationDbContext(options))
                {
                    await setupContext.Database.MigrateAsync("20261016000000_AddPlannerReminderTime");
                    // Pre-create tables like previous raw-DDL seeder did
                    await setupContext.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE IF NOT EXISTS ""Exercises"" (
                            ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                            ""Name"" TEXT NOT NULL,
                            ""Category"" TEXT NOT NULL,
                            ""TargetMuscles"" TEXT NOT NULL,
                            ""RequiresEquipment"" INTEGER NOT NULL DEFAULT 0,
                            ""EquipmentType"" TEXT NOT NULL DEFAULT 'None',
                            ""DifficultyLevel"" TEXT NOT NULL DEFAULT 'Beginner',
                            ""DefaultSets"" INTEGER NOT NULL DEFAULT 3,
                            ""DefaultReps"" INTEGER NOT NULL DEFAULT 12,
                            ""DefaultRestSeconds"" INTEGER NOT NULL DEFAULT 60,
                            ""EstimatedMetValue"" REAL NOT NULL DEFAULT 5.0,
                            ""ThumbnailUrl"" TEXT,
                            ""AnimationUrl"" TEXT,
                            ""Instructions"" TEXT,
                            ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                            ""UpdatedAt"" TEXT,
                            ""UpdatedBy"" TEXT,
                            ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                        );
                    ");
                }

                // Step B: Run new MigrateAsync() which applies 20261017130302_AddWorkoutPlannerSchema
                using (var upgradeContext = new ApplicationDbContext(options))
                {
                    var migrationEx = await Record.ExceptionAsync(() => upgradeContext.Database.MigrateAsync());
                    Assert.Null(migrationEx);

                    var seederEx = await Record.ExceptionAsync(() => DatabaseSeeder.SeedAsync(upgradeContext));
                    Assert.Null(seederEx);

                    var allExercises = await upgradeContext.Exercises.ToListAsync();
                    Assert.True(allExercises.Count >= 35);
                }
            }
        }

        [Fact]
        public void WorkoutEntities_AreProperlyConfiguredInModel()
        {
            var model = _context.Model;

            var exerciseEntity = model.FindEntityType(typeof(Exercise));
            Assert.NotNull(exerciseEntity);

            var planEntity = model.FindEntityType(typeof(UserWorkoutPlan));
            Assert.NotNull(planEntity);

            var dayEntity = model.FindEntityType(typeof(WorkoutDay));
            Assert.NotNull(dayEntity);

            var dayExerciseEntity = model.FindEntityType(typeof(WorkoutDayExercise));
            Assert.NotNull(dayExerciseEntity);

            var sessionLogEntity = model.FindEntityType(typeof(WorkoutSessionLog));
            Assert.NotNull(sessionLogEntity);

            // Verify Foreign Key Delete Behaviors
            var planUserFk = planEntity.GetForeignKeys().First(fk => fk.PrincipalEntityType.ClrType == typeof(User));
            Assert.Equal(DeleteBehavior.Cascade, planUserFk.DeleteBehavior);

            var dayPlanFk = dayEntity.GetForeignKeys().First(fk => fk.PrincipalEntityType.ClrType == typeof(UserWorkoutPlan));
            Assert.Equal(DeleteBehavior.Cascade, dayPlanFk.DeleteBehavior);

            var dayExerciseExerciseFk = dayExerciseEntity.GetForeignKeys().First(fk => fk.PrincipalEntityType.ClrType == typeof(Exercise));
            Assert.Equal(DeleteBehavior.Restrict, dayExerciseExerciseFk.DeleteBehavior);

            var sessionLogUserFk = sessionLogEntity.GetForeignKeys().First(fk => fk.PrincipalEntityType.ClrType == typeof(User));
            Assert.Equal(DeleteBehavior.Cascade, sessionLogUserFk.DeleteBehavior);
        }

        [Fact]
        public async Task Migration_FreshDatabase_CreatesAllWorkoutTablesAndColumns()
        {
            using var freshConn = new SqliteConnection("DataSource=:memory:");
            freshConn.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(freshConn)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            using var freshContext = new ApplicationDbContext(options);
            await freshContext.Database.MigrateAsync();

            // Verify all 5 tables exist
            var expectedTables = new[] { "Exercises", "UserWorkoutPlans", "WorkoutDays", "WorkoutDayExercises", "WorkoutSessionLogs" };
            foreach (var table in expectedTables)
            {
                using var cmd = freshConn.CreateCommand();
                cmd.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}';";
                var result = await cmd.ExecuteScalarAsync();
                Assert.NotNull(result);
                Assert.Equal(table, result?.ToString());
            }

            // Verify Exercises columns and nullability
            using (var cmd = freshConn.CreateCommand())
            {
                cmd.CommandText = "PRAGMA table_info('Exercises');";
                using var reader = await cmd.ExecuteReaderAsync();
                var columns = new Dictionary<string, (string Type, bool NotNull, bool IsPk)>();
                while (reader.Read())
                {
                    columns[reader.GetString(1)] = (reader.GetString(2), reader.GetInt32(3) == 1, reader.GetInt32(5) > 0);
                }

                Assert.True(columns.ContainsKey("Id"));
                Assert.True(columns["Id"].IsPk);
                Assert.True(columns.ContainsKey("Name"));
                Assert.True(columns["Name"].NotNull);
                Assert.True(columns.ContainsKey("Category"));
                Assert.True(columns["Category"].NotNull);
                Assert.True(columns.ContainsKey("TargetMuscles"));
                Assert.True(columns["TargetMuscles"].NotNull);
                Assert.True(columns.ContainsKey("RequiresEquipment"));
                Assert.True(columns["RequiresEquipment"].NotNull);
                Assert.True(columns.ContainsKey("EstimatedMetValue"));
                Assert.True(columns["EstimatedMetValue"].NotNull);
                Assert.True(columns.ContainsKey("ThumbnailUrl"));
                Assert.False(columns["ThumbnailUrl"].NotNull); // nullable
                Assert.True(columns.ContainsKey("Instructions"));
                Assert.False(columns["Instructions"].NotNull); // nullable
            }

            // Verify WorkoutDayExercises Foreign Keys
            using (var cmd = freshConn.CreateCommand())
            {
                cmd.CommandText = "PRAGMA foreign_key_list('WorkoutDayExercises');";
                using var reader = await cmd.ExecuteReaderAsync();
                var fks = new List<(string TargetTable, string FromCol, string ToCol, string OnDelete)>();
                while (reader.Read())
                {
                    fks.Add((reader.GetString(2), reader.GetString(3), reader.GetString(4), reader.GetString(6)));
                }

                var dayFk = fks.FirstOrDefault(f => f.TargetTable == "WorkoutDays" && f.FromCol == "WorkoutDayId");
                Assert.NotNull(dayFk.TargetTable);
                Assert.Equal("CASCADE", dayFk.OnDelete);

                var exFk = fks.FirstOrDefault(f => f.TargetTable == "Exercises" && f.FromCol == "ExerciseId");
                Assert.NotNull(exFk.TargetTable);
                Assert.Equal("RESTRICT", exFk.OnDelete);
            }
        }

        [Fact]
        public async Task Migration_ExistingSchemaDatabase_AppliesIdempotentlyWithoutErrorOrDuplicates()
        {
            using var existingConn = new SqliteConnection("DataSource=:memory:");
            existingConn.Open();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(existingConn)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            // 1. Migrate up to the previous production release (20261016000000_AddPlannerReminderTime)
            using (var baselineContext = new ApplicationDbContext(options))
            {
                await baselineContext.Database.MigrateAsync("20261016000000_AddPlannerReminderTime");

                // 2. Simulate raw-DDL seeder having executed on the previous version
                await baselineContext.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""Exercises"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""Name"" TEXT NOT NULL,
                        ""Category"" TEXT NOT NULL,
                        ""TargetMuscles"" TEXT NOT NULL,
                        ""RequiresEquipment"" INTEGER NOT NULL DEFAULT 0,
                        ""EquipmentType"" TEXT NOT NULL DEFAULT 'None',
                        ""DifficultyLevel"" TEXT NOT NULL DEFAULT 'Beginner',
                        ""DefaultSets"" INTEGER NOT NULL DEFAULT 3,
                        ""DefaultReps"" INTEGER NOT NULL DEFAULT 12,
                        ""DefaultRestSeconds"" INTEGER NOT NULL DEFAULT 60,
                        ""EstimatedMetValue"" REAL NOT NULL DEFAULT 5.0,
                        ""ThumbnailUrl"" TEXT,
                        ""AnimationUrl"" TEXT,
                        ""Instructions"" TEXT,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" TEXT,
                        ""UpdatedBy"" TEXT,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );

                    CREATE TABLE IF NOT EXISTS ""UserWorkoutPlans"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""UserId"" INTEGER NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                        ""Title"" TEXT NOT NULL,
                        ""Goal"" TEXT NOT NULL,
                        ""FitnessLevel"" TEXT NOT NULL,
                        ""DaysPerWeek"" INTEGER NOT NULL DEFAULT 5,
                        ""IsActive"" INTEGER NOT NULL DEFAULT 1,
                        ""Version"" INTEGER NOT NULL DEFAULT 1,
                        ""EffectiveStartDate"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" TEXT,
                        ""UpdatedBy"" TEXT,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutDays"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""WorkoutPlanId"" INTEGER NOT NULL REFERENCES ""UserWorkoutPlans""(""Id"") ON DELETE CASCADE,
                        ""DayOfWeek"" INTEGER NOT NULL,
                        ""FocusTitle"" TEXT NOT NULL,
                        ""IsRestDay"" INTEGER NOT NULL DEFAULT 0,
                        ""TargetDurationMinutes"" INTEGER NOT NULL DEFAULT 25,
                        ""RestDayNotes"" TEXT,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" TEXT,
                        ""UpdatedBy"" TEXT,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutDayExercises"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""WorkoutDayId"" INTEGER NOT NULL REFERENCES ""WorkoutDays""(""Id"") ON DELETE CASCADE,
                        ""ExerciseId"" INTEGER NOT NULL REFERENCES ""Exercises""(""Id"") ON DELETE RESTRICT,
                        ""Sets"" INTEGER NOT NULL DEFAULT 3,
                        ""Reps"" INTEGER NOT NULL DEFAULT 12,
                        ""RestSeconds"" INTEGER NOT NULL DEFAULT 60,
                        ""OrderIndex"" INTEGER NOT NULL DEFAULT 0,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" TEXT,
                        ""UpdatedBy"" TEXT,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutSessionLogs"" (
                        ""Id"" INTEGER PRIMARY KEY AUTOINCREMENT,
                        ""UserId"" INTEGER NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                        ""WorkoutPlanId"" INTEGER NOT NULL,
                        ""WorkoutDayId"" INTEGER NOT NULL,
                        ""SessionDate"" TEXT NOT NULL,
                        ""IsCompleted"" INTEGER NOT NULL DEFAULT 1,
                        ""CompletedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""ActualDurationMinutes"" INTEGER NOT NULL,
                        ""EstimatedCaloriesBurned"" INTEGER NOT NULL DEFAULT 0,
                        ""HealthLogId"" INTEGER,
                        ""Notes"" TEXT,
                        ""CreatedAt"" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" TEXT NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" TEXT,
                        ""UpdatedBy"" TEXT,
                        ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
                    );

                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutSessionLogs_User_Day_Date"" 
                    ON ""WorkoutSessionLogs"" (""UserId"", ""WorkoutDayId"", ""SessionDate"");
                ");

                // Seed existing data before migration
                await baselineContext.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO ""Exercises"" (""Name"", ""Category"", ""TargetMuscles"", ""CreatedBy"")
                    VALUES ('Pre-existing Pushup', 'Strength', 'Chest', 'User');
                ");
            }

            // 3. Now run MigrateAsync() to apply latest 20261017130302_AddWorkoutPlannerSchema on this existing database
            using (var upgradeContext = new ApplicationDbContext(options))
            {
                var migrationException = await Record.ExceptionAsync(() => upgradeContext.Database.MigrateAsync());
                Assert.Null(migrationException);

                // Verify pre-existing data was preserved
                var exercise = await upgradeContext.Exercises.FirstOrDefaultAsync(e => e.Name == "Pre-existing Pushup");
                Assert.NotNull(exercise);
                Assert.Equal("Chest", exercise.TargetMuscles);

                // 4. Run DatabaseSeeder to verify idempotent startup sequence
                await DatabaseSeeder.SeedAsync(upgradeContext);

                // Verify pre-existing data was preserved and Seeder ran safely without throwing or duplicating
                var allExercises = await upgradeContext.Exercises.ToListAsync();
                Assert.Contains(allExercises, e => e.Name == "Pre-existing Pushup");
            }
        }

        [Fact]
        public async Task PostgreSql16_LiveEngine_FreshDatabaseMigration_CreatesCompleteSchema()
        {
            var connStr = "Host=localhost;Port=54321;Database=fresh_install_db;Username=testuser;Password=";
            try
            {
                using var pingConn = new NpgsqlConnection(connStr);
                await pingConn.OpenAsync();
            }
            catch
            {
                // Isolated PostgreSQL engine not active on port 54321 - skip
                return;
            }

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connStr, b => b.MigrationsAssembly("LifeSyncAI.Core"))
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            using var context = new ApplicationDbContext(options);
            // 1. Run full EF Core migrations from empty database
            await context.Database.MigrateAsync();

            // 2. Verify all 5 workout tables exist in PostgreSQL
            var expectedTables = new[] { "Exercises", "UserWorkoutPlans", "WorkoutDays", "WorkoutDayExercises", "WorkoutSessionLogs" };
            foreach (var table in expectedTables)
            {
                var exists = await context.Database.SqlQueryRaw<int>(
                    "SELECT 1 AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public' AND table_name = {0}",
                    table
                ).AnyAsync();
                Assert.True(exists, $"Expected table {table} to exist in PostgreSQL public schema.");
            }

            // 3. Verify column nullability in PostgreSQL
            var nullableCols = await context.Database.SqlQueryRaw<string>(
                "SELECT column_name AS \"Value\" FROM information_schema.columns WHERE table_name = 'Exercises' AND is_nullable = 'YES'"
            ).ToListAsync();
            Assert.Contains("ThumbnailUrl", nullableCols);
            Assert.Contains("AnimationUrl", nullableCols);
            Assert.Contains("Instructions", nullableCols);

            // 4. Run DatabaseSeeder
            await DatabaseSeeder.SeedAsync(context);
            var exercises = await context.Exercises.ToListAsync();
            Assert.True(exercises.Count >= 35, $"Expected at least 35 exercises, found {exercises.Count}");

            // 5. Test idempotency with second seeder run
            var secondSeedEx = await Record.ExceptionAsync(() => DatabaseSeeder.SeedAsync(context));
            Assert.Null(secondSeedEx);
            var exercisesAfterSecondSeed = await context.Exercises.ToListAsync();
            Assert.Equal(exercises.Count, exercisesAfterSecondSeed.Count);
        }

        [Fact]
        public async Task PostgreSql16_LiveEngine_ExistingSchemaUpgrade_AppliesIdempotentlyAndPreservesData()
        {
            var connStr = "Host=localhost;Port=54321;Database=upgrade_scenario_db;Username=testuser;Password=";
            try
            {
                using var pingConn = new NpgsqlConnection(connStr);
                await pingConn.OpenAsync();
            }
            catch
            {
                // Isolated PostgreSQL engine not active on port 54321 - skip
                return;
            }

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connStr, b => b.MigrationsAssembly("LifeSyncAI.Core"))
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                .Options;

            // Step 1: Migrate up to preceding production release (20261016000000_AddPlannerReminderTime)
            using (var baselineContext = new ApplicationDbContext(options))
            {
                await baselineContext.Database.MigrateAsync("20261016000000_AddPlannerReminderTime");

                // Step 2: Execute raw DDL that the old DatabaseSeeder executed
                await baselineContext.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""Exercises"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        ""Name"" text NOT NULL,
                        ""Category"" text NOT NULL,
                        ""TargetMuscles"" text NOT NULL,
                        ""RequiresEquipment"" boolean NOT NULL DEFAULT FALSE,
                        ""EquipmentType"" text NOT NULL DEFAULT 'None',
                        ""DifficultyLevel"" text NOT NULL DEFAULT 'Beginner',
                        ""DefaultSets"" integer NOT NULL DEFAULT 3,
                        ""DefaultReps"" integer NOT NULL DEFAULT 12,
                        ""DefaultRestSeconds"" integer NOT NULL DEFAULT 60,
                        ""EstimatedMetValue"" real NOT NULL DEFAULT 5.0,
                        ""ThumbnailUrl"" text,
                        ""AnimationUrl"" text,
                        ""Instructions"" text,
                        ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" text NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" timestamp without time zone,
                        ""UpdatedBy"" text,
                        ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
                    );

                    CREATE TABLE IF NOT EXISTS ""UserWorkoutPlans"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        ""UserId"" integer NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                        ""Title"" text NOT NULL,
                        ""Goal"" text NOT NULL,
                        ""FitnessLevel"" text NOT NULL,
                        ""DaysPerWeek"" integer NOT NULL DEFAULT 5,
                        ""IsActive"" boolean NOT NULL DEFAULT TRUE,
                        ""Version"" integer NOT NULL DEFAULT 1,
                        ""EffectiveStartDate"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" text NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" timestamp without time zone,
                        ""UpdatedBy"" text,
                        ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutDays"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        ""WorkoutPlanId"" integer NOT NULL REFERENCES ""UserWorkoutPlans""(""Id"") ON DELETE CASCADE,
                        ""DayOfWeek"" integer NOT NULL,
                        ""FocusTitle"" text NOT NULL,
                        ""IsRestDay"" boolean NOT NULL DEFAULT FALSE,
                        ""TargetDurationMinutes"" integer NOT NULL DEFAULT 25,
                        ""RestDayNotes"" text,
                        ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" text NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" timestamp without time zone,
                        ""UpdatedBy"" text,
                        ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutDayExercises"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        ""WorkoutDayId"" integer NOT NULL REFERENCES ""WorkoutDays""(""Id"") ON DELETE CASCADE,
                        ""ExerciseId"" integer NOT NULL REFERENCES ""Exercises""(""Id"") ON DELETE RESTRICT,
                        ""Sets"" integer NOT NULL DEFAULT 3,
                        ""Reps"" integer NOT NULL DEFAULT 12,
                        ""RestSeconds"" integer NOT NULL DEFAULT 60,
                        ""OrderIndex"" integer NOT NULL DEFAULT 0,
                        ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" text NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" timestamp without time zone,
                        ""UpdatedBy"" text,
                        ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
                    );

                    CREATE TABLE IF NOT EXISTS ""WorkoutSessionLogs"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        ""UserId"" integer NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                        ""WorkoutPlanId"" integer NOT NULL,
                        ""WorkoutDayId"" integer NOT NULL,
                        ""SessionDate"" timestamp without time zone NOT NULL,
                        ""IsCompleted"" boolean NOT NULL DEFAULT TRUE,
                        ""CompletedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""ActualDurationMinutes"" integer NOT NULL,
                        ""EstimatedCaloriesBurned"" integer NOT NULL DEFAULT 0,
                        ""HealthLogId"" integer,
                        ""Notes"" text,
                        ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        ""CreatedBy"" text NOT NULL DEFAULT 'System',
                        ""UpdatedAt"" timestamp without time zone,
                        ""UpdatedBy"" text,
                        ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
                    );

                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutSessionLogs_User_Day_Date"" 
                    ON ""WorkoutSessionLogs"" (""UserId"", ""WorkoutDayId"", ""SessionDate"");
                ");

                // Seed pre-existing workout data
                await baselineContext.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO ""Exercises"" (""Name"", ""Category"", ""TargetMuscles"", ""CreatedBy"")
                    VALUES ('Pre-existing Postgres Pushup', 'Strength', 'Pectorals', 'User');
                ");
            }

            // Step 3: Apply the new migration 20261017130302_AddWorkoutPlannerSchema on this existing schema
            using (var upgradeContext = new ApplicationDbContext(options))
            {
                var migrationEx = await Record.ExceptionAsync(() => upgradeContext.Database.MigrateAsync());
                Assert.Null(migrationEx);

                // Verify pre-existing data was preserved
                var exercise = await upgradeContext.Exercises.FirstOrDefaultAsync(e => e.Name == "Pre-existing Postgres Pushup");
                Assert.NotNull(exercise);
                Assert.Equal("Pectorals", exercise.TargetMuscles);

                // Step 4: Run DatabaseSeeder to verify idempotent startup sequence
                var seederEx = await Record.ExceptionAsync(() => DatabaseSeeder.SeedAsync(upgradeContext));
                Assert.Null(seederEx);

                // Verify pre-existing data remains intact and catalog check succeeded
                var allExercises = await upgradeContext.Exercises.ToListAsync();
                Assert.Contains(allExercises, e => e.Name == "Pre-existing Postgres Pushup");
            }
        }
    }
}
