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
        public DbSet<UserNotificationLog> UserNotificationLogs { get; set; }
        public DbSet<Exercise> Exercises { get; set; }
        public DbSet<UserWorkoutPlan> UserWorkoutPlans { get; set; }
        public DbSet<WorkoutDay> WorkoutDays { get; set; }
        public DbSet<WorkoutDayExercise> WorkoutDayExercises { get; set; }
        public DbSet<WorkoutSessionLog> WorkoutSessionLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure soft-delete query filter on all BaseEntity models
            modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
            modelBuilder.Entity<Exercise>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserWorkoutPlan>().HasQueryFilter(p => !p.IsDeleted);
            modelBuilder.Entity<WorkoutDay>().HasQueryFilter(d => !d.IsDeleted);
            modelBuilder.Entity<WorkoutDayExercise>().HasQueryFilter(de => !de.IsDeleted);
            modelBuilder.Entity<WorkoutSessionLog>().HasQueryFilter(s => !s.IsDeleted);

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

            // Configure Foreign Key relationships with cascade delete
            modelBuilder.Entity<PlannerEvent>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Transaction>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<HealthLog>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<JobApplication>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<VaultItem>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AiRecommendation>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RecurringItem>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserNotificationLog>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            var userNotifIndex = modelBuilder.Entity<UserNotificationLog>()
                .HasIndex(n => new { n.UserId, n.NotificationType, n.ReferenceId })
                .IsUnique();

            string provider = Database.ProviderName ?? string.Empty;
            if (provider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                userNotifIndex.HasFilter("[IsSuccess] = 1");
            }
            else if (provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                userNotifIndex.HasFilter("\"IsSuccess\" = 1");
            }
            else
            {
                // Default to PostgreSQL syntax
                userNotifIndex.HasFilter("\"IsSuccess\" = true");
            }

            // Workout entity relationships
            modelBuilder.Entity<UserWorkoutPlan>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkoutDay>()
                .HasOne<UserWorkoutPlan>()
                .WithMany(p => p.Days)
                .HasForeignKey(d => d.WorkoutPlanId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkoutDayExercise>()
                .HasOne<WorkoutDay>()
                .WithMany(d => d.Exercises)
                .HasForeignKey(de => de.WorkoutDayId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkoutDayExercise>()
                .HasOne(de => de.Exercise)
                .WithMany()
                .HasForeignKey(de => de.ExerciseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WorkoutSessionLog>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkoutSessionLog>()
                .HasIndex(s => new { s.UserId, s.WorkoutDayId, s.SessionDate });
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
