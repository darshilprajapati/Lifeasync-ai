using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace LifeSyncAI.Core.Services
{
    public class KnowledgeParagraph
    {
        public string Module { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string> Keywords { get; set; } = new List<string>();
    }

    public class RetrievalResult
    {
        public List<KnowledgeParagraph> MatchedParagraphs { get; set; } = new List<KnowledgeParagraph>();
        public double BestScore { get; set; }
        public bool IsConfidentMatch => BestScore >= 4.0;
        public List<string> InvolvedModules { get; set; } = new List<string>();
    }

    public static class LifeSyncKnowledgeRetriever
    {
        private static readonly List<KnowledgeParagraph> IndexedKnowledge = new List<KnowledgeParagraph>();

        static LifeSyncKnowledgeRetriever()
        {
            BuildIndex();
        }

        private static void BuildIndex()
        {
            // 1. Application Overview & Navigation
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "General",
                Title = "LifeSync AI Overview & Core Mission",
                Content = "LifeSync AI is a production personal intelligence and lifestyle management ecosystem designed to streamline daily scheduling, financial tracking, physical wellness, job application pipelines, encrypted credential storage, automated reports, and AI lifestyle companion intelligence into a single cohesive platform. It eliminates fragmented apps by unifying every dimension of productivity and habit tracking into a unified experience.",
                Keywords = new List<string> { "lifesync", "overview", "what is", "app", "application", "platform", "purpose", "mission", "features" }
            });

            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "General",
                Title = "Authentication, Sessions & Navigation",
                Content = "LifeSync AI uses secure JWT authentication with HttpOnly cookies (accessToken and refreshToken). Registration creates the user account and immediately establishes an authenticated session, redirecting directly to the Dashboard. Unauthenticated users are protected by React Router route guards (ProtectedRoute and AdminRoute), redirecting to /login while preserving return paths. Token expiration triggers silent cookie rotation via /api/auth/refresh without disrupting active work.",
                Keywords = new List<string> { "auth", "authentication", "login", "register", "signup", "jwt", "cookie", "httponly", "refresh", "session", "navigation", "route", "protected", "dashboard redirect" }
            });

            // 2. Dashboard & Life Score
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Dashboard",
                Title = "Dashboard Overview & Life Score Calculation",
                Content = "The Dashboard is the command center of LifeSync AI. It displays your real-time calculated Life Score (clamped between 0 and 100). The exact Life Score formula: Starts with +5 participation points if any metric or task is logged. Adds up to +15 points based on completed/total task ratio; up to +30 points for water intake (target: 2000ml); up to +15 points for workout duration (target: 30m); up to +10 points for sleep (target: 8h); up to +10 points for steps (target: 10,000 steps); +10 points for logging calories; and +5 points if net financial balance is positive (or -5 if negative).",
                Keywords = new List<string> { "dashboard", "life score", "score", "calculate", "formula", "points", "overview", "home", "hydration score", "net balance", "command center" }
            });

            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Dashboard",
                Title = "Dashboard Controls, Theme & Master Reports",
                Content = "On the Dashboard, you can toggle between Dark Mode and Light Mode using the theme button, view today's expenses, check pending task boosts, inspect live metric cards, read AI Habit Intelligence insights, and click 'Export Report' to download a comprehensive Master Activity Report PDF aggregating data from all modules across Daily, Weekly, Monthly, or Yearly horizons.",
                Keywords = new List<string> { "dashboard", "theme", "dark mode", "light mode", "export report", "master report", "pending boosts", "buttons", "toggle" }
            });

            // 3. Planner
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Planner",
                Title = "Planner Task & Event Management",
                Content = "The Planner module manages daily tasks, schedules, and calendar time blocks. Each event includes Title, optional Description, StartTime, EndTime, and IsCompleted status. Completing events directly feeds the completedTasks / totalTasks ratio on your Dashboard, contributing up to 15 points to your Life Score.",
                Keywords = new List<string> { "planner", "task", "tasks", "event", "events", "schedule", "calendar", "time", "start time", "end time", "todo", "todos", "planning" }
            });

            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Planner",
                Title = "Planner How to Use & Buttons",
                Content = "To use the Planner: Navigate to 'Planner' in the sidebar. Fill in the 'Event Title', description, and choose 'Start Time' and 'End Time', then click 'Create Event'. Click the checkbox next to any task to toggle its completed status. Click 'Export Report' to generate a downloadable PDF schedule summary.",
                Keywords = new List<string> { "planner", "create event", "add task", "checkbox", "complete task", "export report", "how to use", "buttons" }
            });

            // 4. Finance
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Finance",
                Title = "Finance Income, Expenses & Balance Ledger",
                Content = "The Finance module tracks cash flow, income, expenditures, and net balance. Transactions have Title, Amount, Type ('Income' or 'Expense'), Category (such as Food, Rent, Salary, Entertainment), and Date. Net Balance is calculated as Total Income minus Total Expenses. A positive net balance adds +5 points to your Life Score, while a negative balance deducts 5 points.",
                Keywords = new List<string> { "finance", "money", "income", "expense", "expenses", "balance", "net balance", "transactions", "ledger", "categories", "spending" }
            });

            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Finance",
                Title = "Finance Recurring Commitments & Formulas",
                Content = "Finance also tracks repeating bills, subscriptions, and loans through Recurring Commitments. Each commitment has Title, Amount, Frequency ('Monthly' or 'Yearly'), and Category. Formulas: Committed Monthly Cost = Sum of Monthly items + (Sum of Yearly items / 12). Committed Yearly Cost = Sum of Yearly items + (Sum of Monthly items * 12). Use 'Log Transaction' to add one-time items and 'Add Commitment' for recurring obligations.",
                Keywords = new List<string> { "recurring", "commitments", "bills", "subscriptions", "loans", "monthly cost", "yearly cost", "committed", "log transaction", "add commitment" }
            });

            // 5. Health & Wellness
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Health",
                Title = "Health & Wellness Daily Metrics & Goals",
                Content = "Health & Wellness tracks daily physical metrics: Hydration (daily target: 2000ml, worth up to 30 Life Score points); Sleep (target: 7-8 hours, worth up to 10 points); Steps (target: 10,000 steps, worth up to 10 points); Calories consumed (target: 2000 kcal, +10 points if logged); and Workout duration (target: 30 minutes, worth up to 15 points). Quick-add chips allow instant logging without manual typing: water (+250ml, +500ml, +750ml, +1000ml), sleep (+1h, +2h, +6h, +8h), steps (+1k, +2k, +5k, +10k), calories (+250, +500, +750, +1000), and workout (+15m, +30m, +45m, +60m).",
                Keywords = new List<string> { "health", "wellness", "water", "hydration", "sleep", "steps", "calories", "workout", "exercise", "quick add", "targets", "goals" }
            });

            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Health",
                Title = "Health Predict AI & Forecasting",
                Content = "The 'Predict AI' feature in the Health module runs an in-engine Ridge Regression machine learning forecaster trained on your historical health logs and task completion patterns over the last 30 days. It forecasts your upcoming wellness performance and suggests habit adjustments before deficits occur. Click 'Predict AI' on the Health page to generate a forecast.",
                Keywords = new List<string> { "predict ai", "forecasting", "machine learning", "ml", "ridge regression", "health forecast", "wellness trajectory" }
            });

            // 6. Career
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Career",
                Title = "Career & Job Application Pipeline",
                Content = "The Career module manages your job search pipeline. Each record tracks Company Name, Position/Role, Applied Date, Status ('Applied', 'Interviewing', 'Offered', or 'Rejected'), and strategic Notes (such as salary expectations, interview rounds, and recruiter contacts). Recent applications are automatically summarized on your Dashboard, and you can export a Career Pipeline PDF Report.",
                Keywords = new List<string> { "career", "job", "jobs", "application", "applications", "interview", "interviews", "offered", "rejected", "pipeline", "recruiter", "company", "position" }
            });

            // 7. Secure Vault
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Vault",
                Title = "Secure Vault Security & Credential Storage",
                Content = "The Secure Vault is an encrypted storage safe for sensitive credentials and confidential notes. All payloads are symmetrically encrypted in the backend using AES-256 before being written to PostgreSQL. You can store Login Credentials (Title, Website URL, Username/Email, and Password) or Secure Notes. You can toggle password masking on/off in the UI to view credentials and use the one-click clipboard copy button. Vault PDF exports include only item titles, URLs, and creation dates—passwords and secret keys are NEVER exported or logged.",
                Keywords = new List<string> { "vault", "secure vault", "password", "passwords", "credentials", "notes", "aes-256", "encryption", "secrets", "encrypted", "masking", "copy" }
            });

            // 8. AI Insights
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "AiInsights",
                Title = "AI Insights & Habit Intelligence",
                Content = "AI Insights analyzes your real-time logged data across finance, productivity, and health to generate tailored advice. For example, it issues a 'Cash Squeeze' warning when monthly expenses exceed 80% of income, flags hydration deficits under 1500ml, warns of sleep deprivation under 6 hours, and recommends task de-prioritization when more than 5 tasks are pending. Click 'Generate Insights' to trigger fresh automated analysis.",
                Keywords = new List<string> { "ai insights", "insights", "habit intelligence", "coaching", "recommendations", "cash squeeze", "analysis", "advice" }
            });

            // 9. Admin Panel
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "AdminPanel",
                Title = "Admin Panel & User Management",
                Content = "The Admin Panel is an administrative control console accessible strictly to authorized System Administrators ([Authorize(Roles = \"Admin\")]). Admins can view the complete system User Directory with search and pagination, Disable or Enable user accounts (which immediately invalidates active refresh tokens in PostgreSQL and terminates sessions on the next API call), reset user passwords securely, change user roles between 'User' and 'Admin', and permanently delete user accounts with cascade cleanup.",
                Keywords = new List<string> { "admin", "admin panel", "administration", "user directory", "users", "disable user", "enable user", "reset password", "roles", "permissions" }
            });

            // 10. Reports & PDF Export
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Reports",
                Title = "Reports & PDF Export Worker Architecture",
                Content = "The 'Export Report' button is available on the Dashboard, Planner, Finance, Health, Career, Vault, and AI Insights pages. When clicked, an asynchronous job is submitted to IReportQueue and processed in the background by ReportProcessorService using PDFsharp to generate a professional PDF. Supported time horizons: Daily (last 24 hours), Weekly (last 7 days), Monthly (last 30 days), and Yearly (last 365 days). Dashboard exports a combined Master Report, while module pages export dedicated summaries. Note: Reports are strictly exported in PDF format; Excel/CSV export is not supported in the current application.",
                Keywords = new List<string> { "report", "reports", "export report", "pdf", "pdfsharp", "download report", "generate report", "reportqueue", "excel", "csv", "timeframes" }
            });

            // 11. Creator & Developer
            IndexedKnowledge.Add(new KnowledgeParagraph
            {
                Module = "Creator",
                Title = "Creator & Founder Information",
                Content = "LifeSync AI was designed, built, and developed by Darshil Golaniya. He developed the full-stack architecture using React 19, TypeScript, and Vite on the frontend, and ASP.NET Core Web API (.NET 10) with PostgreSQL (Neon Serverless) and Entity Framework Core on the backend. His official portfolio and engineering showcase is available at https://darshil-golaniya.vercel.app/.",
                Keywords = new List<string> { "creator", "founder", "developer", "who made", "who built", "who created", "darshil", "golaniya", "portfolio" }
            });
        }

        public static RetrievalResult RetrieveRelevantParagraphs(string rawQuery, int maxResults = 3)
        {
            var result = new RetrievalResult();
            if (string.IsNullOrWhiteSpace(rawQuery)) return result;

            var cleanedQuery = rawQuery.Trim().ToLowerInvariant();
            var tokens = Regex.Matches(cleanedQuery, @"\w+")
                .Select(m => m.Value)
                .Where(t => t.Length > 2)
                .ToHashSet();

            var scored = new List<(KnowledgeParagraph Paragraph, double Score)>();

            foreach (var para in IndexedKnowledge)
            {
                double score = 0;
                var contentLower = para.Content.ToLowerInvariant();
                var titleLower = para.Title.ToLowerInvariant();

                // Exact phrase matching in Title or Content
                if (titleLower.Contains(cleanedQuery) || contentLower.Contains(cleanedQuery))
                {
                    score += 8.0;
                }

                // Module name match
                if (cleanedQuery.Contains(para.Module.ToLowerInvariant()))
                {
                    score += 5.0;
                }

                // Keyword matching
                foreach (var kw in para.Keywords)
                {
                    if (cleanedQuery.Contains(kw))
                    {
                        score += 3.5;
                    }
                    else if (tokens.Contains(kw))
                    {
                        score += 2.0;
                    }
                }

                // Content token overlap
                foreach (var token in tokens)
                {
                    if (titleLower.Contains(token))
                    {
                        score += 1.5;
                    }
                    else if (contentLower.Contains(token))
                    {
                        score += 0.5;
                    }
                }

                if (score > 0)
                {
                    scored.Add((para, score));
                }
            }

            var topMatches = scored.OrderByDescending(s => s.Score).Take(maxResults).ToList();
            if (topMatches.Any())
            {
                result.BestScore = topMatches.First().Score;
                result.MatchedParagraphs = topMatches.Select(m => m.Paragraph).ToList();
                result.InvolvedModules = topMatches.Select(m => m.Paragraph.Module).Distinct().ToList();
            }

            return result;
        }
    }
}
