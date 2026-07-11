using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Models;
using PdfSharp.Pdf;
using PdfSharp.Drawing;
using PdfSharp.Fonts;

namespace LifeSyncAI.Core.Services
{
    public class ReportProcessorService : BackgroundService
    {
        private readonly IReportQueue _queue;
        private readonly IReportRepository _repository;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ReportProcessorService> _logger;
        private readonly string _reportsDirectory;

        public ReportProcessorService(
            IReportQueue queue,
            IReportRepository repository,
            IServiceScopeFactory scopeFactory,
            ILogger<ReportProcessorService> logger)
        {
            _queue = queue;
            _repository = repository;
            _scopeFactory = scopeFactory;
            _logger = logger;
            
            var basePath = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") ?? AppDomain.CurrentDomain.BaseDirectory;
            _reportsDirectory = Path.Combine(basePath, "reports");
            if (!Directory.Exists(_reportsDirectory))
            {
                Directory.CreateDirectory(_reportsDirectory);
            }

            try
            {
                if (GlobalFontSettings.FontResolver == null)
                {
                    GlobalFontSettings.FontResolver = new FileFontResolver();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize PDF font resolver.");
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Report Processor Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Dequeue next request (blocks until item becomes available)
                    var request = await _queue.DequeueAsync(stoppingToken);
                    _logger.LogInformation("Processing report request {Id} for User {UserId}.", request.Id, request.UserId);

                    request.Status = "Processing";
                    _repository.Save(request);

                    try
                    {
                        using (var scope = _scopeFactory.CreateScope())
                        {
                            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                            var user = await context.Users.FindAsync(request.UserId);

                            if (user == null)
                            {
                                request.Status = "Failed";
                                _repository.Save(request);
                                _logger.LogError("Failed to process report: User {UserId} not found.", request.UserId);
                                continue;
                            }

                            // Generate Content
                            string content = await BuildReportContentAsync(request.UserId, user.FullName, request.Module, request.Frequency, context);

                            // Save to file
                            string fileName = $"{request.Module}_Report_{request.Frequency}_{request.Id}.pdf";
                            string filePath = Path.Combine(_reportsDirectory, fileName);
                            SavePdfFromText(content, filePath);

                            request.Status = "Completed";
                            request.FilePath = filePath;
                            _repository.Save(request);
                            _logger.LogInformation("Successfully completed report request {Id}. File saved to {Path}.", request.Id, filePath);
                        }
                    }
                    catch (Exception ex)
                    {
                        request.Status = "Failed";
                        _repository.Save(request);
                        _logger.LogError(ex, "Failed to compile and save report for request {Id}.", request.Id);
                    }
                }
                catch (OperationCanceledException)
                {
                    // Clean shutdown
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred processing report request.");
                }
            }

            _logger.LogInformation("Report Processor Background Service is stopping.");
        }

        private async Task<string> BuildReportContentAsync(int userId, string userName, string module, string frequency, ApplicationDbContext context)
        {
            var cutoff = GetDateCutoff(frequency);
            var sb = new StringBuilder();

            // Header Banner
            sb.AppendLine("=================================================================================");
            sb.AppendLine($"                     LIFESYNC AI - PERSONAL ACTIVITY REPORT                     ");
            sb.AppendLine("=================================================================================");
            sb.AppendLine($"User Name:       {userName}");
            sb.AppendLine($"Report Target:   {module.ToUpper()} Module");
            sb.AppendLine($"Time Frame:      {frequency.ToUpper()} (Since {cutoff.ToLocalTime():yyyy-MM-dd HH:mm})");
            sb.AppendLine($"Generated At:    {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine("=================================================================================");
            sb.AppendLine();

            if (module.Equals("Planner", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendPlannerSectionAsync(userId, cutoff, context, sb);
            }

            if (module.Equals("Finance", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendFinanceSectionAsync(userId, cutoff, context, sb);
            }

            if (module.Equals("Health", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendHealthSectionAsync(userId, cutoff, context, sb);
            }

            if (module.Equals("Career", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendCareerSectionAsync(userId, cutoff, context, sb);
            }

            if (module.Equals("Vault", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendVaultSectionAsync(userId, context, sb);
            }

            if (module.Equals("AiInsights", StringComparison.OrdinalIgnoreCase) || module.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await AppendAiInsightsSectionAsync(userId, cutoff, context, sb);
            }

            sb.AppendLine("=================================================================================");
            sb.AppendLine("                      End of LifeSync AI Generated Report                        ");
            sb.AppendLine("=================================================================================");

            return sb.ToString();
        }

        private static DateTime GetDateCutoff(string frequency)
        {
            var now = DateTime.UtcNow;
            return frequency.ToLower() switch
            {
                "daily" => now.AddDays(-1),
                "weekly" => now.AddDays(-7),
                "monthly" => now.AddMonths(-1),
                "yearly" => now.AddYears(-1),
                _ => now.AddDays(-7) // Default weekly
            };
        }

        private async Task AppendPlannerSectionAsync(int userId, DateTime cutoff, ApplicationDbContext context, StringBuilder sb)
        {
            var events = await context.PlannerEvents
                .Where(e => e.UserId == userId && e.StartTime >= cutoff)
                .OrderBy(e => e.StartTime)
                .ToListAsync();

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             PLANNER & SCHEDULE SECTION                         ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Events:       {events.Count}");
            sb.AppendLine($"Completed Events:   {events.Count(e => e.IsCompleted)}");
            sb.AppendLine($"Completion Rate:    {(events.Count > 0 ? (events.Count(e => e.IsCompleted) * 100.0 / events.Count).ToString("F1") : "0.0")}%");
            sb.AppendLine();
            sb.AppendLine("Detailed Schedule List:");
            sb.AppendLine(string.Format(" {0,-25} | {1,-16} | {2,-16} | {3,-10}", "Title", "Start Time", "End Time", "Completed"));
            sb.AppendLine("---------------------------------------------------------------------------------");
            foreach (var e in events)
            {
                string title = e.Title.Length > 24 ? e.Title.Substring(0, 21) + "..." : e.Title;
                sb.AppendLine(string.Format(" {0,-25} | {1,-16:yyyy-MM-dd HH:mm} | {2,-16:yyyy-MM-dd HH:mm} | {3,-10}", title, e.StartTime.ToLocalTime(), e.EndTime.ToLocalTime(), e.IsCompleted ? "YES" : "NO"));
            }
            sb.AppendLine();
        }

        private async Task AppendFinanceSectionAsync(int userId, DateTime cutoff, ApplicationDbContext context, StringBuilder sb)
        {
            var txs = await context.Transactions
                .Where(t => t.UserId == userId && t.Date >= cutoff)
                .OrderByDescending(t => t.Date)
                .ToListAsync();

            var income = txs.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var expenses = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount);

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             FINANCE & TRANSACTIONS SECTION                      ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Transactions: {txs.Count}");
            sb.AppendLine($"Total Income:       ${income:F2}");
            sb.AppendLine($"Total Expenses:     ${expenses:F2}");
            sb.AppendLine($"Net Balance:        ${(income - expenses):F2}");
            sb.AppendLine();
            sb.AppendLine("Transactions Log Directory:");
            sb.AppendLine(string.Format(" {0,-12} | {1,-20} | {2,-12} | {3,-12} | {4,-12}", "Date", "Description", "Type", "Category", "Amount"));
            sb.AppendLine("---------------------------------------------------------------------------------");
            foreach (var t in txs)
            {
                string desc = t.Description.Length > 19 ? t.Description.Substring(0, 16) + "..." : t.Description;
                string cat = t.Category.Length > 11 ? t.Category.Substring(0, 9) + "..." : t.Category;
                sb.AppendLine(string.Format(" {0,-12:yyyy-MM-dd} | {1,-20} | {2,-12} | {3,-12} | ${4,-11:F2}", t.Date.ToLocalTime(), desc, t.Type, cat, t.Amount));
            }
            sb.AppendLine();
        }


        private async Task AppendHealthSectionAsync(int userId, DateTime cutoff, ApplicationDbContext context, StringBuilder sb)
        {
            var logs = await context.HealthLogs
                .Where(l => l.UserId == userId && l.LogDate >= cutoff)
                .OrderByDescending(l => l.LogDate)
                .ToListAsync();

            var waterSum = logs.Where(l => l.LogType == "Water").Sum(l => l.LogValue);
            var workoutMins = logs.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
            var sleepHours = logs.Where(l => l.LogType == "Sleep").Sum(l => l.LogValue);
            var stepsCount = logs.Where(l => l.LogType == "Steps").Sum(l => l.LogValue);
            var caloriesCount = logs.Where(l => l.LogType == "Calories").Sum(l => l.LogValue);

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             HEALTH & HYDRATION SECTION                         ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Hydration Intake:  {waterSum} ml");
            sb.AppendLine($"Total Workout Duration:  {workoutMins} minutes");
            sb.AppendLine($"Total Sleep Duration:    {sleepHours} hours");
            sb.AppendLine($"Total Steps Count:       {stepsCount} steps");
            sb.AppendLine($"Total Calories Consumed: {caloriesCount} kcal");
            sb.AppendLine();
            sb.AppendLine("Logged Activities Ledger:");
            sb.AppendLine(string.Format(" {0,-16} | {1,-12} | {2,-12} | {3,-30}", "Date/Time", "Activity", "Value", "Details"));
            sb.AppendLine("---------------------------------------------------------------------------------");
            foreach (var l in logs)
            {
                string unit = l.LogType switch
                {
                    "Water" => "ml",
                    "Workout" => "mins",
                    "Sleep" => "hours",
                    "Steps" => "steps",
                    "Calories" => "kcal",
                    _ => ""
                };
                string valStr = $"{l.LogValue} {unit}";
                string details = l.Details ?? "";
                if (details.Length > 29) details = details.Substring(0, 26) + "...";
                sb.AppendLine(string.Format(" {0,-16:yyyy-MM-dd HH:mm} | {1,-12} | {2,-12} | {3,-30}", l.LogDate.ToLocalTime(), l.LogType, valStr, details));
            }
            sb.AppendLine();
        }

        private async Task AppendCareerSectionAsync(int userId, DateTime cutoff, ApplicationDbContext context, StringBuilder sb)
        {
            var apps = await context.JobApplications
                .Where(a => a.UserId == userId && a.AppliedDate >= cutoff)
                .OrderByDescending(a => a.AppliedDate)
                .ToListAsync();

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             CAREER & APPLICATIONS SECTION                      ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Applications:   {apps.Count}");
            sb.AppendLine($"Offered pipeline:     {apps.Count(a => a.Status == "Offered")}");
            sb.AppendLine($"Interviewing phase:   {apps.Count(a => a.Status == "Interviewing")}");
            sb.AppendLine();
            sb.AppendLine("Job Hunt Progress List:");
            sb.AppendLine(string.Format(" {0,-12} | {1,-25} | {2,-25} | {3,-12}", "Date", "Company", "Position", "Status"));
            sb.AppendLine("---------------------------------------------------------------------------------");
            foreach (var a in apps)
            {
                string comp = a.Company.Length > 24 ? a.Company.Substring(0, 21) + "..." : a.Company;
                string pos = a.Position.Length > 24 ? a.Position.Substring(0, 21) + "..." : a.Position;
                sb.AppendLine(string.Format(" {0,-12:yyyy-MM-dd} | {1,-25} | {2,-25} | {3,-12}", a.AppliedDate.ToLocalTime(), comp, pos, a.Status));
            }
            sb.AppendLine();
        }

        private async Task AppendVaultSectionAsync(int userId, ApplicationDbContext context, StringBuilder sb)
        {
            var vaultCount = await context.VaultItems.Where(v => v.UserId == userId).CountAsync();

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             SECURE CREDENTIALS VAULT SECTION                   ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Encrypted Vault Records: {vaultCount}");
            sb.AppendLine();
            sb.AppendLine("Metadata Log:");
            sb.AppendLine("Note: Raw secret contents and passwords are withheld from reports for security.");
            sb.AppendLine("---------------------------------------------------------------------------------");
            var items = await context.VaultItems.Where(v => v.UserId == userId).ToListAsync();
            foreach (var item in items)
            {
                sb.AppendLine($" - Title: {item.Title}");
            }
            sb.AppendLine();
        }

        private async Task AppendAiInsightsSectionAsync(int userId, DateTime cutoff, ApplicationDbContext context, StringBuilder sb)
        {
            var insights = await context.AiRecommendations
                .Where(r => r.UserId == userId && r.CreatedAt >= cutoff)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine("                             AI INSIGHTS & HABIT ANALYSIS                       ");
            sb.AppendLine("---------------------------------------------------------------------------------");
            sb.AppendLine($"Total Recommendations Generated: {insights.Count}");
            sb.AppendLine();
            sb.AppendLine("Habits Recommendations Ledger:");
            foreach (var r in insights)
            {
                sb.AppendLine($" [{r.Category.ToUpper()} - {r.CreatedAt.ToLocalTime():yyyy-MM-dd}]");
                sb.AppendLine($" Recommendation: {r.InsightText}");
                sb.AppendLine();
            }
        }

        private void SavePdfFromText(string text, string filePath)
        {
            using (var document = new PdfDocument())
            {
                document.Info.Title = "LifeSync AI Activity Report";
                
                var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
                
                PdfPage? page = null;
                XGraphics? gfx = null;
                
                // Fonts Setup (Standard Arial/Helvetica sans-serif family)
                XFont fontTitle = new XFont("Arial", 14, XFontStyleEx.Bold);
                XFont fontSubtitle = new XFont("Arial", 9, XFontStyleEx.Italic);
                XFont fontSection = new XFont("Arial", 11, XFontStyleEx.Bold);
                XFont fontBody = new XFont("Arial", 9, XFontStyleEx.Regular);
                XFont fontBodyBold = new XFont("Arial", 9, XFontStyleEx.Bold);
                XFont fontFooter = new XFont("Arial", 8, XFontStyleEx.Regular);

                double yPoint = 40;
                double margin = 40;
                double lineHeight = 16;
                int pageCount = 0;
                int rowIdx = 0;
                bool inTable = false;

                // Color Palette
                XSolidBrush brushDarkBg = new XSolidBrush(XColor.FromArgb(45, 45, 45)); // Charcoal
                XSolidBrush brushAccentBg = new XSolidBrush(XColor.FromArgb(232, 90, 79)); // Brand Red
                XSolidBrush brushTableHead = new XSolidBrush(XColor.FromArgb(55, 71, 79)); // Dark Grey-Blue
                XSolidBrush brushRowAlt = new XSolidBrush(XColor.FromArgb(245, 247, 250)); // Very Light Blue-Grey
                XPen penBorder = new XPen(XColor.FromArgb(220, 224, 230), 0.8);
                XPen penGrid = new XPen(XColor.FromArgb(235, 238, 242), 0.5);

                Action addNewPage = () =>
                {
                    gfx?.Dispose(); // Release active graphics context of previous page
                    page = document.AddPage();
                    page.Size = PdfSharp.PageSize.A4;
                    gfx = XGraphics.FromPdfPage(page);
                    pageCount++;
                    
                    if (pageCount == 1)
                    {
                        // Draw header banner
                        gfx.DrawRectangle(brushDarkBg, 0, 0, page.Width.Point, 85);
                        gfx.DrawString("LIFESYNC AI - DYNAMIC LIFE DASHBOARD", fontTitle, XBrushes.White, margin, 42);
                        gfx.DrawString("PERSONAL wellness, finance, planner, and intelligence metrics summary", fontSubtitle, XBrushes.LightGray, margin, 60);
                        yPoint = 110;
                    }
                    else
                    {
                        // Draw running page header
                        gfx.DrawString("LifeSync AI - Activity Summary Report", fontSubtitle, XBrushes.Gray, margin, 35);
                        gfx.DrawLine(penBorder, margin, 42, page.Width.Point - margin, 42);
                        yPoint = 60;
                    }
                };

                foreach (var line in lines)
                {
                    string trimmed = line.Trim();
                    if (string.IsNullOrEmpty(trimmed))
                    {
                        yPoint += 6;
                        continue;
                    }

                    // Check for Page Overflow
                    if (page == null || yPoint > page.Height.Point - margin - 20)
                    {
                        addNewPage();
                    }

                    // 1. Skip dividers
                    if (trimmed.StartsWith("===") || (trimmed.StartsWith("---") && !inTable))
                    {
                        // Skip printing divider text, draw graphical line instead
                        gfx?.DrawLine(penBorder, margin, yPoint, page!.Width.Point - margin, yPoint);
                        yPoint += 8;
                        continue;
                    }

                    // 2. Identify Section Headers
                    if (trimmed.Contains("SECTION"))
                    {
                        inTable = false;
                        rowIdx = 0;
                        string cleanTitle = trimmed.Replace("-", "").Replace("=", "").Trim();
                        
                        // Draw colored section banner
                        gfx?.DrawRectangle(brushAccentBg, margin, yPoint - 2, page!.Width.Point - margin * 2, 20);
                        gfx?.DrawString(cleanTitle, fontSection, XBrushes.White, margin + 8, yPoint + 12);
                        yPoint += 30;
                        continue;
                    }

                    // 3. Identify Table Rows
                    if (trimmed.Contains("|"))
                    {
                        var cols = trimmed.Split('|').Select(c => c.Trim()).ToArray();
                        if (cols.Length > 1)
                        {
                            inTable = true;
                            // Check if this is the header row
                            bool isHeader = cols.Any(c => c.Equals("Date", StringComparison.OrdinalIgnoreCase) || 
                                                          c.Equals("Title", StringComparison.OrdinalIgnoreCase) || 
                                                          c.Equals("Date/Time", StringComparison.OrdinalIgnoreCase) ||
                                                          c.Equals("Activity", StringComparison.OrdinalIgnoreCase) ||
                                                          c.Equals("Company", StringComparison.OrdinalIgnoreCase) ||
                                                          c.Equals("Metadata Log:", StringComparison.OrdinalIgnoreCase));

                            if (isHeader)
                            {
                                // Draw dark table header background
                                gfx?.DrawRectangle(brushTableHead, margin, yPoint - 2, page!.Width.Point - margin * 2, 18);
                                double colX = margin;
                                for (int i = 0; i < cols.Length; i++)
                                {
                                    double colW = (cols.Length == 4)
                                        ? (i == 0 ? 120 : i == 1 ? 120 : i == 2 ? 120 : 140)
                                        : (i == 0 ? 80 : i == 1 ? 140 : i == 2 ? 90 : i == 3 ? 90 : 100);

                                    gfx?.DrawString(cols[i], fontBodyBold, XBrushes.White, colX + 6, yPoint + 11);
                                    colX += colW;
                                }
                                yPoint += 22;
                            }
                            else
                            {
                                // Alternate row colors
                                if (rowIdx % 2 == 1)
                                {
                                    gfx?.DrawRectangle(brushRowAlt, margin, yPoint - 2, page!.Width.Point - margin * 2, 16);
                                }
                                double colX = margin;
                                for (int i = 0; i < cols.Length; i++)
                                {
                                    double colW = (cols.Length == 4)
                                        ? (i == 0 ? 120 : i == 1 ? 120 : i == 2 ? 120 : 140)
                                        : (i == 0 ? 80 : i == 1 ? 140 : i == 2 ? 90 : i == 3 ? 90 : 100);

                                    gfx?.DrawString(cols[i], fontBody, XBrushes.Black, colX + 6, yPoint + 10);
                                    colX += colW;
                                }
                                gfx?.DrawLine(penGrid, margin, yPoint + 14, page!.Width.Point - margin, yPoint + 14);
                                yPoint += 16;
                                rowIdx++;
                            }
                            continue;
                        }
                    }

                    // 4. Regular Text Details
                    inTable = false;
                    rowIdx = 0;
                    if (trimmed.Contains(":"))
                    {
                        var parts = trimmed.Split(new[] { ':' }, 2);
                        string label = parts[0].Trim();
                        string val = parts[1].Trim();

                        gfx?.DrawString(label + ":", fontBodyBold, XBrushes.Black, margin, yPoint + 8);
                        gfx?.DrawString(val, fontBody, XBrushes.DarkSlateGray, margin + 140, yPoint + 8);
                    }
                    else
                    {
                        gfx?.DrawString(trimmed, fontBody, XBrushes.Black, margin, yPoint + 8);
                    }
                    yPoint += lineHeight;
                }

                // Release graphics context of final page before editing headers
                gfx?.Dispose();

                // Add footer to all pages
                for (int i = 0; i < document.PageCount; i++)
                {
                    var p = document.Pages[i];
                    using (var fGfx = XGraphics.FromPdfPage(p))
                    {
                        fGfx.DrawLine(penBorder, margin, p.Height.Point - margin, p.Width.Point - margin, p.Height.Point - margin);
                        fGfx.DrawString($"Page {i + 1} of {document.PageCount}", fontFooter, XBrushes.Gray, margin, p.Height.Point - margin + 14);
                        fGfx.DrawString("LifeSync AI Performance Intelligence Hub • Confidential", fontFooter, XBrushes.Gray, p.Width.Point - margin - 230, p.Height.Point - margin + 14);
                    }
                }

                document.Save(filePath);
            }
        }

        private class FileFontResolver : IFontResolver
        {
            public string DefaultFontName => "Courier New";

            public byte[]? GetFont(string faceName)
            {
                string fontPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Fonts", "cour.ttf");
                if (File.Exists(fontPath))
                {
                    return File.ReadAllBytes(fontPath);
                }
                fontPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Fonts", "arial.ttf");
                if (File.Exists(fontPath))
                {
                    return File.ReadAllBytes(fontPath);
                }
                return null;
            }

            public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
            {
                return new FontResolverInfo("Courier New");
            }
        }
    }
}

