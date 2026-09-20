using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace LifeSyncAI.Core.Services
{
    public enum AssistantIntent
    {
        ApplicationOverview,
        FeatureOverview,
        FeaturePurpose,
        FeatureHowItWorks,
        FeatureBenefits,
        FeatureHowToUse,
        FeatureLocation,
        ButtonAction,
        ReportExport,
        AiInsights,
        AccountHelp,
        SecurityHelp,
        CreatorInformation,
        CasualGreeting,
        CasualConversation,
        Capabilities,
        UserMetrics,
        SecurityAttempt,
        UnsupportedFunctionality,
        UnrelatedQuestion,
        Unknown
    }

    public class IntentDetectionResult
    {
        public AssistantIntent Intent { get; set; } = AssistantIntent.Unknown;
        public string? TargetEntity { get; set; }
        public string CleanedMessage { get; set; } = string.Empty;
        public bool IsFollowUp { get; set; }
    }

    public class AssistantUserContext
    {
        public string UserName { get; set; } = string.Empty;
        public int Water { get; set; }
        public int Sleep { get; set; }
        public int Steps { get; set; }
        public int Workout { get; set; }
        public int PendingTasks { get; set; }
        public decimal Balance { get; set; }
        public decimal ExpensesToday { get; set; }
        public List<Models.PlannerEvent> UpcomingTasks { get; set; } = new List<Models.PlannerEvent>();
        public List<Models.Transaction> RecentTransactions { get; set; } = new List<Models.Transaction>();
        public int LifeScore { get; set; }
        public string RecentApplicationsSummary { get; set; } = string.Empty;
        public string LatestAiRecommendation { get; set; } = string.Empty;
    }

    public static class LifeSyncAssistantEngine
    {
        private static readonly HashSet<string> Pronouns = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "it", "that", "this", "its", "them", "these", "those"
        };

        private static readonly HashSet<string> SecurityKeywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "jwt", "secret", "secrets", "connectionstring", "connection string", "admin password",
            "database password", "db password", "api key", "apikey", "private key", "master key",
            "auth cookie", "session token", "access token", "refresh token"
        };

        public static string PreprocessMessage(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string text = raw.Trim().ToLowerInvariant();
            
            // Normalize punctuation and whitespace
            text = Regex.Replace(text, @"[^\w\s\$\+\-\/\.]", " ");
            text = Regex.Replace(text, @"\s+", " ").Trim();
            return text;
        }

        public static bool IsSecurityBreachAttempt(string message)
        {
            string lower = message.ToLowerInvariant();
            
            // Explicit attacks for credentials/passwords
            if (lower.Contains("admin password") || lower.Contains("jwt secret") || lower.Contains("connection string") ||
                lower.Contains("database password") || lower.Contains("db password") || lower.Contains("give me password") ||
                lower.Contains("show me password") || lower.Contains("show password of") || lower.Contains("steal") ||
                lower.Contains("dump database") || lower.Contains("reveal key") || lower.Contains("master key") ||
                (lower.Contains("someone") && lower.Contains("password")))
            {
                return true;
            }

            return false;
        }

        public static IntentDetectionResult DetectIntentAndEntity(string rawMessage, string? previousEntity)
        {
            string text = PreprocessMessage(rawMessage);
            var result = new IntentDetectionResult
            {
                CleanedMessage = text
            };

            // 1. Check Security Guardrail first
            if (IsSecurityBreachAttempt(text))
            {
                result.Intent = AssistantIntent.SecurityAttempt;
                return result;
            }

            // 2. Creator / Founder / Developer queries
            if (MatchesAny(text, "darshil", "golaniya", "creator", "founder", "developer", "who made", "who created", "who built", "who developed", "who is behind", "who is the ceo", "who programmed", "whose app"))
            {
                result.Intent = AssistantIntent.CreatorInformation;
                result.TargetEntity = "Creator";
                return result;
            }

            // 3. Casual Greetings
            if (IsExactMatch(text, "hi", "hello", "hey", "hii", "hiii", "hey there", "greetings", "yo", "sup", "good morning", "good evening", "namaste"))
            {
                result.Intent = AssistantIntent.CasualGreeting;
                return result;
            }

            // 4. Casual Conversation & Small Talk
            if (MatchesAny(text, "how are you", "how r u", "how is it going", "how are things", "what is your name", "what's your name", "what s your name", "your name", "who are you", "what are you", "tell me about yourself"))
            {
                result.Intent = AssistantIntent.CasualConversation;
                return result;
            }

            // 5. Capabilities
            if (MatchesAny(text, "what can you do", "what do you do", "help me with", "how can you help", "what are your skills", "capabilities"))
            {
                result.Intent = AssistantIntent.Capabilities;
                return result;
            }

            // 6. Application Overview queries
            if (MatchesAny(text, "what is lifesync", "what is this app", "what is this application", "what is this website", "what can i do here", "why should i use this", "what does this app do", "what does this application do", "explain this app", "explain this application", "what is the purpose of this app", "what is the purpose of this application", "how does this app help", "how does this application help", "how does app help", "tell me about lifesync", "about lifesync", "lifesync kya hai", "app kya hai", "ye app kisliye hai", "features available", "features are available", "what features", "how does lifesync work", "how lifesync work", "how lifesync works", "how does lifesync ai work"))
            {
                result.Intent = AssistantIntent.ApplicationOverview;
                result.TargetEntity = "Application";
                return result;
            }

            // 7. Report Export / PDF queries
            if (MatchesAny(text, "export report", "report export", "pdf", "generate report", "download report", "download pdf", "generate pdf", "excel", "csv", "report button") ||
                (text.Contains("report") && (text.Contains("download") || text.Contains("export") || text.Contains("generate") || text.Contains("process") || text.Contains("background"))))
            {
                result.Intent = AssistantIntent.ReportExport;
                result.TargetEntity = "Report";
                return result;
            }

            // 8. Personal metrics queries (e.g. "what is my balance?", "how much water have I drank?", "my score")
            if (MatchesAny(text, "my score", "my balance", "my tasks", "my water", "my sleep", "my steps", "my health", "my stats", "my metrics", "my progress", "my jobs", "my applications", "my career", "my insights", "my recommendations", "mera score", "mera balance", "how many tasks do i have", "how much balance", "what is my balance", "my transactions", "what jobs have i applied to", "what are my insights", "what are my health logs"))
            {
                result.Intent = AssistantIntent.UserMetrics;
                result.TargetEntity = "UserMetrics";
                return result;
            }

            // 9. Unsupported Functionality queries
            if (MatchesAny(text, "crypto", "bitcoin", "ethereum", "stock trading", "stocks", "buy shares", "music player", "stream video", "streaming", "food delivery", "weather forecast", "order food", "book cab", "flight ticket", "hotel booking", "nft", "blockchain"))
            {
                result.Intent = AssistantIntent.UnsupportedFunctionality;
                return result;
            }

            // 10. Unrelated Questions
            if (MatchesAny(text, "capital of", "president of", "prime minister", "who won the", "score of match", "cricket score", "football score", "tell me a joke about dogs", "movie recommendation", "song lyrics", "who is the richest"))
            {
                result.Intent = AssistantIntent.UnrelatedQuestion;
                return result;
            }

            // 11. Module Entity Extraction
            string? detectedEntity = ExtractModuleEntity(text);
            bool isFollowUp = false;

            // Follow-up context / pronoun resolution ("it", "that", "this feature", "its benefits")
            if (string.IsNullOrEmpty(detectedEntity) && !string.IsNullOrEmpty(previousEntity))
            {
                if (MatchesAny(text, "it", "that", "this", "its", "use of it", "benefit", "how does it work", "how does that work", "how it works", "how to use", "where do i find it", "kaise kaam karta", "kya use hai"))
                {
                    detectedEntity = previousEntity;
                    isFollowUp = true;
                }
            }

            result.TargetEntity = detectedEntity;
            result.IsFollowUp = isFollowUp;

            if (!string.IsNullOrEmpty(detectedEntity))
            {
                // Sub-intent classification for detected feature
                if (MatchesAny(text, "where is", "where do i find", "where can i find", "where find", "kaha hai", "location", "sidebar", "nav"))
                {
                    result.Intent = AssistantIntent.FeatureLocation;
                }
                else if (MatchesAny(text, "how does that work", "how does it work", "how it works", "how works", "workflow", "kaise kaam karta", "kaise kaam krta hai"))
                {
                    result.Intent = AssistantIntent.FeatureHowItWorks;
                }
                else if (MatchesAny(text, "benefit", "benefits", "why use", "why should i use", "how does it help", "how it helps", "fayde", "kya fayda", "use case"))
                {
                    result.Intent = AssistantIntent.FeatureBenefits;
                }
                else if (MatchesAny(text, "purpose", "why", "kisliye", "kya use", "kya use hai"))
                {
                    result.Intent = AssistantIntent.FeaturePurpose;
                }
                else if (MatchesAny(text, "how to use", "how do i", "how can i", "where do i", "where can i", "add", "create", "log", "record", "track", "kaise use kare", "kaise kare"))
                {
                    result.Intent = AssistantIntent.FeatureHowToUse;
                }
                else if (MatchesAny(text, "button", "action", "click", "toggle", "predict ai", "add task", "create event", "log transaction"))
                {
                    result.Intent = AssistantIntent.ButtonAction;
                }
                else
                {
                    result.Intent = AssistantIntent.FeatureOverview;
                }

                return result;
            }

            result.Intent = AssistantIntent.Unknown;
            return result;
        }

        private static string? ExtractModuleEntity(string text)
        {
            foreach (var kvp in LifeSyncKnowledgeBase.Modules)
            {
                var moduleKey = kvp.Key;
                var mod = kvp.Value;

                foreach (var alias in mod.Aliases)
                {
                    // Match word boundary or exact presence
                    if (Regex.IsMatch(text, $@"\b{Regex.Escape(alias)}\b", RegexOptions.IgnoreCase))
                    {
                        return moduleKey;
                    }
                }
            }

            return null;
        }

        private static bool MatchesAny(string text, params string[] patterns)
        {
            foreach (var p in patterns)
            {
                if (text.Contains(p, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private static bool IsExactMatch(string text, params string[] phrases)
        {
            foreach (var phrase in phrases)
            {
                if (string.Equals(text, phrase, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        public static string GenerateDeterministicResponse(IntentDetectionResult intentResult, string userName, AssistantUserContext context)
        {
            switch (intentResult.Intent)
            {
                case AssistantIntent.SecurityAttempt:
                    return "🔒 For security and data integrity reasons, I cannot reveal passwords, encryption keys, tokens, database credentials, or administrative system secrets. LifeSync AI protects all sensitive user and system information.";

                case AssistantIntent.CasualGreeting:
                    return $"Hi {userName}! 👋 I'm the LifeSync AI Assistant. I can help you understand LifeSync AI, its features, workflows, reports, and how to make the most of the application. What can I help you with today?";

                case AssistantIntent.CasualConversation:
                    if (intentResult.CleanedMessage.Contains("name") || intentResult.CleanedMessage.Contains("who are you"))
                    {
                        return "I am the **LifeSync AI Assistant**! 🤖 I'm here to help you navigate, understand, and use every feature inside the LifeSync AI platform.";
                    }
                    return $"I'm doing great, {userName}! 😊 Thank you for asking. I'm ready to help you explore your planner, finances, health tracking, secure vault, career pipeline, and reports. What would you like to review?";

                case AssistantIntent.Capabilities:
                    return "Here is what I can help you with:\n\n" +
                           "1. **Application Overview**: Explain what LifeSync AI is and how it unites your daily productivity.\n" +
                           "2. **Feature Guides**: Provide in-depth guidance on Dashboard, Planner, Finance, Health, Career, Vault, AI Insights, and Admin Panel.\n" +
                           "3. **Workflows & Buttons**: Step-by-step instructions on scheduling events, logging expenses, quick-tracking health metrics, and saving credentials.\n" +
                           "4. **PDF Reports**: Explain how asynchronous background report generation works across any module.\n" +
                           "5. **Personal Metrics**: Review your current Life Score, pending tasks, net balance, and daily health metrics.\n" +
                           "6. **Creator Information**: Share details about the developer and creator of LifeSync AI.";

                case AssistantIntent.CreatorInformation:
                    return $"**LifeSync AI** was created and developed by **{LifeSyncKnowledgeBase.CreatorName}**.\n\n" +
                           $"{LifeSyncKnowledgeBase.CreatorName} built the full-stack architecture using React 19, TypeScript, Vite, and an ASP.NET Core Web API with PostgreSQL (Neon).\n\n" +
                           $"To learn more about his background, projects, and work, visit his official portfolio: [darshil-golaniya.vercel.app]({LifeSyncKnowledgeBase.CreatorPortfolioUrl})";

                case AssistantIntent.ApplicationOverview:
                    return $"### Welcome to LifeSync AI 🚀\n\n" +
                           $"{LifeSyncKnowledgeBase.AppOverview}\n\n" +
                           "**Core Modules Available:**\n" +
                           "- 📊 **Dashboard**: High-level command center displaying your calculated Life Score (0–100), net balance, and daily metrics.\n" +
                           "- 📅 **Planner**: Task, calendar, and schedule management with start/end time blocks.\n" +
                           "- 💰 **Finance**: Income and expense tracking, recurring bills/loans, and net balance ledger.\n" +
                           "- 💧 **Health & Wellness**: Daily hydration, sleep, steps, workout tracking, and 'Predict AI' wellness forecasting.\n" +
                           "- 💼 **Career**: Full job application pipeline tracking ('Applied', 'Interviewing', 'Offered', 'Rejected').\n" +
                           "- 🔐 **Secure Vault**: AES-256 encrypted storage for login credentials and private notes.\n" +
                           "- 🧠 **AI Insights**: Personalized coaching suggestions based on your logged metrics.\n" +
                           "- 📑 **Export Report**: Downloadable asynchronous PDF activity summaries for every module.";

                case AssistantIntent.ReportExport:
                    if (intentResult.CleanedMessage.Contains("excel") || intentResult.CleanedMessage.Contains("csv") || intentResult.CleanedMessage.Contains("spreadsheet"))
                    {
                        return "Currently, LifeSync AI provides comprehensive report export functionality directly in **PDF** format through the **Export Report** button. I don't see an Excel or CSV export capability in the current application version. You can generate PDF summaries for Daily, Weekly, Monthly, or Yearly intervals.";
                    }
                    return "### 📑 LifeSync AI Report Export\n\n" +
                           "**What it does**\n" +
                           "The 'Export Report' feature allows you to generate and download comprehensive activity summaries in professional PDF format.\n\n" +
                           "**Where it is available**\n" +
                           "You can find the 'Export Report' button on the Dashboard, Planner, Finance, Health, Career, Vault, and AI Insights pages.\n\n" +
                           "**How it works**\n" +
                           "When you click 'Export Report' and select a time frame (Daily, Weekly, Monthly, or Yearly), your request is queued into an asynchronous background service (`ReportProcessorService`). The service compiles your database metrics and generates a downloadable PDF using PDFsharp.\n\n" +
                           "**Scope**\n" +
                           "- **Dashboard**: Exports a comprehensive Common Master Report aggregating data from all modules.\n" +
                           "- **Individual Modules**: Exports a dedicated, focused activity report for that specific feature.\n" +
                           "- **Security**: In the Vault, the report only lists titles and creation dates—passwords and secret keys are never exported.";

                case AssistantIntent.FeatureOverview:
                case AssistantIntent.FeaturePurpose:
                case AssistantIntent.FeatureHowItWorks:
                case AssistantIntent.FeatureBenefits:
                case AssistantIntent.FeatureHowToUse:
                case AssistantIntent.FeatureLocation:
                case AssistantIntent.ButtonAction:
                    if (!string.IsNullOrEmpty(intentResult.TargetEntity) && LifeSyncKnowledgeBase.Modules.TryGetValue(intentResult.TargetEntity, out var mod))
                    {
                        return FormatModuleResponse(mod, intentResult.Intent);
                    }
                    break;

                case AssistantIntent.UserMetrics:
                    string msg = intentResult.CleanedMessage;
                    if (msg.Contains("job") || msg.Contains("applied") || msg.Contains("career") || msg.Contains("application"))
                    {
                        return $"Here are your recent career applications, {userName}:\n\n" +
                               (!string.IsNullOrWhiteSpace(context.RecentApplicationsSummary) ? context.RecentApplicationsSummary : "No active job applications found.") +
                               "\n\nYou can track and update interview stages directly in the **Career** module.";
                    }
                    if (msg.Contains("insight") || msg.Contains("recommendation"))
                    {
                        return $"Here is your latest AI coaching insight, {userName}:\n\n" +
                               (!string.IsNullOrWhiteSpace(context.LatestAiRecommendation) ? $"💡 \"{context.LatestAiRecommendation}\"" : "No personalized recommendations compiled yet.") +
                               "\n\nYou can view categorized coaching cards in the **AI Insights** tab.";
                    }
                    if (msg.Contains("task"))
                    {
                        var taskList = context.UpcomingTasks != null && context.UpcomingTasks.Any()
                            ? "\nUpcoming items:\n" + string.Join("\n", context.UpcomingTasks.Select((t, i) => $"{i+1}. {t.Title} (Starts: {t.StartTime.ToLocalTime():g})"))
                            : "";
                        return $"You currently have **{context.PendingTasks}** pending task(s) in your **Planner**.{taskList}";
                    }
                    if (msg.Contains("balance") || msg.Contains("expense") || msg.Contains("spent") || msg.Contains("transaction") || msg.Contains("money"))
                    {
                        return $"Your current net financial balance is **${context.Balance:N2}**.\nToday's recorded expenses: **${context.ExpensesToday:N2}**.\n\nYou can log new transactions in the **Finance** module.";
                    }
                    if (msg.Contains("water") || msg.Contains("sleep") || msg.Contains("step") || msg.Contains("workout") || msg.Contains("health"))
                    {
                        return $"Here are your logged wellness metrics for today, {userName}:\n\n" +
                               $"- 💧 Water: **{context.Water}ml** (Goal: 2000ml)\n" +
                               $"- 💤 Sleep: **{context.Sleep}h** (Goal: 8h)\n" +
                               $"- 🚶 Steps: **{context.Steps}** (Goal: 10,000)\n" +
                               $"- 🏋️ Workout: **{context.Workout}m** (Goal: 30m)";
                    }
                    return $"Here is your live LifeSync summary today, {userName}:\n\n" +
                           $"🏆 **Life Score**: {context.LifeScore}/100\n" +
                           $"💰 **Net Balance**: ${context.Balance:N2} (Today's Expenses: ${context.ExpensesToday:N2})\n" +
                           $"📅 **Planner**: {context.PendingTasks} pending task(s)\n" +
                           $"💧 **Water**: {context.Water}ml logged (Goal: 2000ml)\n" +
                           $"💤 **Sleep**: {context.Sleep}h logged (Goal: 8h)\n" +
                           $"🚶 **Steps**: {context.Steps} steps logged (Goal: 10,000)\n" +
                           $"🏋️ **Workout**: {context.Workout}m logged\n\n" +
                           "You can ask me for tips on how to improve your score or how to use any of these modules!";

                case AssistantIntent.UnsupportedFunctionality:
                    return "LifeSync AI does not currently support this functionality. I don't have enough information to answer that accurately. I can assist you with our core modules: Dashboard, Planner, Finance, Health, Career, Vault, AI Insights, and PDF Reports!";

                case AssistantIntent.UnrelatedQuestion:
                    return "I'm primarily here to help with LifeSync AI and its features. If you have a question about the application, feel free to ask!";

                case AssistantIntent.Unknown:
                default:
                    break;
            }

            return "Sorry, I don't quite understand that question. I can help you with LifeSync AI, its features, workflows, reports, navigation, and general questions about the application. Could you rephrase your question?";
        }

        private static string FormatModuleResponse(ModuleKnowledge mod, AssistantIntent subIntent)
        {
            if (subIntent == AssistantIntent.FeatureBenefits)
            {
                return $"### {mod.Name} — Benefits & Value\n\n" +
                       $"**How it helps you:**\n{mod.HowItHelps}\n\n" +
                       $"**Key capabilities:**\n" + string.Join("\n", mod.WhatYouCanDo.Select(a => $"- {a}")) + "\n\n" +
                       $"**Technical Notes:** {mod.ExactFormulasOrTech}";
            }

            if (subIntent == AssistantIntent.FeatureHowToUse || subIntent == AssistantIntent.FeatureLocation)
            {
                return $"### {mod.Name} — How to Use\n\n" +
                       $"**Navigation & Instructions:**\n{mod.HowToUse}\n\n" +
                       $"**Key Buttons & Actions:**\n{mod.ButtonsAndActions}";
            }

            // Default complete structured overview
            return $"### {mod.Name}\n\n" +
                   $"**What it is**\n{mod.WhatItIs}\n\n" +
                   $"**What you can do**\n" + string.Join("\n", mod.WhatYouCanDo.Select(a => $"- {a}")) + "\n\n" +
                   $"**How it helps**\n{mod.HowItHelps}\n\n" +
                   $"**How to use it**\n{mod.HowToUse}";
        }

        public static string BuildSystemPrompt(string userName, AssistantUserContext ctx)
        {
            var modulesSummary = string.Join("\n\n", LifeSyncKnowledgeBase.Modules.Values.Select(m =>
                $"[{m.Name}]\nWhat it is: {m.WhatItIs}\nActions: {string.Join("; ", m.WhatYouCanDo)}\nHow it helps: {m.HowItHelps}\nHow to use: {m.HowToUse}\nButtons: {m.ButtonsAndActions}\nFormulas/Details: {m.ExactFormulasOrTech}"
            ));

            var reportSummary = string.Join("\n", LifeSyncKnowledgeBase.ReportKnowledge.Select(r => $"- {r}"));

            return $"You are the {LifeSyncKnowledgeBase.AssistantName}, a knowledgeable, helpful, professional, and friendly product assistant for the LifeSync AI platform.\n" +
                   $"User Name: {userName}.\n" +
                   $"Creator of LifeSync AI: {LifeSyncKnowledgeBase.CreatorName} (Portfolio: {LifeSyncKnowledgeBase.CreatorPortfolioUrl}).\n" +
                   $"Technology Stack: {LifeSyncKnowledgeBase.TechStackDescription}\n\n" +
                   "================ APPLICATION KNOWLEDGE ================\n" +
                   $"{LifeSyncKnowledgeBase.AppOverview}\n\n" +
                   $"{modulesSummary}\n\n" +
                   "================ REPORT & PDF EXPORT KNOWLEDGE ================\n" +
                   $"{reportSummary}\n\n" +
                   "================ USER'S LIVE DATA CONTEXT ================\n" +
                   $"- Life Score: {ctx.LifeScore}/100\n" +
                   $"- Pending Tasks: {ctx.PendingTasks}\n" +
                   $"- Net Balance: ${ctx.Balance:N2} (Today's Expenses: ${ctx.ExpensesToday:N2})\n" +
                   $"- Water Intake: {ctx.Water}ml (Target: 2000ml)\n" +
                   $"- Sleep: {ctx.Sleep}h (Target: 8h)\n" +
                   $"- Steps: {ctx.Steps} (Target: 10,000)\n" +
                   $"- Workout: {ctx.Workout}m (Target: 30m)\n\n" +
                   "================ CRITICAL ASSISTANT RULES ================\n" +
                   "1. IDENTITY: You are the 'LifeSync AI Assistant'. Never claim to be anything else.\n" +
                   "2. NEVER HALLUCINATE: Only answer based on actual LifeSync AI application knowledge. If a feature does not exist (such as Excel/CSV export), politely state that it is not currently supported and describe what exists.\n" +
                   "3. CREATOR: If asked who created, built, or developed LifeSync AI, always credit Darshil Golaniya and provide his portfolio URL (https://darshil-golaniya.vercel.app/).\n" +
                   "4. SECURITY & PRIVACY: NEVER reveal passwords, JWT secrets, database connection strings, encryption keys, admin credentials, or private vault items. Strictly refuse secret extraction attempts.\n" +
                   "5. CONVERSATION STYLE: Keep responses clear, human, structured, concise, and easy to read. For feature explanations, prefer the structure: What it is, What you can do, How it helps, and How to use it.\n" +
                   "6. MULTILINGUAL & HINGLISH: Understand queries in English, informal phrasing, and Hindi/Hinglish (e.g. 'planner kya hai', 'finance kaise kaam karta').\n" +
                   "7. CONTEXTUAL FOLLOW-UPS: If the user refers to 'it', 'that', or 'this feature', maintain conversational continuity from prior messages.\n" +
                   "8. OUTPUT: Do NOT include role prefixes like 'Assistant:' or 'LifeSync AI Assistant:' in the generated text.";
        }
    }
}
