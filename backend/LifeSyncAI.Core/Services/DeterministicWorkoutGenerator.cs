using System;
using System.Collections.Generic;
using System.Linq;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Kinesiology and periodization engine.
    /// Generates structured 7-day workout routines adhering strictly to equipment availability,
    /// fitness level, primary goals, muscle recovery windows, duration limits, and user focus areas.
    /// Incorporates constrained randomized variation so repeated requests produce fresh, safe routines.
    /// </summary>
    public static class DeterministicWorkoutGenerator
    {
        public static AiWorkoutPlanResponseDto GeneratePlan(
            GenerateAiWorkoutPlanRequestDto request,
            List<Exercise> exercisePool,
            int? randomSeed = null)
        {
            var rng = randomSeed.HasValue ? new Random(randomSeed.Value) : new Random(Guid.NewGuid().GetHashCode());

            // 1. Determine workout mode and eligible exercises
            string mode = !string.IsNullOrWhiteSpace(request.WorkoutMode)
                ? request.WorkoutMode.Trim()
                : (request.HasEquipment ? "With Equipment" : "Without Equipment");

            var allowedEquipment = new HashSet<string>(
                (request.AvailableEquipment ?? new List<string>()).Select(eq => eq.Trim()),
                StringComparer.OrdinalIgnoreCase);

            List<Exercise> eligibleExercises;
            bool isHybrid = mode.Equals("Hybrid", StringComparison.OrdinalIgnoreCase);

            if (mode.Equals("Without Equipment", StringComparison.OrdinalIgnoreCase))
            {
                eligibleExercises = exercisePool.Where(e => !e.RequiresEquipment).ToList();
            }
            else
            {
                eligibleExercises = exercisePool.Where(e =>
                    !e.RequiresEquipment || allowedEquipment.Contains(e.EquipmentType)
                ).ToList();
            }

            if (!eligibleExercises.Any())
            {
                // Fallback to bodyweight if no matching equipment found
                eligibleExercises = exercisePool.Where(e => !e.RequiresEquipment).ToList();
            }

            // 2. Sets, Reps, and Rest periods based on Goal & Fitness Level
            int defaultSets = 3;
            int defaultReps = 12;
            int defaultRestSeconds = 60;
            string goalStrategyDescription;

            var goal = (request.Goal ?? "Stay Fit").Trim().ToLowerInvariant();
            switch (goal)
            {
                case "muscle building":
                case "hypertrophy":
                    defaultSets = request.FitnessLevel == "Advanced" ? 4 : (request.FitnessLevel == "Intermediate" ? 3 : 3);
                    defaultReps = 10;
                    defaultRestSeconds = 75;
                    goalStrategyDescription = "Hypertrophy-focused volume with 8-12 rep ranges and complete metabolic recovery intervals.";
                    break;

                case "fat loss":
                case "weight loss":
                    defaultSets = 3;
                    defaultReps = 15;
                    defaultRestSeconds = 45;
                    goalStrategyDescription = "High-density metabolic circuit training with elevated heart rate and shorter rest intervals.";
                    break;

                case "endurance":
                    defaultSets = 3;
                    defaultReps = 18;
                    defaultRestSeconds = 30;
                    goalStrategyDescription = "Muscular endurance and stamina development with continuous tempo work.";
                    break;

                case "stay fit":
                default:
                    defaultSets = 3;
                    defaultReps = 12;
                    defaultRestSeconds = 60;
                    goalStrategyDescription = "Balanced periodization supporting joint mobility, functional strength, and cardiovascular health.";
                    break;
            }

            // 3. Clamping days (1-7) and duration (1-120)
            int daysPerWeek = Math.Clamp(request.DaysPerWeek > 0 ? request.DaysPerWeek : 4, 1, 7);
            int requestedDuration = Math.Clamp(request.PreferredDurationMinutes > 0 ? request.PreferredDurationMinutes : 30, 1, 120);

            // Calculate target exercise count based on requested duration:
            // Average exercise duration in seconds = sets * ((reps * 3s) + restSeconds) + transition (30s)
            int secondsPerExercise = (defaultSets * ((defaultReps * 3) + defaultRestSeconds)) + 30;
            if (secondsPerExercise < 60) secondsPerExercise = 180; // at least 3 minutes
            int targetExerciseCount = Math.Clamp((int)Math.Round((requestedDuration * 60.0) / secondsPerExercise), 1, 10);

            // 4. Determine Focus Areas
            var userFocusAreas = (request.FocusAreas ?? new List<string>())
                .Where(f => !string.IsNullOrWhiteSpace(f) && !f.Equals("All", StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // 5. Build 7-day schedule (Monday to Sunday)
            var (splitTitle, reasoning, dayTemplates) = BuildDayTemplates(daysPerWeek, request.FitnessLevel, goalStrategyDescription, userFocusAreas);

            var suggestedDays = new List<WorkoutDayDto>();
            var usedYesterdayExerciseIds = new HashSet<int>();

            foreach (var template in dayTemplates)
            {
                if (template.IsRestDay)
                {
                    suggestedDays.Add(CreateRestDay(template.DayOfWeek, template.FocusTitle, template.RestNotes ?? "Hydrate, light walking, and deep rest."));
                    usedYesterdayExerciseIds.Clear();
                }
                else
                {
                    var day = CreateDayWithVariation(
                        template.DayOfWeek,
                        template.FocusTitle,
                        requestedDuration,
                        targetExerciseCount,
                        eligibleExercises,
                        template.TargetCategories ?? Array.Empty<string>(),
                        defaultSets,
                        defaultReps,
                        defaultRestSeconds,
                        isHybrid,
                        rng,
                        usedYesterdayExerciseIds);

                    suggestedDays.Add(day);
                    usedYesterdayExerciseIds = new HashSet<int>(day.Exercises.Select(e => e.ExerciseId));
                }
            }

            return new AiWorkoutPlanResponseDto
            {
                Title = $"{request.FitnessLevel ?? "Beginner"} {request.Goal ?? "Stay Fit"} Routine ({daysPerWeek} Days)",
                Goal = request.Goal ?? "Stay Fit",
                FitnessLevel = request.FitnessLevel ?? "Beginner",
                DaysPerWeek = daysPerWeek,
                SplitDescription = splitTitle,
                AIReasoning = reasoning,
                Source = "Deterministic",
                SuggestedDays = suggestedDays
            };
        }

        private static (string SplitTitle, string Reasoning, List<DayTemplate> Templates) BuildDayTemplates(
            int daysPerWeek,
            string fitnessLevel,
            string goalStrategy,
            List<string> userFocusAreas)
        {
            var templates = new List<DayTemplate>();
            string title;
            string reasoning;

            string[] baseAllCategories = new[] { "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio" };
            string[] defaultFocus = userFocusAreas.Any() ? userFocusAreas.ToArray() : baseAllCategories;

            switch (daysPerWeek)
            {
                case 1:
                    title = "1-Day Full Body Compound Routine";
                    reasoning = $"Single high-efficiency compound workout targeting all major movement patterns with extensive weekly recovery. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Rest & Mobility", true, null, "Active rest and gentle mobility."));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Rest & Recovery", true, null, "Hydration and posture alignment."));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Full Body Compound Blitz", false, CombineFocus(new[] { "Chest", "Back", "Legs", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Rest & Hydration", true, null, "Systemic rest day."));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Rest & Recharge", true, null, "Light walking or stretching."));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Weekend Active Rest", true, null, "Recreation or light outdoor activity."));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Deep Restoration", true, null, "Quality sleep and nutrition."));
                    break;

                case 2:
                    title = "2-Day Full Body Frequency Split";
                    reasoning = $"Two full-body stimulus sessions separated by 72 hours for maximal recovery and neuromuscular readiness. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Rest & Mobility", true, null, "Prepare for tomorrow's compound session."));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Full Body Strength A", false, CombineFocus(new[] { "Chest", "Back", "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Active Recovery", true, null, "Foam rolling and hydration."));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Rest & Rejuvenation", true, null, "Low-stress recovery day."));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Full Body Functional B", false, CombineFocus(new[] { "Shoulders", "Arms", "Legs", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Weekend Recreation", true, null, "Light outdoor recreational activities."));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Deep Rest", true, null, "Prep meals and recharge."));
                    break;

                case 3:
                    title = "3-Day Full Body Foundation Split";
                    reasoning = $"48-hour recovery windows between full-body compound workouts supporting steady muscular adaptations. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Full Body Compound A", false, CombineFocus(new[] { "Chest", "Back", "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Active Recovery & Mobility", true, null, "Gentle walking and mobility drills."));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Full Body Functional B", false, CombineFocus(new[] { "Legs", "Shoulders", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Rest & Hydration", true, null, "Full rest day for nervous system recovery."));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Full Body Power C", false, CombineFocus(new[] { "Chest", "Back", "Arms", "Cardio" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Weekend Active Recovery", true, null, "Optional yoga or casual walk."));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Deep Restoration", true, null, "Systemic rest and regeneration."));
                    break;

                case 4:
                    title = "4-Day Upper / Lower Periodized Split";
                    reasoning = $"Kinematic split separating anterior and posterior muscle chains to prevent central nervous system fatigue. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Upper Body Power", false, CombineFocus(new[] { "Chest", "Back", "Shoulders" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Lower Body & Core", false, CombineFocus(new[] { "Legs", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Mid-Week Active Rest", true, null, "30 minutes of light mobility and cardiovascular flushing."));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Upper Body Hypertrophy", false, CombineFocus(new[] { "Chest", "Arms", "Back" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Lower Body & Conditioning", false, CombineFocus(new[] { "Legs", "Core", "Cardio" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Weekend Recreation", true, null, "Light recreational activity."));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Complete Rest Day", true, null, "Recharge for the upcoming cycle."));
                    break;

                case 5:
                    title = "5-Day Body-Part Specialization Routine";
                    reasoning = $"Dedicated muscle focus per session optimizing volume accumulation and metabolic conditioning. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Chest & Core Focus", false, CombineFocus(new[] { "Chest", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Back & Posterior Chain", false, CombineFocus(new[] { "Back", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Mid-Week Mobility Rest", true, null, "Active stretching and targeted mobility work."));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Lower Body Quadriceps & Glutes", false, CombineFocus(new[] { "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Shoulders & Arms Sculpt", false, CombineFocus(new[] { "Shoulders", "Arms" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Full Body Conditioning & Core", false, CombineFocus(new[] { "Core", "Cardio", "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Deep Restoration", true, null, "Nutritional replenishment and restful sleep."));
                    break;

                case 6:
                    title = "6-Day Push / Pull / Legs High-Volume Split";
                    reasoning = $"Agonist-antagonist pairing with dedicated push, pull, and lower sessions repeated across the microcycle. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Push Strength (Chest & Shoulders)", false, CombineFocus(new[] { "Chest", "Shoulders" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Pull Strength (Back & Biceps)", false, CombineFocus(new[] { "Back", "Arms" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Legs & Core Power", false, CombineFocus(new[] { "Legs", "Core" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Push Hypertrophy", false, CombineFocus(new[] { "Chest", "Arms" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Pull Hypertrophy & Rear Delts", false, CombineFocus(new[] { "Back", "Shoulders" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Lower Body Conditioning & Core", false, CombineFocus(new[] { "Legs", "Core", "Cardio" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Full Rest Day", true, null, "Systemic central nervous system recovery."));
                    break;

                case 7:
                    title = "7-Day Daily Movement & Fitness Periodization";
                    reasoning = $"Daily planned activity cycling between resistance training, active core work, and low-impact cardiovascular flushing. {goalStrategy}";
                    templates.Add(new DayTemplate(DayOfWeek.Monday, "Upper Body Strength", false, CombineFocus(new[] { "Chest", "Back" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Tuesday, "Lower Body Power", false, CombineFocus(new[] { "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Wednesday, "Core & Active Mobility", false, CombineFocus(new[] { "Core", "Cardio" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Thursday, "Push & Arms Focus", false, CombineFocus(new[] { "Chest", "Shoulders", "Arms" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Friday, "Pull & Posterior Chain", false, CombineFocus(new[] { "Back", "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Saturday, "Full Body Conditioning", false, CombineFocus(new[] { "Cardio", "Core", "Legs" }, userFocusAreas)));
                    templates.Add(new DayTemplate(DayOfWeek.Sunday, "Low-Impact Recovery & Stretch", false, CombineFocus(new[] { "Core", "Cardio" }, userFocusAreas)));
                    break;

                default:
                    title = $"{daysPerWeek}-Day Balanced Split";
                    reasoning = $"Customized weekly split optimized for {fitnessLevel} tier. {goalStrategy}";
                    for (int i = 0; i < 7; i++)
                    {
                        var dow = (DayOfWeek)(((int)DayOfWeek.Monday + i) % 7);
                        if (i < daysPerWeek)
                            templates.Add(new DayTemplate(dow, $"Day {i + 1} Training", false, defaultFocus));
                        else
                            templates.Add(new DayTemplate(dow, "Rest Day", true, null, "Rest and recover."));
                    }
                    break;
            }

            return (title, reasoning, templates);
        }

        private static string[] CombineFocus(string[] defaultCategories, List<string> userFocus)
        {
            if (!userFocus.Any()) return defaultCategories;
            var combined = new List<string>(userFocus);
            foreach (var cat in defaultCategories)
            {
                if (!combined.Contains(cat, StringComparer.OrdinalIgnoreCase))
                {
                    combined.Add(cat);
                }
            }
            return combined.ToArray();
        }

        private static WorkoutDayDto CreateDayWithVariation(
            DayOfWeek dayOfWeek,
            string focusTitle,
            int targetDurationMinutes,
            int targetExerciseCount,
            List<Exercise> pool,
            string[] targetCategories,
            int defaultSets,
            int defaultReps,
            int defaultRestSeconds,
            bool isHybrid,
            Random rng,
            HashSet<int> usedYesterdayExerciseIds)
        {
            var dayDto = new WorkoutDayDto
            {
                DayOfWeek = dayOfWeek,
                FocusTitle = focusTitle,
                IsRestDay = false,
                RestDayNotes = null,
                Exercises = new List<WorkoutDayExerciseDto>()
            };

            var selected = new List<Exercise>();

            // Prioritize matching categories
            var shuffledCategories = targetCategories.OrderBy(_ => rng.Next()).ToList();

            foreach (var cat in shuffledCategories)
            {
                var matching = pool
                    .Where(e => e.Category.Equals(cat, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(e => usedYesterdayExerciseIds.Contains(e.Id) ? 1 : 0) // Avoid repeating yesterday's exercises if alternatives exist
                    .ThenBy(_ => rng.Next()) // Constrained random selection
                    .ToList();

                if (isHybrid && matching.Count > 1)
                {
                    // In Hybrid mode: pick both a bodyweight and equipment exercise if available
                    var bw = matching.FirstOrDefault(e => !e.RequiresEquipment && !selected.Any(s => s.Id == e.Id));
                    var eq = matching.FirstOrDefault(e => e.RequiresEquipment && !selected.Any(s => s.Id == e.Id));
                    if (bw != null) selected.Add(bw);
                    if (eq != null && selected.Count < targetExerciseCount) selected.Add(eq);
                }
                else
                {
                    var pick = matching.FirstOrDefault(e => !selected.Any(s => s.Id == e.Id));
                    if (pick != null)
                    {
                        selected.Add(pick);
                    }
                }

                if (selected.Count >= targetExerciseCount) break;
            }

            // Fill remaining if needed
            if (selected.Count < targetExerciseCount)
            {
                var fillers = pool
                    .Where(e => !selected.Any(s => s.Id == e.Id))
                    .OrderBy(e => usedYesterdayExerciseIds.Contains(e.Id) ? 1 : 0)
                    .ThenBy(_ => rng.Next())
                    .Take(targetExerciseCount - selected.Count);

                selected.AddRange(fillers);
            }

            // Build exercises with precise sets, reps, rest, order
            int order = 0;
            foreach (var ex in selected)
            {
                dayDto.Exercises.Add(new WorkoutDayExerciseDto
                {
                    ExerciseId = ex.Id,
                    ExerciseName = ex.Name,
                    Category = ex.Category,
                    TargetMuscles = ex.TargetMuscles,
                    RequiresEquipment = ex.RequiresEquipment,
                    EquipmentType = ex.EquipmentType,
                    Sets = defaultSets,
                    Reps = defaultReps,
                    RestSeconds = defaultRestSeconds,
                    OrderIndex = order++,
                    EstimatedMetValue = ex.EstimatedMetValue,
                    Instructions = ex.Instructions
                });
            }

            // Calculate estimated duration from exercises
            int calculatedMinutes = (int)Math.Max(1, Math.Round(dayDto.Exercises.Sum(e =>
                (e.Sets * ((e.Reps * 3) + e.RestSeconds) + 30) / 60.0)));

            dayDto.TargetDurationMinutes = calculatedMinutes > 0 ? calculatedMinutes : targetDurationMinutes;

            return dayDto;
        }

        private static WorkoutDayDto CreateRestDay(DayOfWeek dayOfWeek, string title, string notes)
        {
            return new WorkoutDayDto
            {
                DayOfWeek = dayOfWeek,
                FocusTitle = title,
                IsRestDay = true,
                TargetDurationMinutes = 0,
                RestDayNotes = notes,
                Exercises = new List<WorkoutDayExerciseDto>()
            };
        }

        private record DayTemplate(
            DayOfWeek DayOfWeek,
            string FocusTitle,
            bool IsRestDay,
            string[]? TargetCategories,
            string? RestNotes = null);
    }
}
