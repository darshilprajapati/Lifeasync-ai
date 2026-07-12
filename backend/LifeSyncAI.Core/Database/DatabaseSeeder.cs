using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Database
{
    /// <summary>
    /// Seeds initial database records, including the default Administrator account.
    /// </summary>
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Self-healing bootstrap: Ensure database is created and has correct schema
            bool databaseExists = await context.Database.CanConnectAsync();
            if (databaseExists)
            {
                try
                {
                    // Check if Users table exists by running a simple query
                    await context.Users.AnyAsync();
                }
                catch
                {
                    // Table doesn't exist (e.g. invalid object name 'Users'). Force drop and recreate database.
                    await context.Database.EnsureDeletedAsync();
                    await context.Database.EnsureCreatedAsync();
                }
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
            }



            // Check if default Admin already exists
            const string adminEmail = "gdarshil1203@gmail.com";
            var adminUser = await context.Users
                .IgnoreQueryFilters() // In case it was soft-deleted, we check all
                .FirstOrDefaultAsync(u => u.Email == adminEmail);

            if (adminUser == null)
            {
                var newAdmin = new User
                {
                    FullName = "System Admin",
                    Email = adminEmail,
                    PasswordHash = PasswordHasher.HashPassword("Darshil@07"),
                    Role = UserRole.Admin,
                    Status = UserStatus.Active, // Seeding active admin
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "SystemSeeder"
                };

                await context.Users.AddAsync(newAdmin);
                await context.SaveChangesAsync();
            }
        }

        private static async Task InitializeModulesSqlAsync(ApplicationDbContext context)
        {
            try
            {
                var baseDir = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") ?? AppDomain.CurrentDomain.BaseDirectory;
                string sqlFilePath = "";

                // 1. Check publish output recursively for the file
                try
                {
                    var files = System.IO.Directory.GetFiles(baseDir, "init_modules.sql", System.IO.SearchOption.AllDirectories);
                    if (files.Length > 0)
                    {
                        sqlFilePath = files[0];
                    }
                }
                catch
                {
                    // Ignore search errors and fallback
                }

                // 2. Fallback to walking up the directory tree
                if (string.IsNullOrEmpty(sqlFilePath))
                {
                    var currentDir = new System.IO.DirectoryInfo(baseDir);
                    while (currentDir != null)
                    {
                        var testPath1 = System.IO.Path.Combine(currentDir.FullName, "backend", "LifeSyncAI.Core", "Database", "init_modules.sql");
                        var testPath2 = System.IO.Path.Combine(currentDir.FullName, "LifeSyncAI.Core", "Database", "init_modules.sql");
                        var testPath3 = System.IO.Path.Combine(currentDir.FullName, "Database", "init_modules.sql");

                        if (System.IO.File.Exists(testPath1)) { sqlFilePath = testPath1; break; }
                        if (System.IO.File.Exists(testPath2)) { sqlFilePath = testPath2; break; }
                        if (System.IO.File.Exists(testPath3)) { sqlFilePath = testPath3; break; }

                        currentDir = currentDir.Parent;
                    }
                }

                if (string.IsNullOrEmpty(sqlFilePath) || !System.IO.File.Exists(sqlFilePath))
                {
                    throw new System.IO.FileNotFoundException("Could not find init_modules.sql database script in solution directory structure.");
                }

                var sql = await System.IO.File.ReadAllTextAsync(sqlFilePath);
                
                // Split SQL script by GO statement batches (case insensitive with boundaries)
                var batches = System.Text.RegularExpressions.Regex.Split(
                    sql,
                    @"^\s*GO\s*$",
                    System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );

                foreach (var batch in batches)
                {
                    var cleanedBatch = batch.Trim();
                    if (!string.IsNullOrWhiteSpace(cleanedBatch))
                    {
                        await context.Database.ExecuteSqlRawAsync(cleanedBatch);
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to run modules SQL schema/procedures setup script: {ex.Message}", ex);
            }
        }
    }
}
