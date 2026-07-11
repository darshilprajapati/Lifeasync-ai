using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Database
{
    /// <summary>
    /// Entity Framework Database Context for LifeSync AI.
    /// Manages entities and implements automated audit tracking and soft delete query filtering.
    /// </summary>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<PlannerEvent> PlannerEvents { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<HealthLog> HealthLogs { get; set; }
        public DbSet<JobApplication> JobApplications { get; set; }
        public DbSet<VaultItem> VaultItems { get; set; }
        public DbSet<AiRecommendation> AiRecommendations { get; set; }
        public DbSet<RecurringItem> RecurringItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure soft-delete query filter on all BaseEntity models
            modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);

            // Unique index on Email for quick lookup and data integrity
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Configure decimal precision for Transaction Amount
            modelBuilder.Entity<Transaction>()
                .Property(t => t.Amount)
                .HasPrecision(18, 2);

            // Configure decimal precision for RecurringItem Amount
            modelBuilder.Entity<RecurringItem>()
                .Property(r => r.Amount)
                .HasPrecision(18, 2);

            // Configure decimal precision for FinanceDbSummary (used in SQL queries)
            modelBuilder.Entity<LifeSyncAI.Core.DTO.Output.Finance.FinanceDbSummary>(entity =>
            {
                entity.HasNoKey();
                entity.Property(e => e.Balance).HasPrecision(18, 2);
                entity.Property(e => e.TotalExpense).HasPrecision(18, 2);
                entity.Property(e => e.TotalIncome).HasPrecision(18, 2);
            });
        }

        public override int SaveChanges()
        {
            ApplyAuditInfo();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplyAuditInfo();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void ApplyAuditInfo()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is BaseEntity && (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (BaseEntity)entry.Entity;

                if (entry.State == EntityState.Added)
                {
                    entity.CreatedAt = DateTime.UtcNow;
                    entity.IsDeleted = false;
                    // In a real application, you'd inject an ICurrentUserService to get the current username
                    entity.CreatedBy ??= "System"; 
                }
                else if (entry.State == EntityState.Modified)
                {
                    entity.UpdatedAt = DateTime.UtcNow;
                    entity.UpdatedBy = "System"; // Placeholder until auth context is wired
                }
            }
        }
    }
}
