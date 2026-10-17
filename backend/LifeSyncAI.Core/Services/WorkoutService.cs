using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class WorkoutService : IWorkoutService
    {
        private readonly ApplicationDbContext _context;

        public WorkoutService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<ExerciseDto>>> GetExercisesAsync(
            bool? requiresEquipment = null, 
            string? category = null, 
            string? search = null, 
            List<string>? equipmentList = null)
        {
            try
            {
                var query = _context.Exercises.AsQueryable();

                // Equipment filter
                if (requiresEquipment.HasValue)
                {
                    query = query.Where(e => e.RequiresEquipment == requiresEquipment.Value);
                }

                // If specific allowed equipment list is supplied (e.g. user selected Dumbbells and Pull Up Bar)
                if (equipmentList != null && equipmentList.Any())
                {
                    var allowedLower = equipmentList.Select(eq => eq.Trim().ToLowerInvariant()).ToList();
                    query = query.Where(e => !e.RequiresEquipment || allowedLower.Contains(e.EquipmentType.ToLower()));
                }

                // Category filter
                if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(e => e.Category == category);
                }

                // Search query filter
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var term = search.Trim().ToLower();
                    query = query.Where(e => e.Name.ToLower().Contains(term) || e.TargetMuscles.ToLower().Contains(term));
                }

                var exercises = await query.OrderBy(e => e.Category).ThenBy(e => e.Name).ToListAsync();

                var dtos = exercises.Select(e => new ExerciseDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Category = e.Category,
                    TargetMuscles = e.TargetMuscles,
                    RequiresEquipment = e.RequiresEquipment,
                    EquipmentType = e.EquipmentType,
                    DifficultyLevel = e.DifficultyLevel,
                    DefaultSets = e.DefaultSets,
                    DefaultReps = e.DefaultReps,
                    DefaultRestSeconds = e.DefaultRestSeconds,
                    EstimatedMetValue = e.EstimatedMetValue,
                    ThumbnailUrl = e.ThumbnailUrl,
                    AnimationUrl = e.AnimationUrl,
                    Instructions = e.Instructions
                }).ToList();

                return ApiResponse<List<ExerciseDto>>.Success(dtos, "Exercise catalog retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<ExerciseDto>>.Fail($"Failed to load exercises: {ex.Message}");
            }
        }

        public async Task<ApiResponse<UserWorkoutPlanDto>> GetActivePlanAsync(int userId, DateTime? targetDate = null)
        {
            try
            {
                var plan = await _context.UserWorkoutPlans
                    .Include(p => p.Days)
                        .ThenInclude(d => d.Exercises)
                            .ThenInclude(e => e.Exercise)
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);

                // If user doesn't have an active plan yet, auto-generate default starter routine
                if (plan == null)
                {
                    plan = await CreateDefaultStarterPlanAsync(userId);
                }

                var queryDate = targetDate?.Date ?? DateTime.UtcNow.Date;
                int diff = (7 + (int)queryDate.DayOfWeek - (int)DayOfWeek.Monday) % 7;
                var weekStart = queryDate.AddDays(-diff);
                var weekEnd = weekStart.AddDays(7);

                // Fetch session logs for this specific calendar week to populate date-specific completion state
                var sessionLogs = await _context.WorkoutSessionLogs
                    .Where(l => l.UserId == userId && l.SessionDate >= weekStart && l.SessionDate < weekEnd)
                    .ToListAsync();

                var planDto = MapPlanToDto(plan, weekStart, sessionLogs);
                return ApiResponse<UserWorkoutPlanDto>.Success(planDto, "Active workout plan retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<UserWorkoutPlanDto>.Fail($"Failed to load active plan: {ex.Message}");
            }
        }

        public async Task<ApiResponse<UserWorkoutPlanDto>> CreateOrUpdatePlanAsync(int userId, CreateWorkoutPlanDto dto)
        {
            try
            {
                // Deactivate any existing active plans
                var existingPlans = await _context.UserWorkoutPlans
                    .Where(p => p.UserId == userId && p.IsActive)
                    .ToListAsync();

                int currentMaxVersion = 0;
                foreach (var p in existingPlans)
                {
                    p.IsActive = false;
                    if (p.Version > currentMaxVersion)
                    {
                        currentMaxVersion = p.Version;
                    }
                }

                var newPlan = new UserWorkoutPlan
                {
                    UserId = userId,
                    Title = string.IsNullOrWhiteSpace(dto.Title) ? "My Weekly Routine" : dto.Title,
                    Goal = dto.Goal,
                    FitnessLevel = dto.FitnessLevel,
                    DaysPerWeek = dto.DaysPerWeek > 0 ? dto.DaysPerWeek : 4,
                    IsActive = true,
                    Version = currentMaxVersion + 1,
                    EffectiveStartDate = DateTime.UtcNow.Date,
                    Days = new List<WorkoutDay>()
                };

                // Populate 7 days (Monday through Sunday)
                var daysOfWeek = new[]
                {
                    DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, 
                    DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday
                };

                foreach (var dow in daysOfWeek)
                {
                    var dayInput = (dto.Days ?? new()).FirstOrDefault(d => d.DayOfWeek == dow);
                    var workoutDay = new WorkoutDay
                    {
                        DayOfWeek = dow,
                        FocusTitle = dayInput != null ? dayInput.FocusTitle : "Rest & Recovery",
                        IsRestDay = dayInput != null ? dayInput.IsRestDay : true,
                        TargetDurationMinutes = dayInput != null ? dayInput.TargetDurationMinutes : 0,
                        RestDayNotes = dayInput?.RestDayNotes,
                        Exercises = new List<WorkoutDayExercise>()
                    };

                    if (dayInput != null && !dayInput.IsRestDay && dayInput.Exercises != null)
                    {
                        int order = 0;
                        foreach (var exInput in dayInput.Exercises)
                        {
                            workoutDay.Exercises.Add(new WorkoutDayExercise
                            {
                                ExerciseId = exInput.ExerciseId,
                                Sets = Math.Clamp(exInput.Sets > 0 ? exInput.Sets : 3, 1, 20),
                                Reps = Math.Clamp(exInput.Reps > 0 ? exInput.Reps : 12, 1, 500),
                                RestSeconds = Math.Clamp(exInput.RestSeconds > 0 ? exInput.RestSeconds : 60, 5, 600),
                                OrderIndex = order++
                            });
                        }
                    }

                    newPlan.Days.Add(workoutDay);
                }

                await _context.UserWorkoutPlans.AddAsync(newPlan);
                await _context.SaveChangesAsync();

                // Reload plan with relationships
                return await GetActivePlanAsync(userId);
            }
            catch (Exception ex)
            {
                return ApiResponse<UserWorkoutPlanDto>.Fail($"Failed to save workout plan: {ex.Message}");
            }
        }

        public async Task<ApiResponse<WorkoutDayDto>> UpdateDayAsync(int userId, int dayId, UpdateWorkoutDayDto dto)
        {
            try
            {
                var day = await _context.WorkoutDays
                    .Include(d => d.Exercises)
                    .FirstOrDefaultAsync(d => d.Id == dayId);

                if (day == null)
                {
                    return ApiResponse<WorkoutDayDto>.Fail("Workout day not found.");
                }

                // Verify plan belongs to user
                var plan = await _context.UserWorkoutPlans.FirstOrDefaultAsync(p => p.Id == day.WorkoutPlanId && p.UserId == userId);
                if (plan == null)
                {
                    return ApiResponse<WorkoutDayDto>.Fail("Unauthorized: Workout day does not belong to active user.");
                }

                day.FocusTitle = dto.FocusTitle;
                day.IsRestDay = dto.IsRestDay;
                day.TargetDurationMinutes = dto.IsRestDay ? 0 : Math.Clamp(dto.TargetDurationMinutes, 0, 240);
                day.RestDayNotes = dto.RestDayNotes;

                // Replace exercises
                _context.WorkoutDayExercises.RemoveRange(day.Exercises);
                day.Exercises.Clear();

                if (!dto.IsRestDay && dto.Exercises != null)
                {
                    int order = 0;
                    foreach (var exInput in dto.Exercises)
                    {
                        day.Exercises.Add(new WorkoutDayExercise
                        {
                            WorkoutDayId = day.Id,
                            ExerciseId = exInput.ExerciseId,
                            Sets = Math.Clamp(exInput.Sets > 0 ? exInput.Sets : 3, 1, 20),
                            Reps = Math.Clamp(exInput.Reps > 0 ? exInput.Reps : 12, 1, 500),
                            RestSeconds = Math.Clamp(exInput.RestSeconds > 0 ? exInput.RestSeconds : 60, 5, 600),
                            OrderIndex = order++
                        });
                    }
                }

                await _context.SaveChangesAsync();

                // Reload day with exercise details
                var updatedDay = await _context.WorkoutDays
                    .Include(d => d.Exercises)
                        .ThenInclude(e => e.Exercise)
                    .FirstAsync(d => d.Id == dayId);

                var dayDto = MapDayToDto(updatedDay, null);
                return ApiResponse<WorkoutDayDto>.Success(dayDto, "Workout day updated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<WorkoutDayDto>.Fail($"Failed to update workout day: {ex.Message}");
            }
        }

        public async Task<ApiResponse<WorkoutSessionLogDto>> LogSessionAsync(int userId, LogWorkoutSessionDto dto)
        {
            try
            {
                var day = await _context.WorkoutDays
                    .Include(d => d.Exercises)
                        .ThenInclude(e => e.Exercise)
                    .FirstOrDefaultAsync(d => d.Id == dto.WorkoutDayId);

                if (day == null)
                {
                    return ApiResponse<WorkoutSessionLogDto>.Fail("Workout day not found.");
                }

                // Security: Verify the workout day belongs to a plan owned by the authenticated user
                var plan = await _context.UserWorkoutPlans
                    .FirstOrDefaultAsync(p => p.Id == day.WorkoutPlanId && p.UserId == userId);
                if (plan == null)
                {
                    return ApiResponse<WorkoutSessionLogDto>.Fail("Unauthorized: Workout day does not belong to active user.");
                }

                var sessionDate = dto.SessionDate.Date;
                var existingLog = await _context.WorkoutSessionLogs
                    .FirstOrDefaultAsync(l => l.UserId == userId && l.WorkoutDayId == day.Id && l.SessionDate == sessionDate);

                // Calculate estimated calories burned: MET * 3.5 * weightKg (default 70) / 200 * durationMinutes
                float avgMet = day.Exercises.Any() ? day.Exercises.Average(e => e.Exercise?.EstimatedMetValue ?? 5.0f) : 5.0f;
                int rawDuration = dto.ActualDurationMinutes > 0 ? dto.ActualDurationMinutes : (day.TargetDurationMinutes > 0 ? day.TargetDurationMinutes : 30);
                int duration = Math.Clamp(rawDuration, 5, 360);
                int estimatedCalories = (int)Math.Round((avgMet * 3.5f * 70.0f / 200.0f) * duration);

                if (existingLog != null)
                {
                    existingLog.IsCompleted = dto.IsCompleted;
                    existingLog.ActualDurationMinutes = duration;
                    existingLog.EstimatedCaloriesBurned = estimatedCalories;
                    existingLog.CompletedAt = DateTime.UtcNow;
                    existingLog.Notes = dto.Notes;

                    // Bridge to HealthLogs: update or remove existing HealthLog (strictly user-isolated)
                    if (!dto.IsCompleted)
                    {
                        if (existingLog.HealthLogId.HasValue)
                        {
                            var healthLog = await _context.HealthLogs
                                .FirstOrDefaultAsync(h => h.Id == existingLog.HealthLogId.Value && h.UserId == userId);
                            if (healthLog != null)
                            {
                                _context.HealthLogs.Remove(healthLog);
                            }
                            existingLog.HealthLogId = null;
                        }
                    }
                    else
                    {
                        if (existingLog.HealthLogId.HasValue)
                        {
                            var healthLog = await _context.HealthLogs
                                .FirstOrDefaultAsync(h => h.Id == existingLog.HealthLogId.Value && h.UserId == userId);
                            if (healthLog != null)
                            {
                                healthLog.LogValue = duration;
                                healthLog.Details = $"Workout session - {day.FocusTitle} ({estimatedCalories} kcal estimated)";
                            }
                        }
                        else
                        {
                            var healthLog = new HealthLog
                            {
                                UserId = userId,
                                LogType = "Workout",
                                LogValue = duration,
                                LogDate = sessionDate,
                                Details = $"Workout session - {day.FocusTitle} ({estimatedCalories} kcal estimated)"
                            };
                            await _context.HealthLogs.AddAsync(healthLog);
                            await _context.SaveChangesAsync();
                            existingLog.HealthLogId = healthLog.Id;
                        }
                    }

                    await _context.SaveChangesAsync();

                    return ApiResponse<WorkoutSessionLogDto>.Success(MapLogToDto(existingLog), "Workout session updated.");
                }
                else
                {
                    // Create new HealthLog for workout duration
                    int? healthLogId = null;
                    if (dto.IsCompleted)
                    {
                        var healthLog = new HealthLog
                        {
                            UserId = userId,
                            LogType = "Workout",
                            LogValue = duration,
                            LogDate = sessionDate,
                            Details = $"Workout session - {day.FocusTitle} ({estimatedCalories} kcal estimated)"
                        };
                        await _context.HealthLogs.AddAsync(healthLog);
                        await _context.SaveChangesAsync();
                        healthLogId = healthLog.Id;
                    }

                    var newLog = new WorkoutSessionLog
                    {
                        UserId = userId,
                        WorkoutPlanId = day.WorkoutPlanId,
                        WorkoutDayId = day.Id,
                        SessionDate = sessionDate,
                        IsCompleted = dto.IsCompleted,
                        CompletedAt = DateTime.UtcNow,
                        ActualDurationMinutes = duration,
                        EstimatedCaloriesBurned = estimatedCalories,
                        HealthLogId = healthLogId,
                        Notes = dto.Notes
                    };

                    await _context.WorkoutSessionLogs.AddAsync(newLog);
                    await _context.SaveChangesAsync();

                    return ApiResponse<WorkoutSessionLogDto>.Success(MapLogToDto(newLog), "Workout session logged successfully.");
                }
            }
            catch (Exception ex)
            {
                return ApiResponse<WorkoutSessionLogDto>.Fail($"Failed to log workout session: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteSessionLogAsync(int userId, int sessionLogId)
        {
            try
            {
                var log = await _context.WorkoutSessionLogs
                    .FirstOrDefaultAsync(l => l.Id == sessionLogId && l.UserId == userId);

                if (log == null)
                {
                    return ApiResponse<bool>.Fail("Workout session log not found.");
                }

                // If linked to HealthLog, remove that HealthLog too (strictly user-isolated)
                if (log.HealthLogId.HasValue)
                {
                    var healthLog = await _context.HealthLogs
                        .FirstOrDefaultAsync(h => h.Id == log.HealthLogId.Value && h.UserId == userId);
                    if (healthLog != null)
                    {
                        _context.HealthLogs.Remove(healthLog);
                    }
                }

                _context.WorkoutSessionLogs.Remove(log);
                await _context.SaveChangesAsync();

                return ApiResponse<bool>.Success(true, "Workout session log deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete workout session log: {ex.Message}");
            }
        }

        public async Task<ApiResponse<WorkoutWeekSummaryDto>> GetWeekSummaryAsync(int userId, DateTime weekStartDate)
        {
            try
            {
                var start = weekStartDate.Date;
                var end = start.AddDays(7);

                var logs = await _context.WorkoutSessionLogs
                    .Where(l => l.UserId == userId && l.SessionDate >= start && l.SessionDate < end && l.IsCompleted)
                    .ToListAsync();

                var activePlan = await _context.UserWorkoutPlans
                    .Include(p => p.Days)
                        .ThenInclude(d => d.Exercises)
                            .ThenInclude(e => e.Exercise)
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);

                int plannedWorkouts = activePlan?.Days.Count(d => !d.IsRestDay) ?? 4;
                int completed = logs.Count;
                int totalMinutes = logs.Sum(l => l.ActualDurationMinutes);
                int totalCalories = logs.Sum(l => l.EstimatedCaloriesBurned);
                float adherence = plannedWorkouts > 0 ? (float)Math.Round((completed / (float)plannedWorkouts) * 100.0f, 1) : 0f;

                // Compute muscle group focus balance
                var muscleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                if (activePlan != null)
                {
                    var activeDays = activePlan.Days.Where(d => !d.IsRestDay).ToList();
                    foreach (var d in activeDays)
                    {
                        foreach (var ex in d.Exercises)
                        {
                            var cat = ex.Exercise?.Category ?? "Other";
                            muscleCounts[cat] = muscleCounts.GetValueOrDefault(cat, 0) + 1;
                        }
                    }
                }

                int totalExerciseOccurrences = muscleCounts.Values.Sum();
                var percentages = new Dictionary<string, int>();
                if (totalExerciseOccurrences > 0)
                {
                    foreach (var kvp in muscleCounts)
                    {
                        percentages[kvp.Key] = (int)Math.Round((kvp.Value / (float)totalExerciseOccurrences) * 100.0f);
                    }
                }

                var summary = new WorkoutWeekSummaryDto
                {
                    WeekStartDate = start,
                    WeekEndDate = end.AddDays(-1),
                    TotalPlannedWorkouts = plannedWorkouts,
                    CompletedWorkouts = completed,
                    TotalMinutesExercised = totalMinutes,
                    TotalEstimatedCaloriesBurned = totalCalories,
                    AdherenceRatePercentage = adherence,
                    MuscleGroupFocusPercentages = percentages
                };

                return ApiResponse<WorkoutWeekSummaryDto>.Success(summary, "Week summary calculated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<WorkoutWeekSummaryDto>.Fail($"Failed to load week summary: {ex.Message}");
            }
        }

        public async Task<ApiResponse<AiWorkoutPlanResponseDto>> GenerateAiPlanAsync(int userId, GenerateAiWorkoutPlanRequestDto request)
        {
            try
            {
                var exercises = await _context.Exercises.ToListAsync();
                var aiResponse = DeterministicWorkoutGenerator.GeneratePlan(request, exercises);
                return ApiResponse<AiWorkoutPlanResponseDto>.Success(aiResponse, "AI workout plan generated successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<AiWorkoutPlanResponseDto>.Fail($"Failed to generate AI plan: {ex.Message}");
            }
        }

        // ==================== Private Helpers ====================

        private async Task<UserWorkoutPlan> CreateDefaultStarterPlanAsync(int userId)
        {
            var exercises = await _context.Exercises.ToListAsync();
            var pushup = exercises.FirstOrDefault(e => e.Name.Contains("Push-Up")) ?? exercises.FirstOrDefault();
            var squat = exercises.FirstOrDefault(e => e.Name.Contains("Bodyweight Squats")) ?? exercises.FirstOrDefault();
            var plank = exercises.FirstOrDefault(e => e.Name.Contains("Plank")) ?? exercises.FirstOrDefault();
            var burpee = exercises.FirstOrDefault(e => e.Name.Contains("Burpees")) ?? exercises.FirstOrDefault();

            var plan = new UserWorkoutPlan
            {
                UserId = userId,
                Title = "4-Day Foundational Starter",
                Goal = "Stay Fit",
                FitnessLevel = "Beginner",
                DaysPerWeek = 4,
                IsActive = true,
                Version = 1,
                EffectiveStartDate = DateTime.UtcNow.Date,
                Days = new List<WorkoutDay>()
            };

            var daysOfWeek = new[]
            {
                DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, 
                DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday
            };

            foreach (var dow in daysOfWeek)
            {
                if (dow == DayOfWeek.Monday)
                {
                    var day = new WorkoutDay { DayOfWeek = dow, FocusTitle = "Upper Body & Core", IsRestDay = false, TargetDurationMinutes = 25 };
                    if (pushup != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = pushup.Id, Sets = 3, Reps = 12, RestSeconds = 60, OrderIndex = 0 });
                    if (plank != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = plank.Id, Sets = 3, Reps = 45, RestSeconds = 45, OrderIndex = 1 });
                    plan.Days.Add(day);
                }
                else if (dow == DayOfWeek.Tuesday)
                {
                    var day = new WorkoutDay { DayOfWeek = dow, FocusTitle = "Lower Body & Legs", IsRestDay = false, TargetDurationMinutes = 25 };
                    if (squat != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = squat.Id, Sets = 3, Reps = 15, RestSeconds = 60, OrderIndex = 0 });
                    plan.Days.Add(day);
                }
                else if (dow == DayOfWeek.Thursday)
                {
                    var day = new WorkoutDay { DayOfWeek = dow, FocusTitle = "Cardio & Full Body", IsRestDay = false, TargetDurationMinutes = 25 };
                    if (burpee != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = burpee.Id, Sets = 3, Reps = 10, RestSeconds = 60, OrderIndex = 0 });
                    if (pushup != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = pushup.Id, Sets = 3, Reps = 10, RestSeconds = 60, OrderIndex = 1 });
                    plan.Days.Add(day);
                }
                else if (dow == DayOfWeek.Friday)
                {
                    var day = new WorkoutDay { DayOfWeek = dow, FocusTitle = "Core & Endurance", IsRestDay = false, TargetDurationMinutes = 25 };
                    if (plank != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = plank.Id, Sets = 3, Reps = 60, RestSeconds = 45, OrderIndex = 0 });
                    if (squat != null) day.Exercises.Add(new WorkoutDayExercise { ExerciseId = squat.Id, Sets = 3, Reps = 15, RestSeconds = 60, OrderIndex = 1 });
                    plan.Days.Add(day);
                }
                else
                {
                    plan.Days.Add(new WorkoutDay
                    {
                        DayOfWeek = dow,
                        FocusTitle = "Active Rest & Recovery",
                        IsRestDay = true,
                        TargetDurationMinutes = 0,
                        RestDayNotes = "Hydrate, light stretching, and get adequate rest."
                    });
                }
            }

            await _context.UserWorkoutPlans.AddAsync(plan);
            await _context.SaveChangesAsync();

            return plan;
        }

        public async Task<ApiResponse<int>> SyncPlannerAsync(int userId, DateTime? weekStartDate)
        {
            try
            {
                var plan = await _context.UserWorkoutPlans
                    .Include(p => p.Days)
                        .ThenInclude(d => d.Exercises)
                            .ThenInclude(e => e.Exercise)
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);

                if (plan == null)
                {
                    return ApiResponse<int>.Fail("No active workout plan found to sync.");
                }

                var date = weekStartDate?.Date ?? DateTime.UtcNow.Date;
                int diff = (7 + (int)date.DayOfWeek - (int)DayOfWeek.Monday) % 7;
                var monday = date.AddDays(-diff);
                var weekEnd = monday.AddDays(7);

                var existingEvents = await _context.PlannerEvents
                    .Where(e => e.UserId == userId && e.StartTime >= monday && e.StartTime < weekEnd)
                    .ToListAsync();

                var weekLogs = await _context.WorkoutSessionLogs
                    .Where(l => l.UserId == userId && l.SessionDate >= monday && l.SessionDate < weekEnd)
                    .ToListAsync();

                int syncedCount = 0;

                foreach (var day in plan.Days.Where(d => !d.IsRestDay))
                {
                    int offset = ((int)day.DayOfWeek == 0 ? 7 : (int)day.DayOfWeek) - 1;
                    var sessionDate = monday.AddDays(offset);
                    string syncTag = $"[WorkoutSync:DayId:{day.Id}:Date:{sessionDate:yyyy-MM-dd}]";

                    var existingEvent = existingEvents.FirstOrDefault(e => e.Description != null && e.Description.Contains(syncTag));
                    var matchingLog = weekLogs.FirstOrDefault(l => l.WorkoutDayId == day.Id && l.SessionDate.Date == sessionDate);
                    bool isCompleted = matchingLog?.IsCompleted ?? false;

                    var startTime = sessionDate.Date.AddHours(8); // Default 8:00 AM
                    var durationMins = day.TargetDurationMinutes > 0 ? day.TargetDurationMinutes : 30;
                    var endTime = startTime.AddMinutes(durationMins);
                    var reminderTime = startTime.AddMinutes(-30);

                    string exerciseSummary = day.Exercises.Any()
                        ? string.Join(", ", day.Exercises.OrderBy(e => e.OrderIndex).Select(e => e.Exercise?.Name ?? "Exercise"))
                        : "General workout";
                    string description = $"Focus: {day.FocusTitle} ({durationMins} mins)\nExercises: {exerciseSummary}\n{syncTag}";

                    if (existingEvent != null)
                    {
                        existingEvent.Title = $"Workout: {day.FocusTitle}";
                        existingEvent.Description = description;
                        existingEvent.StartTime = startTime;
                        existingEvent.EndTime = endTime;
                        existingEvent.ReminderTime = reminderTime;
                        existingEvent.IsCompleted = isCompleted;
                        existingEvent.CompletedAt = matchingLog?.CompletedAt;
                        existingEvent.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        var newEvent = new PlannerEvent
                        {
                            UserId = userId,
                            Title = $"Workout: {day.FocusTitle}",
                            Description = description,
                            StartTime = startTime,
                            EndTime = endTime,
                            ReminderTime = reminderTime,
                            ReminderSent = false,
                            IsCompleted = isCompleted,
                            CompletedAt = matchingLog?.CompletedAt,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.PlannerEvents.AddAsync(newEvent);
                    }
                    syncedCount++;
                }

                await _context.SaveChangesAsync();
                return ApiResponse<int>.Success(syncedCount, $"Synced {syncedCount} workout sessions to your planner successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<int>.Fail($"Failed to sync workout sessions to planner: {ex.Message}");
            }
        }

        private static UserWorkoutPlanDto MapPlanToDto(UserWorkoutPlan plan, DateTime weekStart, List<WorkoutSessionLog> weekLogs)
        {
            var dto = new UserWorkoutPlanDto
            {
                Id = plan.Id,
                UserId = plan.UserId,
                Title = plan.Title,
                Goal = plan.Goal,
                FitnessLevel = plan.FitnessLevel,
                DaysPerWeek = plan.DaysPerWeek,
                IsActive = plan.IsActive,
                Version = plan.Version,
                EffectiveStartDate = plan.EffectiveStartDate,
                Days = new List<WorkoutDayDto>()
            };

            // Order Monday to Sunday
            var orderedDays = plan.Days.OrderBy(d => (int)d.DayOfWeek == 0 ? 7 : (int)d.DayOfWeek).ToList();

            foreach (var day in orderedDays)
            {
                // Calculate calendar date for this weekday in current week
                int offset = ((int)day.DayOfWeek == 0 ? 7 : (int)day.DayOfWeek) - 1; // Monday = 0, Sunday = 6
                var dayCalendarDate = weekStart.AddDays(offset);

                var log = weekLogs.FirstOrDefault(l => l.WorkoutDayId == day.Id && l.SessionDate.Date == dayCalendarDate);
                dto.Days.Add(MapDayToDto(day, log));
            }

            return dto;
        }

        private static WorkoutDayDto MapDayToDto(WorkoutDay day, WorkoutSessionLog? log)
        {
            return new WorkoutDayDto
            {
                Id = day.Id,
                WorkoutPlanId = day.WorkoutPlanId,
                DayOfWeek = day.DayOfWeek,
                FocusTitle = day.FocusTitle,
                IsRestDay = day.IsRestDay,
                TargetDurationMinutes = day.TargetDurationMinutes,
                RestDayNotes = day.RestDayNotes,
                Exercises = day.Exercises.OrderBy(e => e.OrderIndex).Select(e => new WorkoutDayExerciseDto
                {
                    Id = e.Id,
                    WorkoutDayId = e.WorkoutDayId,
                    ExerciseId = e.ExerciseId,
                    ExerciseName = e.Exercise?.Name ?? "Exercise",
                    Category = e.Exercise?.Category ?? "General",
                    TargetMuscles = e.Exercise?.TargetMuscles ?? string.Empty,
                    RequiresEquipment = e.Exercise?.RequiresEquipment ?? false,
                    EquipmentType = e.Exercise?.EquipmentType ?? "None",
                    Sets = e.Sets,
                    Reps = e.Reps,
                    RestSeconds = e.RestSeconds,
                    OrderIndex = e.OrderIndex,
                    EstimatedMetValue = e.Exercise?.EstimatedMetValue ?? 5.0f,
                    Instructions = e.Exercise?.Instructions
                }).ToList(),
                IsCompletedForDate = log?.IsCompleted ?? false,
                CompletedAt = log?.CompletedAt,
                ActualDurationMinutes = log?.ActualDurationMinutes,
                EstimatedCaloriesBurned = log?.EstimatedCaloriesBurned,
                SessionLogId = log?.Id
            };
        }

        private static WorkoutSessionLogDto MapLogToDto(WorkoutSessionLog log)
        {
            return new WorkoutSessionLogDto
            {
                Id = log.Id,
                UserId = log.UserId,
                WorkoutPlanId = log.WorkoutPlanId,
                WorkoutDayId = log.WorkoutDayId,
                SessionDate = log.SessionDate,
                IsCompleted = log.IsCompleted,
                CompletedAt = log.CompletedAt,
                ActualDurationMinutes = log.ActualDurationMinutes,
                EstimatedCaloriesBurned = log.EstimatedCaloriesBurned,
                HealthLogId = log.HealthLogId,
                Notes = log.Notes
            };
        }
    }
}
