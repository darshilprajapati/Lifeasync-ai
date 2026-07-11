-- =========================================================================
-- LIFESYNC AI MODULES TABLES AND STORED PROCEDURES INITIALIZATION SCRIPT
-- =========================================================================

-- 1. PlannerEvents Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlannerEvents]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PlannerEvents] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Title] NVARCHAR(250) NOT NULL,
        [Description] NVARCHAR(1000) NULL,
        [StartTime] DATETIME NOT NULL,
        [EndTime] DATETIME NOT NULL,
        [IsCompleted] BIT NOT NULL DEFAULT 0,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_PlannerEvents_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 2. Transactions Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Transactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Transactions] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Description] NVARCHAR(250) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Type] NVARCHAR(50) NOT NULL, -- 'Income' or 'Expense'
        [Date] DATETIME NOT NULL,
        [Category] NVARCHAR(100) NOT NULL,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_Transactions_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 3. HealthLogs Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HealthLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[HealthLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [LogType] NVARCHAR(50) NOT NULL, -- 'Water' or 'Workout'
        [LogValue] REAL NOT NULL,        -- Milliliters of water, or minutes of workout
        [Details] NVARCHAR(500) NULL,
        [LogDate] DATETIME NOT NULL,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_HealthLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 4. JobApplications Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[JobApplications]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[JobApplications] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Company] NVARCHAR(200) NOT NULL,
        [Position] NVARCHAR(200) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL, -- 'Applied', 'Interviewing', 'Offered', 'Rejected'
        [AppliedDate] DATETIME NOT NULL,
        [Notes] NVARCHAR(1000) NULL,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_JobApplications_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 5. VaultItems Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VaultItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[VaultItems] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Title] NVARCHAR(200) NOT NULL,
        [EncryptedContent] NVARCHAR(MAX) NOT NULL,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_VaultItems_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 6. AiRecommendations Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AiRecommendations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AiRecommendations] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [InsightText] NVARCHAR(MAX) NOT NULL,
        [Category] NVARCHAR(100) NOT NULL,
        [CreatedAt] DATETIME NOT NULL,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_AiRecommendations_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 7. RecurringItems Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RecurringItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RecurringItems] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Description] NVARCHAR(250) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Type] NVARCHAR(50) NOT NULL, -- 'Loan', 'EMI', 'Bill'
        [Frequency] NVARCHAR(50) NOT NULL, -- 'Monthly', 'Yearly'
        [DueDate] DATETIME NOT NULL,
        [IsPaid] BIT NOT NULL DEFAULT 0,
        [UserId] INT NOT NULL,
        CONSTRAINT [FK_RecurringItems_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
    );
END
GO

-- Column Upgrade: ProfilePhoto on Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ProfilePhoto')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [ProfilePhoto] NVARCHAR(MAX) NULL;
END
GO


-- =========================================================================
-- STORED PROCEDURES DEFINITIONS
-- =========================================================================

-- Planner Stored Procedures
IF OBJECT_ID('dbo.sp_GetPlannerEvents', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetPlannerEvents;
GO
CREATE PROCEDURE dbo.sp_GetPlannerEvents
    @UserId INT
AS
BEGIN
    SELECT Id, Title, Description, StartTime, EndTime, IsCompleted, UserId
    FROM dbo.PlannerEvents
    WHERE UserId = @UserId
    ORDER BY StartTime ASC;
END
GO

IF OBJECT_ID('dbo.sp_CreatePlannerEvent', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreatePlannerEvent;
GO
CREATE PROCEDURE dbo.sp_CreatePlannerEvent
    @Title NVARCHAR(250),
    @Description NVARCHAR(1000),
    @StartTime DATETIME,
    @EndTime DATETIME,
    @IsCompleted BIT,
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.PlannerEvents (Title, Description, StartTime, EndTime, IsCompleted, UserId)
    VALUES (@Title, @Description, @StartTime, @EndTime, @IsCompleted, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

IF OBJECT_ID('dbo.sp_TogglePlannerEvent', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TogglePlannerEvent;
GO
CREATE PROCEDURE dbo.sp_TogglePlannerEvent
    @Id INT,
    @IsCompleted BIT
AS
BEGIN
    UPDATE dbo.PlannerEvents
    SET IsCompleted = @IsCompleted
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('dbo.sp_DeletePlannerEvent', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeletePlannerEvent;
GO
CREATE PROCEDURE dbo.sp_DeletePlannerEvent
    @Id INT
AS
BEGIN
    DELETE FROM dbo.PlannerEvents WHERE Id = @Id;
END
GO


-- Finance Stored Procedures
IF OBJECT_ID('dbo.sp_GetTransactions', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetTransactions;
GO
CREATE PROCEDURE dbo.sp_GetTransactions
    @UserId INT
AS
BEGIN
    SELECT Id, Description, Amount, Type, Date, Category, UserId
    FROM dbo.Transactions
    WHERE UserId = @UserId
    ORDER BY Date DESC;
END
GO

IF OBJECT_ID('dbo.sp_CreateTransaction', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateTransaction;
GO
CREATE PROCEDURE dbo.sp_CreateTransaction
    @Description NVARCHAR(250),
    @Amount DECIMAL(18,2),
    @Type NVARCHAR(50),
    @Date DATETIME,
    @Category NVARCHAR(100),
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.Transactions (Description, Amount, Type, Date, Category, UserId)
    VALUES (@Description, @Amount, @Type, @Date, @Category, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

IF OBJECT_ID('dbo.sp_DeleteTransaction', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteTransaction;
GO
CREATE PROCEDURE dbo.sp_DeleteTransaction
    @Id INT
AS
BEGIN
    DELETE FROM dbo.Transactions WHERE Id = @Id;
END
GO

IF OBJECT_ID('dbo.sp_GetFinanceSummary', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetFinanceSummary;
GO
CREATE PROCEDURE dbo.sp_GetFinanceSummary
    @UserId INT
AS
BEGIN
    DECLARE @TotalIncome DECIMAL(18,2) = ISNULL((SELECT SUM(Amount) FROM dbo.Transactions WHERE UserId = @UserId AND Type = 'Income'), 0);
    DECLARE @TotalExpense DECIMAL(18,2) = ISNULL((SELECT SUM(Amount) FROM dbo.Transactions WHERE UserId = @UserId AND Type = 'Expense'), 0);
    DECLARE @Balance DECIMAL(18,2) = @TotalIncome - @TotalExpense;

    SELECT @TotalIncome AS TotalIncome, @TotalExpense AS TotalExpense, @Balance AS Balance;
END
GO


-- Health Stored Procedures
IF OBJECT_ID('dbo.sp_GetHealthLogs', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetHealthLogs;
GO
CREATE PROCEDURE dbo.sp_GetHealthLogs
    @UserId INT
AS
BEGIN
    SELECT Id, LogType, LogValue, Details, LogDate, UserId
    FROM dbo.HealthLogs
    WHERE UserId = @UserId
    ORDER BY LogDate DESC;
END
GO

IF OBJECT_ID('dbo.sp_CreateHealthLog', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateHealthLog;
GO
CREATE PROCEDURE dbo.sp_CreateHealthLog
    @LogType NVARCHAR(50),
    @LogValue REAL,
    @Details NVARCHAR(500),
    @LogDate DATETIME,
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.HealthLogs (LogType, LogValue, Details, LogDate, UserId)
    VALUES (@LogType, @LogValue, @Details, @LogDate, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

IF OBJECT_ID('dbo.sp_DeleteHealthLog', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteHealthLog;
GO
CREATE PROCEDURE dbo.sp_DeleteHealthLog
    @Id INT
AS
BEGIN
    DELETE FROM dbo.HealthLogs WHERE Id = @Id;
END
GO


-- Career Stored Procedures
IF OBJECT_ID('dbo.sp_GetJobApplications', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetJobApplications;
GO
CREATE PROCEDURE dbo.sp_GetJobApplications
    @UserId INT
AS
BEGIN
    SELECT Id, Company, Position, Status, AppliedDate, Notes, UserId
    FROM dbo.JobApplications
    WHERE UserId = @UserId
    ORDER BY AppliedDate DESC;
END
GO

IF OBJECT_ID('dbo.sp_CreateJobApplication', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateJobApplication;
GO
CREATE PROCEDURE dbo.sp_CreateJobApplication
    @Company NVARCHAR(200),
    @Position NVARCHAR(200),
    @Status NVARCHAR(50),
    @AppliedDate DATETIME,
    @Notes NVARCHAR(1000),
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.JobApplications (Company, Position, Status, AppliedDate, Notes, UserId)
    VALUES (@Company, @Position, @Status, @AppliedDate, @Notes, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

IF OBJECT_ID('dbo.sp_UpdateJobApplicationStatus', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_UpdateJobApplicationStatus;
GO
CREATE PROCEDURE dbo.sp_UpdateJobApplicationStatus
    @Id INT,
    @Status NVARCHAR(50)
AS
BEGIN
    UPDATE dbo.JobApplications
    SET Status = @Status
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('dbo.sp_DeleteJobApplication', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteJobApplication;
GO
CREATE PROCEDURE dbo.sp_DeleteJobApplication
    @Id INT
AS
BEGIN
    DELETE FROM dbo.JobApplications WHERE Id = @Id;
END
GO


-- Vault Stored Procedures
IF OBJECT_ID('dbo.sp_GetVaultItems', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetVaultItems;
GO
CREATE PROCEDURE dbo.sp_GetVaultItems
    @UserId INT
AS
BEGIN
    SELECT Id, Title, EncryptedContent, UserId
    FROM dbo.VaultItems
    WHERE UserId = @UserId;
END
GO

IF OBJECT_ID('dbo.sp_CreateVaultItem', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateVaultItem;
GO
CREATE PROCEDURE dbo.sp_CreateVaultItem
    @Title NVARCHAR(200),
    @EncryptedContent NVARCHAR(MAX),
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.VaultItems (Title, EncryptedContent, UserId)
    VALUES (@Title, @EncryptedContent, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO

IF OBJECT_ID('dbo.sp_DeleteVaultItem', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_DeleteVaultItem;
GO
CREATE PROCEDURE dbo.sp_DeleteVaultItem
    @Id INT
AS
BEGIN
    DELETE FROM dbo.VaultItems WHERE Id = @Id;
END
GO


-- AI Insights Stored Procedures
IF OBJECT_ID('dbo.sp_GetAiRecommendations', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetAiRecommendations;
GO
CREATE PROCEDURE dbo.sp_GetAiRecommendations
    @UserId INT
AS
BEGIN
    SELECT Id, InsightText, Category, CreatedAt, UserId
    FROM dbo.AiRecommendations
    WHERE UserId = @UserId
    ORDER BY CreatedAt DESC;
END
GO

IF OBJECT_ID('dbo.sp_CreateAiRecommendation', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CreateAiRecommendation;
GO
CREATE PROCEDURE dbo.sp_CreateAiRecommendation
    @InsightText NVARCHAR(MAX),
    @Category NVARCHAR(100),
    @CreatedAt DATETIME,
    @UserId INT
AS
BEGIN
    INSERT INTO dbo.AiRecommendations (InsightText, Category, CreatedAt, UserId)
    VALUES (@InsightText, @Category, @CreatedAt, @UserId);
    
    SELECT SCOPE_IDENTITY() AS NewId;
END
GO
