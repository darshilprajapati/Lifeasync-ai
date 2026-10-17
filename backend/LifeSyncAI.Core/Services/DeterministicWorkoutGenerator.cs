using System;
using System.Collections.Generic;
using System.Linq;
using LifeSyncAI.Core.DTO.Input.Workout;
using LifeSyncAI.Core.DTO.Output.Workout;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    /// <summary>
    /// Science-backed kinesiology and periodization engine.
    /// Generates structured 7-day workout routines adhering strictly to equipment availability,
    /// fitness level, primary goals, muscle recovery windows, and antagonist pairings.
    /// </summary>
    public static class DeterministicWorkoutGenerator
    {
        public static AiWorkoutPlanResponseDto GeneratePlan(
            GenerateAiWorkoutPlanRequestDto request,
            List<Exercise> exercisePool)
        {
            // 1. Filter exercise pool based on equipment mode
            List<Exercise> eligibleExercises;
            if (!request.HasEquipment)
            {
                // Without Equipment: Bodyweight only
                eligibleExercises = exercisePool.Where(e => !e.RequiresEquipment).ToList();
            }
            else
            {
                // With Equipment: Bodyweight + user-selected equipment types
                var allowedEquipment = new HashSet<string>(request.AvailableEquipment ?? new List<string>(), StringComparer.OrdinalIgnoreCase);
                eligibleExercises = exercisePool.Where(e => 
                    !e.RequiresEquipment || 
                    allowedEquipment.Contains(e.EquipmentType)
                ).ToList();
            }

            if (!eligibleExercises.Any())
            {
                // Fallback to all bodyweight exercises if no matching equipment found
                eligibleExercises = exercisePool.Where(e => !e.RequiresEquipment).ToList();
            }

            // 2. Determine Sets, Reps, and Rest periods based on Goal & Fitness Level
            int defaultSets = 3;
            int defaultReps = 12;
            int defaultRestSeconds = 60;
            string goalStrategyDescription;

            var goal = (request.Goal ?? "Stay Fit").Trim().ToLowerInvariant();
            switch (goal)
            {
                case "muscle building":
                case "hypertrophy":
                    defaultSets = request.FitnessLevel == "Advanced" ? 4 : 3;
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

            int daysPerWeek = Math.Clamp(request.DaysPerWeek, 3, 6);
            int targetDuration = Math.Clamp(request.PreferredDurationMinutes > 0 ? request.PreferredDurationMinutes : 35, 20, 75);

            // 3. Construct 7-day periodization template (Monday = DayOfWeek.Monday through Sunday = DayOfWeek.Sunday)
            var suggestedDays = new List<WorkoutDayDto>();
            string splitTitle;
            string reasoning;

            if (daysPerWeek == 3)
            {
                splitTitle = "3-Day Full Body Frequency Routine";
                reasoning = $"Optimized for {request.FitnessLevel} level with 48-hour recovery windows between full-body compound sessions. {goalStrategyDescription}";

                suggestedDays.Add(CreateDay(DayOfWeek.Monday, "Full Body Compound A", false, targetDuration, eligibleExercises, new[] { "Chest", "Back", "Legs", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Tuesday, "Active Recovery & Mobility", "Gentle 20-minute walk, foam rolling, and mobility drills."));
                suggestedDays.Add(CreateDay(DayOfWeek.Wednesday, "Full Body Functional B", false, targetDuration, eligibleExercises, new[] { "Legs", "Shoulders", "Arms", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Thursday, "Rest & Hydration", "Full rest day. Focus on quality sleep and nutrient-dense hydration."));
                suggestedDays.Add(CreateDay(DayOfWeek.Friday, "Full Body Power & Core C", false, targetDuration, eligibleExercises, new[] { "Full Body", "Chest", "Back", "Cardio" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Saturday, "Weekend Active Recovery", "Optional light outdoor activity, yoga, or stretching."));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Sunday, "Deep Restoration", "Prepare for the upcoming week with adequate rest and meal preparation."));
            }
            else if (daysPerWeek == 4)
            {
                splitTitle = "4-Day Upper / Lower Periodized Split";
                reasoning = $"Classic Upper/Lower kinematic split separating anterior and posterior muscle chains to prevent central nervous system fatigue. {goalStrategyDescription}";

                suggestedDays.Add(CreateDay(DayOfWeek.Monday, "Upper Body Power", false, targetDuration, eligibleExercises, new[] { "Chest", "Back", "Shoulders" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Tuesday, "Lower Body & Core", false, targetDuration, eligibleExercises, new[] { "Legs", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Wednesday, "Mid-Week Active Rest", "30 minutes of light mobility and cardiovascular flushing."));
                suggestedDays.Add(CreateDay(DayOfWeek.Thursday, "Upper Body Hypertrophy", false, targetDuration, eligibleExercises, new[] { "Chest", "Arms", "Back" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Friday, "Lower Body & Explosiveness", false, targetDuration, eligibleExercises, new[] { "Legs", "Full Body", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Saturday, "Weekend Recreation", "Light outdoor activities, sports, or relaxation."));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Sunday, "Complete Rest Day", "Recharge physical and mental stamina for the upcoming cycle."));
            }
            else if (daysPerWeek == 5)
            {
                splitTitle = "5-Day Body-Part Specialization Routine";
                reasoning = $"High-frequency aesthetic split providing targeted muscle isolation while maintaining metabolic conditioning. {goalStrategyDescription}";

                suggestedDays.Add(CreateDay(DayOfWeek.Monday, "Chest & Core Focus", false, targetDuration, eligibleExercises, new[] { "Chest", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Tuesday, "Back & Posterior Chain", false, targetDuration, eligibleExercises, new[] { "Back", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Wednesday, "Mid-Week Recovery", "Active stretching and targeted mobility work."));
                suggestedDays.Add(CreateDay(DayOfWeek.Thursday, "Lower Body Quadriceps & Calves", false, targetDuration, eligibleExercises, new[] { "Legs" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Friday, "Shoulders & Arms Sculpt", false, targetDuration, eligibleExercises, new[] { "Shoulders", "Arms" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Saturday, "Full Body Conditioning & Core", false, targetDuration, eligibleExercises, new[] { "Full Body", "Cardio", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Sunday, "Deep Restoration", "Nutritional replenishment, hydration, and restful sleep."));
            }
            else // 6 Days
            {
                splitTitle = "6-Day Push / Pull / Legs High-Volume Split";
                reasoning = $"Advanced double-wave PPL split with dedicated agonist-antagonist sequencing for optimal volume accumulation. {goalStrategyDescription}";

                suggestedDays.Add(CreateDay(DayOfWeek.Monday, "Push Strength (Chest & Shoulders)", false, targetDuration, eligibleExercises, new[] { "Chest", "Shoulders" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Tuesday, "Pull Strength (Back & Biceps)", false, targetDuration, eligibleExercises, new[] { "Back", "Arms" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Wednesday, "Legs & Core Power", false, targetDuration, eligibleExercises, new[] { "Legs", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Thursday, "Push Hypertrophy", false, targetDuration, eligibleExercises, new[] { "Chest", "Arms" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Friday, "Pull Hypertrophy & Rear Delts", false, targetDuration, eligibleExercises, new[] { "Back", "Shoulders" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateDay(DayOfWeek.Saturday, "Lower Body Conditioning & Core", false, targetDuration, eligibleExercises, new[] { "Legs", "Full Body", "Core" }, defaultSets, defaultReps, defaultRestSeconds));
                suggestedDays.Add(CreateRestDay(DayOfWeek.Sunday, "Full Rest Day", "Systemic central nervous system recovery."));
            }

            return new AiWorkoutPlanResponseDto
            {
                Title = $"{request.FitnessLevel} {request.Goal} Routine",
                Goal = request.Goal,
                FitnessLevel = request.FitnessLevel,
                DaysPerWeek = daysPerWeek,
                SplitDescription = splitTitle,
                AIReasoning = reasoning,
                Source = "Deterministic",
                SuggestedDays = suggestedDays
            };
        }

        private static WorkoutDayDto CreateDay(
            DayOfWeek dayOfWeek,
            string focusTitle,
            bool isRestDay,
            int targetDuration,
            List<Exercise> pool,
            string[] targetCategories,
            int defaultSets,
            int defaultReps,
            int defaultRestSeconds)
        {
            var dayDto = new WorkoutDayDto
            {
                DayOfWeek = dayOfWeek,
                FocusTitle = focusTitle,
                IsRestDay = isRestDay,
                TargetDurationMinutes = targetDuration,
                RestDayNotes = null,
                Exercises = new List<WorkoutDayExerciseDto>()
            };

            // Select 4-5 complementary exercises across target categories
            var selected = new List<Exercise>();
            foreach (var cat in targetCategories)
            {
                var matching = pool.Where(e => e.Category.Equals(cat, StringComparison.OrdinalIgnoreCase)).ToList();
                if (matching.Any())
                {
                    // Pick up to 2 unique exercises per category
                    foreach (var ex in matching.OrderBy(x => Guid.NewGuid()).Take(2))
                    {
                        if (!selected.Any(s => s.Id == ex.Id))
                        {
                            selected.Add(ex);
                        }
                    }
                }
            }

            // If we have fewer than 4 exercises, fill from Core or Full Body
            if (selected.Count < 4)
            {
                var fillers = pool.Where(e => !selected.Any(s => s.Id == e.Id)).ToList();
                foreach (var filler in fillers.Take(4 - selected.Count))
                {
                    selected.Add(filler);
                }
            }

            // Cap at 6 exercises per session
            int order = 0;
            foreach (var ex in selected.Take(6))
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
    }
}
