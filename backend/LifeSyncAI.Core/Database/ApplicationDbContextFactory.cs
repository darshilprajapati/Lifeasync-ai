using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LifeSyncAI.Core.Database
{
    /// <summary>
    /// Design-time DbContext factory for generating Entity Framework Core migrations targeting PostgreSQL (Npgsql).
    /// </summary>
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();

            // Retrieve connection string from environment if set, or use a valid PostgreSQL dummy string for design-time model creation
            string connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                                      ?? "Host=localhost;Database=lifesync_design;Username=postgres;Password=postgres";

            optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.GetName().Name);
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
            });

            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}
