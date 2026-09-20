using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace LifeSyncAI.Core.Database
{
    /// <summary>
    /// Seeds initial database records safely without dropping or resetting production data.
    /// Supports PostgreSQL (Neon), SQLite, and SQL Server.
    /// First registered user automatically becomes System Administrator via AuthenticationService.
    /// </summary>
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Ensure Schema exists idempotently via EF Core Migrations for PostgreSQL
            await EnsureSchemaAsync(context);
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
    }
}

