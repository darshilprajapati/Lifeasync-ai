using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LifeSyncAI.Core.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutPlannerSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql(@"
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

                    CREATE INDEX IF NOT EXISTS ""IX_UserWorkoutPlans_UserId"" ON ""UserWorkoutPlans"" (""UserId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDayExercises_ExerciseId"" ON ""WorkoutDayExercises"" (""ExerciseId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDayExercises_WorkoutDayId"" ON ""WorkoutDayExercises"" (""WorkoutDayId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDays_WorkoutPlanId"" ON ""WorkoutDays"" (""WorkoutPlanId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutSessionLogs_UserId_WorkoutDayId_SessionDate"" ON ""WorkoutSessionLogs"" (""UserId"", ""WorkoutDayId"", ""SessionDate"");
                ");
            }
            else if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                migrationBuilder.Sql(@"
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Exercises')
                    CREATE TABLE [Exercises] (
                        [Id] int IDENTITY(1,1) PRIMARY KEY,
                        [Name] nvarchar(max) NOT NULL,
                        [Category] nvarchar(max) NOT NULL,
                        [TargetMuscles] nvarchar(max) NOT NULL,
                        [RequiresEquipment] bit NOT NULL DEFAULT 0,
                        [EquipmentType] nvarchar(max) NOT NULL DEFAULT 'None',
                        [DifficultyLevel] nvarchar(max) NOT NULL DEFAULT 'Beginner',
                        [DefaultSets] int NOT NULL DEFAULT 3,
                        [DefaultReps] int NOT NULL DEFAULT 12,
                        [DefaultRestSeconds] int NOT NULL DEFAULT 60,
                        [EstimatedMetValue] real NOT NULL DEFAULT 5.0,
                        [ThumbnailUrl] nvarchar(max) NULL,
                        [AnimationUrl] nvarchar(max) NULL,
                        [Instructions] nvarchar(max) NULL,
                        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NOT NULL DEFAULT 'System',
                        [UpdatedAt] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0
                    );

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserWorkoutPlans')
                    CREATE TABLE [UserWorkoutPlans] (
                        [Id] int IDENTITY(1,1) PRIMARY KEY,
                        [UserId] int NOT NULL FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE CASCADE,
                        [Title] nvarchar(max) NOT NULL,
                        [Goal] nvarchar(max) NOT NULL,
                        [FitnessLevel] nvarchar(max) NOT NULL,
                        [DaysPerWeek] int NOT NULL DEFAULT 5,
                        [IsActive] bit NOT NULL DEFAULT 1,
                        [Version] int NOT NULL DEFAULT 1,
                        [EffectiveStartDate] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NOT NULL DEFAULT 'System',
                        [UpdatedAt] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0
                    );

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkoutDays')
                    CREATE TABLE [WorkoutDays] (
                        [Id] int IDENTITY(1,1) PRIMARY KEY,
                        [WorkoutPlanId] int NOT NULL FOREIGN KEY REFERENCES [UserWorkoutPlans]([Id]) ON DELETE CASCADE,
                        [DayOfWeek] int NOT NULL,
                        [FocusTitle] nvarchar(max) NOT NULL,
                        [IsRestDay] bit NOT NULL DEFAULT 0,
                        [TargetDurationMinutes] int NOT NULL DEFAULT 25,
                        [RestDayNotes] nvarchar(max) NULL,
                        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NOT NULL DEFAULT 'System',
                        [UpdatedAt] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0
                    );

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkoutDayExercises')
                    CREATE TABLE [WorkoutDayExercises] (
                        [Id] int IDENTITY(1,1) PRIMARY KEY,
                        [WorkoutDayId] int NOT NULL FOREIGN KEY REFERENCES [WorkoutDays]([Id]) ON DELETE CASCADE,
                        [ExerciseId] int NOT NULL FOREIGN KEY REFERENCES [Exercises]([Id]),
                        [Sets] int NOT NULL DEFAULT 3,
                        [Reps] int NOT NULL DEFAULT 12,
                        [RestSeconds] int NOT NULL DEFAULT 60,
                        [OrderIndex] int NOT NULL DEFAULT 0,
                        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NOT NULL DEFAULT 'System',
                        [UpdatedAt] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0
                    );

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkoutSessionLogs')
                    CREATE TABLE [WorkoutSessionLogs] (
                        [Id] int IDENTITY(1,1) PRIMARY KEY,
                        [UserId] int NOT NULL FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE CASCADE,
                        [WorkoutPlanId] int NOT NULL,
                        [WorkoutDayId] int NOT NULL,
                        [SessionDate] datetime2 NOT NULL,
                        [IsCompleted] bit NOT NULL DEFAULT 1,
                        [CompletedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [ActualDurationMinutes] int NOT NULL,
                        [EstimatedCaloriesBurned] int NOT NULL DEFAULT 0,
                        [HealthLogId] int NULL,
                        [Notes] nvarchar(max) NULL,
                        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                        [CreatedBy] nvarchar(max) NOT NULL DEFAULT 'System',
                        [UpdatedAt] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0
                    );

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserWorkoutPlans_UserId' AND object_id = OBJECT_ID('UserWorkoutPlans'))
                        CREATE INDEX [IX_UserWorkoutPlans_UserId] ON [UserWorkoutPlans] ([UserId]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkoutDayExercises_ExerciseId' AND object_id = OBJECT_ID('WorkoutDayExercises'))
                        CREATE INDEX [IX_WorkoutDayExercises_ExerciseId] ON [WorkoutDayExercises] ([ExerciseId]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkoutDayExercises_WorkoutDayId' AND object_id = OBJECT_ID('WorkoutDayExercises'))
                        CREATE INDEX [IX_WorkoutDayExercises_WorkoutDayId] ON [WorkoutDayExercises] ([WorkoutDayId]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkoutDays_WorkoutPlanId' AND object_id = OBJECT_ID('WorkoutDays'))
                        CREATE INDEX [IX_WorkoutDays_WorkoutPlanId] ON [WorkoutDays] ([WorkoutPlanId]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkoutSessionLogs_UserId_WorkoutDayId_SessionDate' AND object_id = OBJECT_ID('WorkoutSessionLogs'))
                        CREATE INDEX [IX_WorkoutSessionLogs_UserId_WorkoutDayId_SessionDate] ON [WorkoutSessionLogs] ([UserId], [WorkoutDayId], [SessionDate]);
                ");
            }
            else
            {
                migrationBuilder.Sql(@"
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Exercises') THEN
                            CREATE TABLE ""Exercises"" (
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
                        END IF;

                        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'UserWorkoutPlans') THEN
                            CREATE TABLE ""UserWorkoutPlans"" (
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
                        END IF;

                        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'WorkoutDays') THEN
                            CREATE TABLE ""WorkoutDays"" (
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
                        END IF;

                        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'WorkoutDayExercises') THEN
                            CREATE TABLE ""WorkoutDayExercises"" (
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
                        END IF;

                        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'WorkoutSessionLogs') THEN
                            CREATE TABLE ""WorkoutSessionLogs"" (
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
                        END IF;
                    END $$;

                    CREATE INDEX IF NOT EXISTS ""IX_UserWorkoutPlans_UserId"" ON ""UserWorkoutPlans"" (""UserId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDayExercises_ExerciseId"" ON ""WorkoutDayExercises"" (""ExerciseId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDayExercises_WorkoutDayId"" ON ""WorkoutDayExercises"" (""WorkoutDayId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutDays_WorkoutPlanId"" ON ""WorkoutDays"" (""WorkoutPlanId"");
                    CREATE INDEX IF NOT EXISTS ""IX_WorkoutSessionLogs_UserId_WorkoutDayId_SessionDate"" ON ""WorkoutSessionLogs"" (""UserId"", ""WorkoutDayId"", ""SessionDate"");
                ");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkoutDayExercises");

            migrationBuilder.DropTable(
                name: "WorkoutSessionLogs");

            migrationBuilder.DropTable(
                name: "Exercises");

            migrationBuilder.DropTable(
                name: "WorkoutDays");

            migrationBuilder.DropTable(
                name: "UserWorkoutPlans");
        }
    }
}
