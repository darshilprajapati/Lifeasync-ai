using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Output.AiInsights;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class AiInsightsService : IAiInsightsService
    {
        private readonly ApplicationDbContext _context;

        public AiInsightsService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<AiRecommendationDto>>> GetRecommendationsAsync(int userId)
        {
            try
            {
                var list = await _context.AiRecommendations
                    .FromSqlRaw("EXEC dbo.sp_GetAiRecommendations @UserId = {0}", userId)
                    .ToListAsync();

                var dtos = list.Select(r => new AiRecommendationDto
                {
                    Id = r.Id,
                    InsightText = r.InsightText,
                    Category = r.Category,
                    CreatedAt = r.CreatedAt,
                    UserId = r.UserId
                }).ToList();

                // If no recommendations exist, trigger automatic generation
                if (!dtos.Any())
                {
                    var result = await GenerateRecommendationsAsync(userId);
                    return result;
                }

                return ApiResponse<List<AiRecommendationDto>>.Success(dtos, "AI insights retrieved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<AiRecommendationDto>>.Fail($"Failed to load AI insights: {ex.Message}");
            }
        }

        public async Task<ApiResponse<List<AiRecommendationDto>>> GenerateRecommendationsAsync(int userId)
        {
            try
            {
                // Delete previous insights to avoid clogging up with duplicates
                await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM dbo.AiRecommendations WHERE UserId = {0}", userId);

                var generatedInsights = new List<(string Text, string Category)>();

                // 1. ANALYZE FINANCE DATA
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .ToListAsync();

                if (transactions.Count == 0)
                {
                    generatedInsights.Add((
                        "💸 No financial records logged yet! Budget tracking is your secret ticket to financial freedom. Try logging a single expense or income log right now in the Finance module.",
                        "Finance"
                    ));
                }
                else
                {
                    var totalIncome = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
                    var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);
                    
                    if (totalIncome > 0)
                    {
                        var ratio = totalExpense / totalIncome;
                        if (ratio > 0.8m)
                        {
                            generatedInsights.Add((
                                $"⚠️ Cash Squeeze Alert! You are spending {ratio:P0} of your income. That's a bit high! Let's audit your subscription accounts this evening, plug the silent leaks, and challenge yourself to a 'no-spend weekend'. You've got this!",
                                "Finance"
                            ));
                        }
                        else
                        {
                            generatedInsights.Add((
                                $"💰 Wealth Builder Alert! Outstanding job—you spent only {ratio:P0} of your income! Since you have surplus capital, set up an automated transfer of just $50 to an index fund or savings vault. Let's make your money compound!",
                                "Finance"
                            ));
                        }
                    }
                }

                // 2. ANALYZE HEALTH DATA
                var healthLogs = await _context.HealthLogs
                    .Where(hl => hl.UserId == userId)
                    .ToListAsync();

                var waterLogs = healthLogs.Where(hl => hl.LogType == "Water").ToList();
                var workoutLogs = healthLogs.Where(hl => hl.LogType == "Workout").ToList();
                var sleepLogs = healthLogs.Where(hl => hl.LogType == "Sleep").ToList();
                var stepsLogs = healthLogs.Where(hl => hl.LogType == "Steps").ToList();

                if (waterLogs.Count == 0)
                {
                    generatedInsights.Add((
                        "💧 Dehydration causes severe brain fog and fatigue! Challenge: Put a 1.0L water flask on your desk *right now*. Drink half before lunch, and half after. Let's hit that 2,000ml goal today!",
                        "Health"
                    ));
                }
                else
                {
                    var avgWater = waterLogs.Average(wl => wl.LogValue);
                    if (avgWater < 2000)
                    {
                        generatedInsights.Add((
                            $"💧 Hydration Check: Your daily water average is {avgWater:N0}ml (target: 2,000ml). If you feel tired in the afternoon, chug a glass of water instead of coffee. Let's feed that brain!",
                            "Health"
                        ));
                    }
                    else
                    {
                        generatedInsights.Add((
                            $"🌟 Champion Hydration! You average {avgWater:N0}ml of water daily, maximizing physical energy and focus. Keep logging and keep that cup filled!",
                            "Health"
                        ));
                    }
                }

                if (sleepLogs.Count > 0)
                {
                    var avgSleep = sleepLogs.Average(sl => sl.LogValue);
                    if (avgSleep < 7)
                    {
                        generatedInsights.Add((
                            $"💤 Sleep Debt Alert: You are averaging {avgSleep:F1} hours of sleep (target: 7-9 hours). Short sleep impacts willpower and memory. Challenge: set a bedtime alarm for 10 PM and park your phone outside your room!",
                            "Health"
                        ));
                    }
                }

                if (stepsLogs.Count > 0)
                {
                    var avgSteps = stepsLogs.Average(sl => sl.LogValue);
                    if (avgSteps < 6000)
                    {
                        generatedInsights.Add((
                            $"🚶‍♂️ Movement Check: Your step count averages {avgSteps:N0} steps (target: 10,000). Add a 10-minute walk right after your next meal. It's a game-changer for digestion and mental clarity!",
                            "Health"
                        ));
                    }
                }

                if (workoutLogs.Count == 0)
                {
                    generatedInsights.Add((
                        "🏋️ Sedentary routines stall focus. Let's spark your heart rate: do 15 bodyweight squats right now, or walk around the block. Start logging 20 minutes of daily workout to raise your cognitive output!",
                        "Health"
                    ));
                }
                else
                {
                    var totalMinutes = workoutLogs.Sum(wl => wl.LogValue);
                    if (totalMinutes < 90)
                    {
                        generatedInsights.Add((
                            $"🏋️ Logged movement this week: {totalMinutes:N0} minutes. Aim for 150 minutes of active cardio to keep your metabolic health optimal. You're doing well, let's keep moving!",
                            "Health"
                        ));
                    }
                }

                // 3. ANALYZE PLANNER DATA
                var peEvents = await _context.PlannerEvents
                    .Where(pe => pe.UserId == userId)
                    .ToListAsync();

                var pendingTasks = peEvents.Where(t => !t.IsCompleted).ToList();
                if (pendingTasks.Count > 3)
                {
                    generatedInsights.Add((
                        $"⏱️ Action Beats Overwhelm! You have {pendingTasks.Count} pending tasks. Apply the '5-Minute Rule': pick the easiest task on your list, set a timer for 5 minutes, and do ONLY that. Action breeds motivation!",
                        "Productivity"
                    ));
                }

                // 4. ANALYZE CAREER DATA
                var jobApps = await _context.JobApplications
                    .Where(a => a.UserId == userId)
                    .ToListAsync();

                if (jobApps.Count > 0)
                {
                    var interviewing = jobApps.Count(a => a.Status == "Interviewing");
                    if (interviewing > 0)
                    {
                        generatedInsights.Add((
                            $"🚀 Interview Season! You have {interviewing} active interviews in progress. Focus: Record a mock video of yourself answering 'Walk me through your resume.' Tweak your eye contact and posture for an instant 2x confidence boost!",
                            "Career"
                        ));
                    }
                    else
                    {
                        generatedInsights.Add((
                            "💼 Job Hunt Tip: When applying, tweak your resume's core skills block to match at least 5 keywords in the job description. This helps your CV bypass ATS filters and lands you in human hands!",
                            "Career"
                        ));
                    }
                }

                // Fallback default insight if no other insights generated
                if (generatedInsights.Count == 0)
                {
                    generatedInsights.Add((
                        "🏆 Perfect Balance! All major life areas are tracked and aligned today. Continue logging your parameters daily to build compounding long-term habits. You're leading an intentional life!",
                        "General"
                    ));
                }

                // Persist new recommendations using Stored Procedure
                var results = new List<AiRecommendationDto>();
                foreach (var insight in generatedInsights)
                {
                    var idList = await _context.Database.SqlQueryRaw<decimal>(
                        "EXEC dbo.sp_CreateAiRecommendation @InsightText = {0}, @Category = {1}, @CreatedAt = {2}, @UserId = {3}",
                        insight.Text, insight.Category, DateTime.UtcNow, userId)
                        .ToListAsync();

                    var newId = (int)idList.FirstOrDefault();

                    results.Add(new AiRecommendationDto
                    {
                        Id = newId,
                        InsightText = insight.Text,
                        Category = insight.Category,
                        CreatedAt = DateTime.UtcNow,
                        UserId = userId
                    });
                }

                return ApiResponse<List<AiRecommendationDto>>.Success(results, "AI recommendations successfully regenerated.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<AiRecommendationDto>>.Fail($"Failed to generate AI insights: {ex.Message}");
            }
        }
    }
}
