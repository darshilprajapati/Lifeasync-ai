using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Enums;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Database
{
    /// <summary>
    /// Seeds initial database records safely without dropping or resetting production data.
    /// Supports PostgreSQL (Neon), SQLite, and SQL Server.
    /// </summary>
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // 1. Ensure Schema exists idempotently via EF Core Migrations for PostgreSQL
            await EnsureSchemaAsync(context);

            // 2. Ensure an Administrator account exists safely from ADMIN_EMAIL / ADMIN_PASSWORD without overwriting existing accounts
            await EnsureAdminUserAsync(context);
        }

        private static async Task EnsureSchemaAsync(ApplicationDbContext context)
        {
            string provider = context.Database.ProviderName ?? string.Empty;

            if (provider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ||
                provider.Contains("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                // Production Neon uses EF Core migrations (Never EnsureCreated())
                await context.Database.MigrateAsync();
            }
            else
            {
                // For SQLite and SQL Server environments, verify connectivity and table existence safely
                bool canConnect = await context.Database.CanConnectAsync();
                if (canConnect)
                {
                    try
                    {
                        await context.Users.AnyAsync();
                    }
                    catch
                    {
                        await context.Database.EnsureCreatedAsync();
                    }
                }
                else
                {
                    await context.Database.EnsureCreatedAsync();
                }
            }
        }

        private static async Task EnsureAdminUserAsync(ApplicationDbContext context)
        {
            // Check if ANY Admin user exists in the database
            bool adminExists = await context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Role == UserRole.Admin);

            if (adminExists)
            {
                // An admin is already present; do not modify or overwrite
                return;
            }

            // Read secure credentials from backend-only environment variables
            string? adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
            string? adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");

            // Never seed hardcoded admin credentials; only seed if explicitly configured via environment
            if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
            {
                return;
            }

            // Check if user already exists with this email
            var existingUser = await context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == adminEmail);

            if (existingUser != null)
            {
                if (existingUser.Role != UserRole.Admin)
                {
                    existingUser.Role = UserRole.Admin;
                    await context.SaveChangesAsync();
                }
                return;
            }

            var newAdmin = new User
            {
                FullName = "System Admin",
                Email = adminEmail,
                PasswordHash = PasswordHasher.HashPassword(adminPassword),
                Role = UserRole.Admin,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "SystemBootstrap"
            };

            await context.Users.AddAsync(newAdmin);
            await context.SaveChangesAsync();
        }
    }
}
