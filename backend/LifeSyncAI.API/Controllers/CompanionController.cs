using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Responses;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CompanionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        // Thread-safe session storage to hold active conversation states for each user
        private static readonly ConcurrentDictionary<int, ChatSession> _sessions = new ConcurrentDictionary<int, ChatSession>();

        // Reusable static fallback routing rules mapping keywords to responsive answers
        private static readonly List<ConversationalRule> FallbackRules = new List<ConversationalRule>
        {
            new ConversationalRule(
                m => (m.Contains("score") || m.Contains("life")) && (m.Contains("increase") || m.Contains("improve") || m.Contains("boost") || m.Contains("better") || m.Contains("how")),
                ctx => {
                    var suggestions = new List<string>();
                    if (ctx.Water < 2000) suggestions.Add($"💧 Drink more water (you have logged only {ctx.Water}ml today, target is 2000ml)");
                    if (ctx.Workout < 30) suggestions.Add($"🏋️ Log exercise or workout (logged {ctx.Workout} minutes today)");
                    if (ctx.Sleep < 8) suggestions.Add($"💤 Aim for 7-8 hours of sleep (logged {ctx.Sleep} hours today)");
                    if (ctx.Steps < 10000) suggestions.Add($"🚶 Get more steps (logged {ctx.Steps} steps today)");
                    if (ctx.PendingTasks > 0) suggestions.Add($"📅 Complete tasks from your Planner (you have {ctx.PendingTasks} pending tasks)");
                    if (ctx.Balance <= 0) suggestions.Add($"💰 Log your transactions to improve net positive balance (current balance: ${ctx.Balance:N2})");

                    if (suggestions.Count > 0)
                    {
                        return $"Your current Life Score is **{ctx.LifeScore}/100**. Here are the best ways to boost it today:\n\n" + string.Join("\n", suggestions.Take(3).Select(s => $"- {s}")) + $"\n\nSmall daily changes lead to huge momentum, {ctx.UserName}! Which one will you start with?";
                    }
                    return $"Incredible job, {ctx.UserName}! Your Life Score is a perfect **{ctx.LifeScore}/100**! All your healthy habits and tasks are synced. Keep up this amazing momentum!";
                },
                "Supportive", "score"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "earn", "salary", "job", "career", "income", "money", "rich", "save", "spending", "savings", "investment", "investing"),
                ctx => {
                    var suggestions = new List<string>();
                    if (ctx.Balance <= 0)
                    {
                        suggestions.Add($"Keep a net positive budget inside your **Finance** logs (your current net balance is ${ctx.Balance:N2}).");
                    }
                    suggestions.Add("Apply to career postings and track updates under the **Career** dashboard to manage applications efficiently.");
                    suggestions.Add("Tackle high-priority tasks in your **Planner** to build skills and productivity routines.");

                    return $"To optimize your finances and grow your earnings, {ctx.UserName}, focus on tracking and execution:\n\n" + string.Join("\n", suggestions.Select((s, i) => $"{i+1}. {s}")) + "\n\nChecking your Planner or Career application tracker is a great place to start!";
                },
                "Analytical", "finance"
            ),
            new ConversationalRule(
                m => (HasExactWord(m, "don't", "not", "no", "stop", "exit", "cancel") && HasExactWord(m, "game", "play", "games")) || HasExactWord(m, "exit", "stop"),
                ctx => $"No worries at all, {ctx.UserName}! We'll keep it strictly conversational. Tell me, what else is on your mind? Are you working on a project, or did you want to review some of your logged statistics?",
                "Supportive", "none"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "nervous", "anxious", "stressed", "scared", "fear", "worry", "worried", "anxiety", "tension"),
                ctx => $"It is completely natural to feel nervous or stressed, {ctx.UserName}. 🫂 Take a slow, deep breath. Rushing through your task list won't help ease the tension. Try to pick just one tiny, manageable item to focus on, or close your screen and step away for a few minutes. You don't have to figure out everything right now. I'm right here with you. What is causing you the most tension today?",
                "Supportive", "feeling"
            ),
            new ConversationalRule(
                m => m.Contains("broke up") || m.Contains("breakup") || HasExactWord(m, "relationship", "heartbroken", "divorce", "alone"),
                ctx => $"I'm so sorry to hear that, {ctx.UserName}. 🫂 Going through a breakup is emotionally exhausting, and it is completely normal to feel distracted, hurt, or empty right now. Please be gentle with yourself. Don't worry about keeping up with perfect habits, schedules, or productivity goals today. Healing takes time. Take a deep breath, do something kind for yourself, and take it one hour at a time. Your emotional well-being is far more important than any score.",
                "Supportive", "feeling"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "fail", "failed", "failure", "lost", "mistake", "error", "screwed", "ruined"),
                ctx => $"Please don't be discouraged, {ctx.UserName}. Failure is not a reflection of your worth—it's simply feedback. Every developer, designer, and successful person has hit dead ends, failed milestones, and made mistakes. It's how we grow. Take a breath, analyze what went wrong without judging yourself, and pivot when you feel ready. I'm here to help you reorganize and try again. You've got this!",
                "Supportive", "feeling"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "motivation", "motivate", "inspirational", "inspire", "encouragement", "cheer"),
                ctx => $"Motivation gets you started, {ctx.UserName}, but consistent daily routines are what keep you moving forward. You don't need a huge wave of inspiration to make progress—you just need to take one tiny step. Look at your planner, tick off one quick task, or log a simple glass of water. Small wins build momentum. I believe in you, and I'm here to help you track your journey. Let's make progress together, one small win at a time!",
                "Supportive", "feeling"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "hi", "hii", "hiii", "hello", "hey", "yo", "sup", "greetings"),
                ctx => $"Hey {ctx.UserName}! 😊 Hope you're doing well today. I'm here as your conversational AI companion—we can chat about programming, discuss design patterns, review your LifeSync metrics, or play a quick game. What's on your mind today?",
                "Friendly", "greeting"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "react", "reactjs", "dotnet", "core", "c#", "csharp", "javascript", "code", "coding", "project", "build", "programming", "developer", "api", "database", "sql"),
                ctx => $"Building a full-stack project with ReactJS and .NET Core is an outstanding architectural choice! React handles the user interface beautifully via rich state management (like Redux or Zustand), while .NET Core serves as a high-performance backend, making EF Core database queries and API routing extremely fast.\n\nAre you currently working on setting up your API endpoints and controllers, connecting the frontend Axios client, or writing database schemas? Tell me a bit about your project structure—I can help you review code snippets or map out endpoints!",
                "Friendly", "coding"
            ),
            new ConversationalRule(
                m => m.Contains("doing") || HasExactWord(m, "who", "what") && m.Contains("you") || m.Contains("feeling") || HasExactWord(m, "feel") || m.Contains("how are you") || m.Contains("how is you"),
                ctx => $"I'm running smoothly as your LifeSync AI Companion! 🚀 As an AI, I don't experience physical fatigue or emotions, but seeing you organize your planner and hit your health goals keeps my systems fully optimized!\n\nI'm currently scanning your active modules to see if there's any statistics or logs we should go over. How are you holding up today? Are you feeling productive, or just taking things one step at a time?",
                "Supportive", "feeling"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "bored", "game", "play", "games", "time pass", "timepass"),
                ctx => $"If you're looking to take a quick break, I've got three text-based mini-games to help you pass the time:\n\n1. **Guess the Number** 🎲 (type 'guess')\n2. **Wellness & Productivity Quiz** 🏆 (type 'quiz')\n3. **The LifeSync Quest RPG** 🚀 (type 'quest')\n\nWhich one would you like to launch, {ctx.UserName}?",
                "Funny", "game"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "task", "tasks", "planner", "todo", "schedule", "event", "events"),
                ctx => ctx.UpcomingTasks.Any()
                    ? $"Here is the latest from your Planner, {ctx.UserName}. You currently have **{ctx.PendingTasks}** pending tasks. Your next three upcoming items:\n\n" + string.Join("\n", ctx.UpcomingTasks.Select((e, i) => $"{i + 1}. **{e.Title}** (Starts: {e.StartTime.ToLocalTime():g})")) + "\n\nToggling these off will give your productivity metrics a great boost! What's your plan for tackling them?"
                    : $"Your planner is completely clear, {ctx.UserName}! 🌟 You have 0 pending tasks logged right now. Great job keeping your schedule clean!",
                "Friendly", "data"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "balance", "transaction", "transactions", "spent", "expense", "expenses", "income", "money", "finance", "finances"),
                ctx => {
                    var recentText = ctx.RecentTransactions.Any() 
                        ? string.Join("\n", ctx.RecentTransactions.Select(t => $"- {t.Description}: {(t.Type == "Expense" ? "-" : "+")}${t.Amount}"))
                        : "No recent transactions found.";
                    return $"Checking your wallet logs! 💰 Your net balance stands at **${ctx.Balance:N2}**.\nToday's expenses: **${ctx.ExpensesToday:N2}**.\n\nYour 3 most recent transactions:\n{recentText}\n\nStaying consistent with your expense logs is one of the best ways to hit your savings goals. Are you tracking a specific monthly budget right now?";
                },
                "Analytical", "data"
            ),
            new ConversationalRule(
                m => HasExactWord(m, "water", "sleep", "step", "steps", "workout", "workouts", "health", "habit", "habits"),
                ctx => $"Here is your daily wellness scorecard, {ctx.UserName}:\n\n💧 **Water Intake**: {ctx.Water}ml logged\n💤 **Sleep Duration**: {ctx.Sleep} hours logged\n🚶 **Steps Taken**: {ctx.Steps} steps logged\n🏋️ **Workout Time**: {ctx.Workout} minutes logged\n\nStaying hydrated and getting 7-9 hours of sleep are vital for cognitive performance—especially during coding sessions! How are you feeling physically today?",
                "Supportive", "data"
            )
        };

        public CompanionController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("reset")]
        public ActionResult<ApiResponse<string>> ResetSession()
        {
            var userId = GetUserId();
            if (userId != 0)
            {
                _sessions.TryRemove(userId, out _);
            }
            return Ok(ApiResponse<string>.Success("Session reset.", "Session cleared successfully."));
        }

        [HttpPost("message")]
        public async Task<ActionResult<ApiResponse<CompanionResponseDto>>> SendMessage([FromBody] CompanionRequestDto dto)
        {
            var userId = GetUserId();
            if (userId == 0)
            {
                return Unauthorized(ApiResponse<CompanionResponseDto>.Fail("User is not authenticated."));
            }

            var session = _sessions.GetOrAdd(userId, _ => new ChatSession());
            var message = dto.Message.Trim();
            var messageLower = message.ToLower();
            var clientDateStr = Request.Headers["X-Client-Date"].ToString();
            var clientDate = DateTime.TryParse(clientDateStr, out var parsedDate) ? parsedDate : DateTime.UtcNow;
            var today = clientDate.Date;
            var tomorrow = today.AddDays(1);

            // Fetch user profile details
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var userName = user?.FullName ?? "Friend";

            // Gather dashboard statistics
            var waterToday = await _context.HealthLogs
                .Where(h => h.UserId == userId && h.LogType == "Water" && h.LogDate >= today && h.LogDate < tomorrow)
                .SumAsync(h => h.LogValue);

            var sleepToday = await _context.HealthLogs
                .Where(h => h.UserId == userId && h.LogType == "Sleep" && h.LogDate >= today && h.LogDate < tomorrow)
                .SumAsync(h => h.LogValue);

            var workoutToday = await _context.HealthLogs
                .Where(h => h.UserId == userId && h.LogType == "Workout" && h.LogDate >= today && h.LogDate < tomorrow)
                .SumAsync(h => h.LogValue);

            var stepsToday = await _context.HealthLogs
                .Where(h => h.UserId == userId && h.LogType == "Steps" && h.LogDate >= today && h.LogDate < tomorrow)
                .SumAsync(h => h.LogValue);

            var caloriesToday = await _context.HealthLogs
                .Where(h => h.UserId == userId && h.LogType == "Calories" && h.LogDate >= today && h.LogDate < tomorrow)
                .SumAsync(h => h.LogValue);

            var expensesToday = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" && t.Date >= today && t.Date < tomorrow)
                .SumAsync(t => t.Amount);

            var pendingTasks = await _context.PlannerEvents
                .Where(e => e.UserId == userId && !e.IsCompleted)
                .CountAsync();

            var todaysTasks = await _context.PlannerEvents
                .Where(e => e.UserId == userId && e.StartTime >= today && e.StartTime < tomorrow)
                .ToListAsync();

            int totalTasks = todaysTasks.Count;
            int completedTasks = todaysTasks.Count(e => e.IsCompleted);

            var balance = await _context.Transactions
                .Where(t => t.UserId == userId)
                .SumAsync(t => t.Type == "Income" ? t.Amount : -t.Amount);

            var upcomingTasks = await _context.PlannerEvents
                .Where(e => e.UserId == userId && !e.IsCompleted)
                .OrderBy(e => e.StartTime)
                .Take(3)
                .ToListAsync();

            var recentTransactions = await _context.Transactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .Take(3)
                .ToListAsync();

            var recentApps = await _context.JobApplications
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.AppliedDate)
                .Take(3)
                .ToListAsync();

            var recentAppsText = recentApps.Any() 
                ? string.Join(", ", recentApps.Select(a => $"{a.Position} at {a.Company} ({a.Status})"))
                : "No applications logged yet.";

            var vaultCount = await _context.VaultItems.Where(v => v.UserId == userId).CountAsync();

            var rec = await _context.AiRecommendations
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();
            var latestInsight = rec?.InsightText ?? "No recommendations compiled yet.";

            // Calculate Life Score exactly matching React frontend Dashboard.tsx formula
            double score = 0;

            bool hasWater = waterToday > 0;
            bool hasSleep = sleepToday > 0;
            bool hasSteps = stepsToday > 0;
            bool hasCalories = caloriesToday > 0;
            bool hasWorkout = workoutToday > 0;

            if (totalTasks > 0 || hasWater || hasSleep || hasSteps || hasCalories || hasWorkout)
            {
                score += 5;
            }

            if (totalTasks > 0)
            {
                score += ((double)completedTasks / totalTasks) * 15;
            }

            score += Math.Min(30, (waterToday / 2000.0) * 30);
            score += Math.Min(15, (workoutToday / 30.0) * 15);
            score += Math.Min(10, (sleepToday / 8.0) * 10);
            score += Math.Min(10, (stepsToday / 10000.0) * 10);
            score += caloriesToday > 0 ? 10 : 0;

            if (balance > 0)
            {
                score += 5;
            }
            else if (balance < 0)
            {
                score -= 5;
            }

            int lifeScore = Math.Max(0, Math.Min(100, (int)Math.Round(score)));

            string reply = "";
            string mood = "Friendly";

            // ----------------------------------------------------
            // 1. GAME ACTIVE STATES (SESSION STATE ROUTING)
            // ----------------------------------------------------
            if (session.ActiveGame == "guess_number")
            {
                if (messageLower == "exit" || messageLower == "stop" || messageLower == "cancel")
                {
                    session.ActiveGame = "none";
                    reply = $"Understood, {userName}! I've closed the guessing game. Let's get back to chatting. What's the main focus of your day today?";
                    mood = "Friendly";
                }
                else if (int.TryParse(messageLower, out int guess))
                {
                    session.GameGuessesCount++;
                    if (guess < session.GameTargetNumber)
                    {
                        reply = $"Too low! 📉 Try a higher number. (Attempts so far: {session.GameGuessesCount})";
                        mood = "Funny";
                    }
                    else if (guess > session.GameTargetNumber)
                    {
                        reply = $"Too high! 📈 Try a lower number. (Attempts so far: {session.GameGuessesCount})";
                        mood = "Funny";
                    }
                    else
                    {
                        reply = $"Spot on! 🎯 You got it, {userName}! The target number was {session.GameTargetNumber}. It took you {session.GameGuessesCount} attempts. You have great persistence! What's the next goal on your list today?";
                        session.ActiveGame = "none";
                        mood = "Friendly";
                    }
                }
                else
                {
                    reply = $"Please type a number between 1 and 50, or type 'exit' to stop the guessing game.";
                    mood = "Sassy";
                }
            }
            else if (session.ActiveGame == "quiz")
            {
                if (messageLower == "exit" || messageLower == "stop")
                {
                    session.ActiveGame = "none";
                    reply = $"No problem! I've closed the quiz. Let's return to our conversation. What full-stack project or tasks are you working on right now?";
                    mood = "Friendly";
                }
                else
                {
                    bool answerCorrect = false;
                    if (session.QuizQuestionIndex == 1 && (messageLower == "b" || messageLower.Contains("7-9")))
                    {
                        answerCorrect = true;
                        session.QuizScore++;
                    }
                    else if (session.QuizQuestionIndex == 2 && (messageLower == "a" || messageLower.Contains("2-minute")))
                    {
                        answerCorrect = true;
                        session.QuizScore++;
                    }
                    else if (session.QuizQuestionIndex == 3 && (messageLower == "b" || messageLower.Contains("2 liters")))
                    {
                        answerCorrect = true;
                        session.QuizScore++;
                    }

                    string feedback = answerCorrect 
                        ? "That's correct! 🌟 Nicely done." 
                        : $"Not quite! (Question {session.QuizQuestionIndex})";

                    if (session.QuizQuestionIndex == 1)
                    {
                        session.QuizQuestionIndex = 2;
                        reply = $"{feedback}\n\nHere is Question 2:\nWhat rule states that if a task takes less than 2 minutes to complete, you should do it immediately?\n\nA) The 2-Minute Rule\nB) The Pareto Principle\nC) Parkinson's Law\n\n(Type A, B, or C)";
                        mood = "Friendly";
                    }
                    else if (session.QuizQuestionIndex == 2)
                    {
                        session.QuizQuestionIndex = 3;
                        reply = $"{feedback}\n\nHere is Question 3:\nHow much water is generally recommended to drink daily for average adults?\n\nA) 500ml\nB) 2 Liters\nC) 5 Liters\n\n(Type A, B, or C)";
                        mood = "Friendly";
                    }
                    else
                    {
                        int finalScore = session.QuizScore;
                        session.ActiveGame = "none";
                        reply = $"{feedback}\n\n🏆 Quiz completed! You scored {finalScore}/3. Testing wellness knowledge is a great way to stay conscious of healthy habits. What's the plan for the rest of your day, {userName}?";
                        mood = "Supportive";
                    }
                }
            }
            else if (session.ActiveGame == "rpg")
            {
                if (messageLower == "exit" || messageLower == "stop")
                {
                    session.ActiveGame = "none";
                    reply = "Quest closed. We're back in standard conversation mode. What's next on your development checklist?";
                    mood = "Friendly";
                }
                else if (session.RpgChapter == 1)
                {
                    if (messageLower == "1" || messageLower.Contains("planner"))
                    {
                        session.RpgChapter = 2;
                        reply = "🌲 Path of the Planner selected. You walk down a structured valley where a massive 'Task Dragon' blocks your way. It asks: 'What is the secret key to successfully handling a massive, overwhelming workload?'\n\nA) Multitask and do everything at once\nB) Break tasks down into tiny, focused, and actionable sub-steps\nC) Procrastinate until tomorrow\n\n(Type A, B, or C)";
                        mood = "Supportive";
                    }
                    else if (messageLower == "2" || messageLower.Contains("finance"))
                    {
                        session.RpgChapter = 3;
                        reply = "💰 Path of Finance selected. You follow a trail of golden coins to a locked treasure chest. The chest carvings ask: 'What is the fundamental key to long-term financial security?'\n\nA) Spend everything immediately\nB) Budget regularly and consistently save a portion of income\nC) Hide it under the mattress\n\n(Type A, B, or C)";
                        mood = "Supportive";
                    }
                    else if (messageLower == "3" || messageLower.Contains("health"))
                    {
                        session.RpgChapter = 4;
                        reply = "💧 Path of Health selected. You follow a crystal clear river and find a dehydrated woodland elf. What do you do?\n\nA) Share your fresh water bottle\nB) Tell him to look for a river\nC) Ignore him and keep walking\n\n(Type A, B, or C)";
                        mood = "Supportive";
                    }
                    else
                    {
                        reply = "Please select a path by typing 1 (Planner), 2 (Finance), or 3 (Health).";
                        mood = "Sassy";
                    }
                }
                else
                {
                    bool success = false;
                    if (session.RpgChapter == 2 && messageLower == "b") success = true;
                    if (session.RpgChapter == 3 && messageLower == "b") success = true;
                    if (session.RpgChapter == 4 && messageLower == "a") success = true;

                    session.ActiveGame = "none";
                    if (success)
                    {
                        reply = "✨ Success! Your choice unlocks the portal. The air shimmers and transports you back to your LifeSync Dashboard, feeling refreshed, focused, and ready to conquer your goals! 🏆 Let me know what you want to work on next!";
                        mood = "Friendly";
                    }
                    else
                    {
                        reply = "💨 The portal remains sealed. The feedback loops guide you: 'Choose wisely in your daily routines.' You step through a side gate back to reality. Let's try again sometime! What's your focus today?";
                        mood = "Sassy";
                    }
                }
            }
            // ----------------------------------------------------
            // 2. REAL-TIME LLM CONVERSATION INTERACTION
            // ----------------------------------------------------
            else
            {
                var systemInstructions = $"You are the LifeSync AI Companion, a warm, supportive, and realistic companion. User name is {userName}. If the user asks how to increase their life score or improve metrics (e.g. 'how to earn more', 'how to increase score', 'what should I do next', 'how to increase it'), analyze today's statistics context below and provide specific, actionable suggestions based on their low metrics (e.g., suggesting drinking water if under 2000ml, logging exercise if workout is under 30m, completing pending tasks in the planner, or applying to jobs/managing budgets in career/finance modules to earn more). If the user is bored, suggest games ('guess' for Guess the Number, 'quiz' for Quiz, 'quest' for RPG Quest). If sad/depressed/breakup/failed, show deep empathy. Do NOT output role prefixes like 'Companion:' or 'Assistant:' in your responses.\n\n" +
                                         $"User statistics context today: Life Score: {lifeScore}/100, pending tasks: {pendingTasks}, balance: ${balance:N2}, expenses today: ${expensesToday:N2}, water: {waterToday}ml, sleep: {sleepToday}h, steps: {stepsToday}, active: {workoutToday}m, vault count: {vaultCount}, career apps: {recentAppsText}, AI recommendation: \"{latestInsight}\".";

                var messages = new List<object>
                {
                    new { role = "system", content = systemInstructions }
                };

                foreach (var h in session.History)
                {
                    messages.Add(new { role = h.Role, content = h.Content });
                }

                messages.Add(new { role = "user", content = message });

                try
                {
                    // Attempt to call the public keyless LLM API via POST
                    reply = await CallLlmAsync(messages);

                    // Clean up role prefixes if outputted
                    if (reply.StartsWith("Companion:", StringComparison.OrdinalIgnoreCase))
                        reply = reply.Substring("Companion:".Length).Trim();
                    if (reply.StartsWith("Assistant:", StringComparison.OrdinalIgnoreCase))
                        reply = reply.Substring("Assistant:".Length).Trim();
                    if (reply.StartsWith("User:", StringComparison.OrdinalIgnoreCase))
                        reply = reply.Substring("User:".Length).Trim();

                    // Infer simple mood from response contents
                    var lowerReply = reply.ToLower();
                    if (lowerReply.Contains("sorry") || lowerReply.Contains("hug") || lowerReply.Contains("breathe") || lowerReply.Contains("comfort"))
                        mood = "Supportive";
                    else if (lowerReply.Contains("cute") || lowerReply.Contains("match") || lowerReply.Contains("gorgeous") || lowerReply.Contains("😉"))
                        mood = "Flirty";
                    else if (lowerReply.Contains("haha") || lowerReply.Contains("joke") || lowerReply.Contains("lol") || lowerReply.Contains("😂"))
                        mood = "Funny";
                    else if (lowerReply.Contains("analyze") || lowerReply.Contains("stats") || lowerReply.Contains("balance") || lowerReply.Contains("report"))
                        mood = "Analytical";
                    else
                        mood = "Friendly";

                    // Save to history to preserve memory
                    session.History.Add(new LlmChatMessage { Role = "user", Content = message });
                    session.History.Add(new LlmChatMessage { Role = "assistant", Content = reply });
                    if (session.History.Count > 16)
                    {
                        session.History.RemoveRange(0, session.History.Count - 16);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"LLM endpoint failed: {ex.Message}. Falling back to rule-based dialog matcher.");

                    // FAULT TOLERANCE FALLBACK (Optimized declarative rule mapping)
                    var fallbackCtx = new FallbackContext
                    {
                        UserName = userName,
                        Water = (int)waterToday,
                        Sleep = (int)sleepToday,
                        Steps = (int)stepsToday,
                        Workout = (int)workoutToday,
                        PendingTasks = pendingTasks,
                        Balance = balance,
                        ExpensesToday = expensesToday,
                        UpcomingTasks = upcomingTasks,
                        RecentTransactions = recentTransactions,
                        LifeScore = lifeScore
                    };

                    var matchedRule = FallbackRules.FirstOrDefault(rule => rule.Match(messageLower));
                    if (matchedRule != null)
                    {
                        reply = matchedRule.GetReply(fallbackCtx);
                        mood = matchedRule.Mood;
                        session.LastTopic = matchedRule.Topic;
                    }
                    else
                    {
                        var generalReplies = new[]
                        {
                            $"That makes a lot of sense, {userName}. Full-stack development and daily productivity definitely require a lot of focus and mental energy. How are you thinking of structuring this part of your routine?",
                            $"I hear you! 😊 What's the biggest challenge you're facing with your goals or your codebase right now? I'd love to help you brainstorm solutions.",
                            $"Interesting perspective! Tell me a bit more about that, {userName}. By the way, let me know if you want to check your logs or just chat code."
                        };
                        reply = generalReplies[new Random().Next(generalReplies.Length)];
                        session.LastTopic = "none";
                    }
                }
            }

            return Ok(ApiResponse<CompanionResponseDto>.Success(new CompanionResponseDto
            {
                Reply = reply,
                Mood = mood,
                LifeScore = lifeScore
            }, "Response generated."));
        }

        private async Task<string> CallLlmAsync(List<object> messages)
        {
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(20);
                var payload = new
                {
                    messages = messages
                };
                
                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                
                var response = await client.PostAsync("https://text.pollinations.ai/", content);
                if (response.IsSuccessStatusCode)
                {
                    return (await response.Content.ReadAsStringAsync()).Trim();
                }
                throw new Exception($"LLM API returned status code {response.StatusCode}");
            }
        }

        private static bool HasExactWord(string messageLower, params string[] targetWords)
        {
            var words = messageLower.Split(new[] { ' ', '?', '!', ',', '.', '-', '_', '/' }, StringSplitOptions.RemoveEmptyEntries);
            return targetWords.Any(tw => words.Contains(tw));
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }

    // Helper classes for optimized declarative dialog rules
    internal class ConversationalRule
    {
        public Func<string, bool> Match { get; }
        public Func<FallbackContext, string> GetReply { get; }
        public string Mood { get; }
        public string Topic { get; }

        public ConversationalRule(Func<string, bool> match, Func<FallbackContext, string> getReply, string mood, string topic)
        {
            Match = match;
            GetReply = getReply;
            Mood = mood;
            Topic = topic;
        }
    }

    internal class FallbackContext
    {
        public string UserName { get; set; } = string.Empty;
        public int Water { get; set; }
        public int Sleep { get; set; }
        public int Steps { get; set; }
        public int Workout { get; set; }
        public int PendingTasks { get; set; }
        public decimal Balance { get; set; }
        public decimal ExpensesToday { get; set; }
        public List<PlannerEvent> UpcomingTasks { get; set; } = new List<PlannerEvent>();
        public List<Transaction> RecentTransactions { get; set; } = new List<Transaction>();
        public int LifeScore { get; set; }
    }

    public class ChatSession
    {
        public string ActiveGame { get; set; } = "none"; // "none", "guess_number", "quiz", "rpg"
        public int GameTargetNumber { get; set; }
        public int GameGuessesCount { get; set; }
        public int QuizScore { get; set; }
        public int QuizQuestionIndex { get; set; }
        public int RpgChapter { get; set; }
        public string LastTopic { get; set; } = "none";
        public List<LlmChatMessage> History { get; set; } = new List<LlmChatMessage>();
    }

    public class LlmChatMessage
    {
        public string Role { get; set; } = string.Empty; // "user" or "assistant"
        public string Content { get; set; } = string.Empty;
    }

    public class CompanionRequestDto
    {
        public string Message { get; set; } = string.Empty;
    }

    public class CompanionResponseDto
    {
        public string Reply { get; set; } = string.Empty;
        public string Mood { get; set; } = string.Empty;
        public int LifeScore { get; set; }
    }
}
