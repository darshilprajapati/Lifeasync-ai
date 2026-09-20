using System;
using System.Collections.Generic;

namespace LifeSyncAI.Core.Services
{
    public class ModuleKnowledge
    {
        public string Name { get; set; } = string.Empty;
        public List<string> Aliases { get; set; } = new List<string>();
        public string WhatItIs { get; set; } = string.Empty;
        public List<string> WhatYouCanDo { get; set; } = new List<string>();
        public string HowItHelps { get; set; } = string.Empty;
        public string HowToUse { get; set; } = string.Empty;
        public string ButtonsAndActions { get; set; } = string.Empty;
        public string ExactFormulasOrTech { get; set; } = string.Empty;
    }

    public static class LifeSyncKnowledgeBase
    {
        public const string AssistantName = "LifeSync AI Assistant";
        public const string CreatorName = "Darshil Golaniya";
        public const string CreatorPortfolioUrl = "https://darshil-golaniya.vercel.app/";
        public const string TechStackDescription = "Frontend built with React 19, TypeScript, and Vite; backend powered by ASP.NET Core Web API (.NET 10) with Entity Framework Core and PostgreSQL (Neon).";

        public const string AppOverview = 
            "LifeSync AI is an all-in-one personal productivity and life-intelligence platform. " +
            "It unites daily planning, personal finance tracking, health and wellness metrics, job application pipelines, " +
            "a secure credential vault, and data-backed AI insights into a single cohesive dashboard, " +
            "helping you organize, understand, and elevate every dimension of your personal life.";

        public static readonly Dictionary<string, ModuleKnowledge> Modules = new Dictionary<string, ModuleKnowledge>(StringComparer.OrdinalIgnoreCase)
        {
            ["Dashboard"] = new ModuleKnowledge
            {
                Name = "Dashboard",
                Aliases = new List<string> { "dashboard", "home", "overview", "summary", "life score", "net balance", "hydration score", "daily summary", "pending boosts" },
                WhatItIs = "The Dashboard is the central command center of LifeSync AI, aggregating your daily performance, tasks, and wellness metrics into an actionable overview.",
                WhatYouCanDo = new List<string>
                {
                    "View your real-time calculated Life Score (0–100)",
                    "Track your overall Net Balance and today's expenses",
                    "Monitor your Hydration Score, daily sleep duration, step count, and calories",
                    "Check total tasks and pending task boosts",
                    "Read automated AI Habit Intelligence suggestions",
                    "Export a comprehensive Master Activity Report (PDF)"
                },
                HowItHelps = "It removes guesswork by synthesizing your financial, productivity, and wellness metrics into a single score, showing you exactly where to focus each day.",
                HowToUse = "Click 'Dashboard' in the sidebar navigation to view your live Life Score and daily stats, check pending boosts, or download the Master Activity Report.",
                ButtonsAndActions = "'Export Report' (generates a comprehensive master PDF covering all modules over Daily, Weekly, Monthly, or Yearly horizons), and 'Toggle Theme' (switches between Light and Dark mode).",
                ExactFormulasOrTech = "Life Score Formula: Starts with +5 participation points if any metric or task is logged. Adds up to +15 based on completed/total task ratio; up to +30 for water intake (target: 2000ml); up to +15 for workout duration (target: 30m); up to +10 for sleep (target: 8h); up to +10 for steps (target: 10,000 steps); +10 for logging calories; and +5 if net financial balance is positive (or -5 if negative). Final score is clamped between 0 and 100."
            },

            ["Planner"] = new ModuleKnowledge
            {
                Name = "Planner",
                Aliases = new List<string> { "planner", "task", "tasks", "event", "events", "schedule", "calendar", "daily planning", "todo", "todos", "planning" },
                WhatItIs = "Planner is LifeSync's task and event management system designed to organize your daily schedule, time blocks, and priorities.",
                WhatYouCanDo = new List<string>
                {
                    "Schedule tasks and calendar events with start and end timestamps",
                    "Mark tasks as completed to boost your productivity score",
                    "Delete or reschedule events",
                    "View your schedule timeline organized chronologically",
                    "Export a detailed Planner Activity PDF Report"
                },
                HowItHelps = "It prevents overcommitment and procrastination by keeping daily priorities visible and directly connecting task completion to your Life Score.",
                HowToUse = "Navigate to 'Planner' from the sidebar. Fill in the 'Event Title', optional description, and select 'Start Time' and 'End Time', then click 'Create Event'. Check off events as you complete them.",
                ButtonsAndActions = "'Create Event' / 'Add Task' (creates and persists a scheduled item), task completion checkbox (toggles IsCompleted status), and 'Export Report' (generates Planner PDF).",
                ExactFormulasOrTech = "Events have Title, Description, StartTime, EndTime, and IsCompleted status. Completing events directly feeds the completedTasks / totalTasks ratio on your Dashboard, contributing up to 15 points to your Life Score."
            },

            ["Finance"] = new ModuleKnowledge
            {
                Name = "Finance",
                Aliases = new List<string> { "finance", "money", "expenses", "expense", "income", "budget", "balance", "transactions", "transaction", "ledger", "bills", "loans", "recurring" },
                WhatItIs = "Finance is a comprehensive personal expense tracker, ledger, and cash-flow analyzer that tracks income, expenditures, and committed bills.",
                WhatYouCanDo = new List<string>
                {
                    "Log income and expense transactions with categories and dates",
                    "Monitor real-time Total Income, Total Expenses, and Net Balance",
                    "Track recurring commitments (bills, subscriptions, loans)",
                    "View calculated Committed Monthly Cost and Committed Yearly Cost",
                    "Review income vs expense breakdown charts and transaction history",
                    "Export a downloadable Finance PDF Report"
                },
                HowItHelps = "It brings total transparency to your spending habits, highlights silent subscription leaks, and ensures you maintain a healthy savings buffer.",
                HowToUse = "Open 'Finance' from the sidebar. Use 'Log Transaction' to record an expense or income with amount, category, and date. Use 'Add Recurring Commitment' to track repeating monthly or yearly bills.",
                ButtonsAndActions = "'Log Transaction' (records income/expense), 'Add Commitment' (records recurring bill/loan), delete transaction button, and 'Export Report' (downloads financial PDF).",
                ExactFormulasOrTech = "Net Balance = Total Income - Total Expenses. Committed Monthly Cost = Sum of Monthly recurring items + (Sum of Yearly items / 12). Committed Yearly Cost = Sum of Yearly items + (Sum of Monthly items * 12)."
            },

            ["Health"] = new ModuleKnowledge
            {
                Name = "Health & Wellness",
                Aliases = new List<string> { "health", "wellness", "water", "hydration", "sleep", "steps", "calories", "workout", "fitness", "predict ai", "forecaster" },
                WhatItIs = "Health & Wellness is a holistic daily physical metric tracker equipped with an AI Wellness Forecaster.",
                WhatYouCanDo = new List<string>
                {
                    "Log water intake (quick buttons: +250ml, +500ml, +750ml, +1000ml)",
                    "Track sleep duration (quick buttons: +1h, +2h, +6h, +8h)",
                    "Record steps walked (quick buttons: +1k, +2k, +5k, +10k steps)",
                    "Log calories consumed (quick buttons: +250, +500, +750, +1000 kcal)",
                    "Record workout duration (quick buttons: +15m, +30m, +45m, +60m)",
                    "Run 'Predict AI' to forecast upcoming wellness performance",
                    "Export a detailed Health Activity PDF Report"
                },
                HowItHelps = "It maintains physical energy, cognitive focus, and workout consistency by providing friction-free logging and predictive wellness forecasting.",
                HowToUse = "Navigate to 'Health' from the sidebar. Click any quick-add chip (+250ml, +1h sleep, etc.) or enter an amount to record daily metrics. Click 'Predict AI' to run a machine-learning forecast.",
                ButtonsAndActions = "Quick-add increment chips (+250, +500, +1h, etc.), 'Reset' / 'Log' buttons, 'Predict AI' button, and 'Export Report'.",
                ExactFormulasOrTech = "Hydration target is 2000ml (earns up to 30 Life Score points). Sleep target is 7-8 hours (up to 10 points). Steps target is 10,000 (up to 10 points). Workout target is 30 minutes (up to 15 points). The 'Predict AI' feature runs an in-engine Ridge Regression machine-learning model trained on your last 30 days of health and task logs to predict your wellness trajectory."
            },

            ["Career"] = new ModuleKnowledge
            {
                Name = "Career & Job Tracker",
                Aliases = new List<string> { "career", "job", "jobs", "job tracker", "applications", "application", "interviews", "interview", "pipeline", "job search" },
                WhatItIs = "Career is an application pipeline tracker designed to organize your job search, interview stages, and recruiter follow-ups.",
                WhatYouCanDo = new List<string>
                {
                    "Log job applications with Company Name, Position/Role, and Applied Date",
                    "Track pipeline stages: 'Applied', 'Interviewing', 'Offered', and 'Rejected'",
                    "Save strategic pipeline notes, interview tips, and salary expectations",
                    "Update status as you progress through interview stages",
                    "Export a Career Pipeline PDF Report"
                },
                HowItHelps = "It removes chaos from the job hunt, ensuring you never miss an interview follow-up or lose track of application dates and notes.",
                HowToUse = "Navigate to 'Career' from the sidebar. Enter the company, job position, application date, status, and any notes in 'Track Application', then submit. Drag or update statuses as interviews progress.",
                ButtonsAndActions = "'Track Application' (submits a new pipeline entry), status dropdown selector ('Applied', 'Interviewing', 'Offered', 'Rejected'), delete application, and 'Export Report'.",
                ExactFormulasOrTech = "Stores Company, Position, Status ('Applied', 'Interviewing', 'Offered', 'Rejected'), AppliedDate, and Notes. Recent application activity is automatically summarized on the Dashboard and integrated into Master Reports."
            },

            ["Vault"] = new ModuleKnowledge
            {
                Name = "Secure Vault",
                Aliases = new List<string> { "vault", "password", "passwords", "credentials", "credential", "secure notes", "secret", "secrets", "aes", "encryption" },
                WhatItIs = "Secure Vault is an encrypted digital safe for securely storing passwords, private keys, API tokens, and confidential notes.",
                WhatYouCanDo = new List<string>
                {
                    "Store Login Credentials (Title, Website URL, Username/Email, and Password)",
                    "Save encrypted Secure Notes for confidential memos or private keys",
                    "Toggle password masking on/off in the UI to view credentials securely",
                    "Copy credentials to clipboard with one click",
                    "Export a Vault Inventory PDF Report (metadata only—never reveals secrets!)"
                },
                HowItHelps = "It provides a secure, private repository for critical credentials directly inside your daily workflow, eliminating scattered plain-text notes.",
                HowToUse = "Go to 'Vault' in the sidebar. Select 'Login Credentials' or 'Secure Note', fill in the title, URL, username, and password, then click 'Save Encrypted'.",
                ButtonsAndActions = "'Save Encrypted' (encrypts and saves item), eye toggle button (reveals/masks decrypted password), copy-to-clipboard button, and 'Export Report'.",
                ExactFormulasOrTech = "Security Architecture: All sensitive payload strings are symmetrically encrypted in the backend using AES-256 (Advanced Encryption Standard) before being written to the database. Decryption occurs only in memory when requested by the authenticated owner. For security, Vault PDF exports contain only item titles, URLs, and timestamps—never passwords or private keys."
            },

            ["AiInsights"] = new ModuleKnowledge
            {
                Name = "AI Insights",
                Aliases = new List<string> { "ai insights", "insights", "ai analysis", "recommendations", "recommendation", "habit intelligence", "ai" },
                WhatItIs = "AI Insights is an intelligent analytical engine that audits your calendar, tasks, workouts, hydration, and expense balances to generate data-backed suggestions.",
                WhatYouCanDo = new List<string>
                {
                    "Receive tailored finance recommendations (e.g., cash squeeze warnings when spending exceeds 80% of income)",
                    "Get wellness guidance based on hydration, workout, and sleep deficits",
                    "Receive productivity advice on managing task loads and avoiding burnout",
                    "Generate fresh insights automatically based on your latest logs",
                    "Export an AI Insights Summary PDF Report"
                },
                HowItHelps = "It turns raw logged data into actionable coaching advice, showing you practical adjustments to improve your habits and daily routines.",
                HowToUse = "Click 'AI Insights' in the sidebar navigation to view your categorized recommendation cards (Finance, Health, Productivity).",
                ButtonsAndActions = "'Generate Insights' (triggers fresh analysis of database logs), insight category badges, and 'Export Report'.",
                ExactFormulasOrTech = "The engine cross-analyzes transaction ratios (Expense / Income), daily hydration against the 2000ml standard, sleep against the 7-8h baseline, workout minutes, and pending task counts to synthesize personalized advisory cards."
            },

            ["AdminPanel"] = new ModuleKnowledge
            {
                Name = "Admin Panel",
                Aliases = new List<string> { "admin", "admin panel", "administration", "user directory", "users", "account management", "user status", "user accounts", "user account", "manage user", "manage users" },
                WhatItIs = "The Admin Panel is an administrative control console accessible strictly to authorized System Administrators.",
                WhatYouCanDo = new List<string>
                {
                    "View the complete system User Directory with search and pagination",
                    "Enable or Disable user accounts with instant session invalidation",
                    "Reset user passwords securely upon request",
                    "Promote or adjust user roles ('User' vs 'Admin')",
                    "Review legacy Pending Approvals queue if applicable",
                    "Permanently delete user accounts along with cascade cleanup"
                },
                HowItHelps = "It gives platform administrators full authority to manage users, preserve security, and control access.",
                HowToUse = "Authorized administrators access 'Admin Panel' from the sidebar navigation. Use the 'User Directory' tab to search users, and toggle 'Disable' or 'Enable' on any account.",
                ButtonsAndActions = "'Disable' / 'Enable' status button, 'Reset Password' button, 'Change Role' dropdown, 'Delete User' button, and search input.",
                ExactFormulasOrTech = "Restricted via [Authorize(Roles = \"Admin\")]. Disabling an account immediately sets Status to Inactive, wipes active refresh tokens in PostgreSQL, and terminates sessions upon the user's next API request. System administrators are protected against self-disablement."
            }
        };

        public static readonly List<string> ReportKnowledge = new List<string>
        {
            "Export Report Functionality: Available on Dashboard, Planner, Finance, Health, Career, Vault, and AI Insights.",
            "Asynchronous Worker Architecture: When you click 'Generate Report', a background job is submitted to an asynchronous processing queue (IReportQueue), handled by a dedicated background worker (ReportProcessorService).",
            "PDF Output: Reports are generated directly as professional, downloadable PDF files using the PDFsharp engine. (Excel export is not currently supported).",
            "Supported Frequencies: Daily (last 24 hours), Weekly (last 7 days), Monthly (last 30 days), and Yearly (last 365 days).",
            "Master vs Module Report: The Dashboard exports a combined Common Master Report across all modules. Individual module pages export dedicated, focused activity summaries.",
            "Security Protection: Vault reports export item metadata, titles, URLs, and creation dates, but NEVER export passwords or encrypted secrets."
        };
    }
}
