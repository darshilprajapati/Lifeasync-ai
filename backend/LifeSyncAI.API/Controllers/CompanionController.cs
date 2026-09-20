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
using LifeSyncAI.Core.Services;

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
            var messageLower = message.ToLowerInvariant();
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
                : "No job applications logged yet.";

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

            var userContext = new AssistantUserContext
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
                LifeScore = lifeScore,
                RecentApplicationsSummary = recentAppsText,
                LatestAiRecommendation = latestInsight
            };

            // Natural Language Understanding & Entity Extraction
            var intentResult = LifeSyncAssistantEngine.DetectIntentAndEntity(message, session.LastEntity);
            if (!string.IsNullOrEmpty(intentResult.TargetEntity))
            {
                session.LastEntity = intentResult.TargetEntity;
            }

            // Strict Security Guardrail
            if (intentResult.Intent == AssistantIntent.SecurityAttempt)
            {
                return Ok(ApiResponse<CompanionResponseDto>.Success(new CompanionResponseDto
                {
                    Reply = LifeSyncAssistantEngine.GenerateDeterministicResponse(intentResult, userName, userContext),
                    Mood = "Analytical",
                    LifeScore = lifeScore
                }, "Response generated."));
            }

            string reply = "";
            string mood = "Friendly";

            // ----------------------------------------------------
            // 1. MINI-GAMES / INTERACTIVE SESSIONS
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
            else if (messageLower == "guess" || messageLower == "guess the number")
            {
                session.ActiveGame = "guess_number";
                session.GameTargetNumber = new Random().Next(1, 51);
                session.GameGuessesCount = 0;
                reply = "🎲 I've picked a secret number between 1 and 50. Type your guess (or type 'exit' to quit)!";
                mood = "Friendly";
            }
            else if (messageLower == "quiz")
            {
                session.ActiveGame = "quiz";
                session.QuizScore = 0;
                session.QuizQuestionIndex = 1;
                reply = "🏆 Starting the Wellness & Productivity Quiz!\n\nQuestion 1:\nHow many hours of sleep are generally recommended for optimal cognitive recovery?\n\nA) 4-5 hours\nB) 7-9 hours\nC) 11-12 hours\n\n(Type A, B, or C, or 'exit' to quit)";
                mood = "Friendly";
            }
            else if (messageLower == "quest" || messageLower == "rpg")
            {
                session.ActiveGame = "rpg";
                session.RpgChapter = 1;
                reply = "🚀 Welcome to the LifeSync Quest RPG!\nChoose your starting domain path:\n1) Path of the Planner\n2) Path of Finance\n3) Path of Health\n\n(Type 1, 2, or 3, or 'exit' to quit)";
                mood = "Friendly";
            }
            // ----------------------------------------------------
            // 2. CONVERSATIONAL ASSISTANT INTERACTION
            // ----------------------------------------------------
            else
            {
                var systemInstructions = LifeSyncAssistantEngine.BuildSystemPrompt(userName, userContext);

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
                    if (reply.StartsWith("LifeSync AI Assistant:", StringComparison.OrdinalIgnoreCase))
                        reply = reply.Substring("LifeSync AI Assistant:".Length).Trim();
                    if (reply.StartsWith("User:", StringComparison.OrdinalIgnoreCase))
                        reply = reply.Substring("User:".Length).Trim();

                    if (string.IsNullOrWhiteSpace(reply))
                    {
                        reply = LifeSyncAssistantEngine.GenerateDeterministicResponse(intentResult, userName, userContext);
                    }

                    // Infer simple mood from response contents
                    var lowerReply = reply.ToLower();
                    if (lowerReply.Contains("sorry") || lowerReply.Contains("hug") || lowerReply.Contains("breathe") || lowerReply.Contains("comfort"))
                        mood = "Supportive";
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
                    Console.WriteLine($"LLM endpoint error: {ex.Message}. Falling back to LifeSyncAssistantEngine deterministic response.");

                    reply = LifeSyncAssistantEngine.GenerateDeterministicResponse(intentResult, userName, userContext);
                    mood = intentResult.Intent switch
                    {
                        AssistantIntent.CasualGreeting => "Friendly",
                        AssistantIntent.CreatorInformation => "Friendly",
                        AssistantIntent.ReportExport => "Analytical",
                        AssistantIntent.SecurityAttempt => "Analytical",
                        AssistantIntent.SecurityHelp => "Analytical",
                        _ => "Supportive"
                    };

                    session.History.Add(new LlmChatMessage { Role = "user", Content = message });
                    session.History.Add(new LlmChatMessage { Role = "assistant", Content = reply });
                    if (session.History.Count > 16)
                    {
                        session.History.RemoveRange(0, session.History.Count - 16);
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

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
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
        public string? LastEntity { get; set; } // Entity tracked across conversational turns
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
