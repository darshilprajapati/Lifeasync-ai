using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Health;
using LifeSyncAI.Core.DTO.Output.Health;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class WellnessForecasterService : IWellnessForecasterService
    {
        private readonly ApplicationDbContext _context;
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _httpContextAccessor;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public WellnessForecasterService(
            ApplicationDbContext context, 
            Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _configuration = configuration;
        }

        public async Task<ApiResponse<WellnessForecastDto>> ForecastWellnessScoreAsync(int userId, WellnessForecastInputDto input)
        {
            try
            {
                // 1. Gather historical data from health logs of the last 30 days
                var today = DateTime.UtcNow.Date;
                var startDate = today.AddDays(-30);

                var healthLogs = await _context.HealthLogs
                    .Where(l => l.UserId == userId && l.LogDate >= startDate)
                    .ToListAsync();

                var plannerEvents = await _context.PlannerEvents
                    .Where(e => e.UserId == userId && e.StartTime >= startDate)
                    .ToListAsync();

                var trainingSet = new List<double[]>(); // features: [water_ratio, optimal_sleep, workout_active, no_tasks, task_penalty]
                var labels = new List<double>();        // target score

                // Build daily wellness rows from database logs
                for (int i = 0; i < 30; i++)
                {
                    var day = startDate.AddDays(i);
                    var dayLogs = healthLogs.Where(l => l.LogDate.Date == day.Date).ToList();
                    
                    float water = dayLogs.Where(l => l.LogType == "Water").Sum(l => l.LogValue);
                    float sleep = dayLogs.Where(l => l.LogType == "Sleep").Sum(l => l.LogValue);
                    float steps = dayLogs.Where(l => l.LogType == "Steps").Sum(l => l.LogValue);
                    float workout = dayLogs.Where(l => l.LogType == "Workout").Sum(l => l.LogValue);
                    
                    float pending = plannerEvents.Count(e => e.StartTime.Date == day.Date && !e.IsCompleted);

                    if (water > 0 || sleep > 0 || steps > 0 || workout > 0)
                    {
                        // Calculate standard score
                        float score = 50f;
                        if (pending == 0) score += 15f;
                        else score -= Math.Min(15f, pending * 3f);
                        score += Math.Min(15f, (water / 2000f * 15f));
                        score += Math.Min(10f, (workout > 0 ? 10f : 0f));
                        score += Math.Min(10f, (sleep >= 7f && sleep <= 9f ? 10f : 5f));

                        trainingSet.Add(new double[]
                        {
                            Math.Min(1.0, water / 2000.0),
                            (sleep >= 7.0 && sleep <= 9.0) ? 1.0 : 0.0,
                            workout > 0.0 ? 1.0 : 0.0,
                            pending == 0.0 ? 1.0 : 0.0,
                            Math.Min(1.0, pending / 5.0)
                        });
                        labels.Add(score);
                    }
                }

                // If dataset is too thin, generate synthetic training rows
                if (trainingSet.Count < 10)
                {
                    var rand = new Random(42);
                    for (int i = 0; i < 80; i++)
                    {
                        double water = rand.Next(500, 3000);
                        double sleep = rand.Next(4, 11);
                        double workout = rand.Next(0, 90);
                        double pending = rand.Next(0, 8);

                        double score = 50.0;
                        if (pending == 0) score += 15.0;
                        else score -= Math.Min(15.0, pending * 3.0);
                        score += Math.Min(15.0, (water / 2000.0 * 15.0));
                        score += Math.Min(10.0, (workout > 0 ? 10.0 : 0.0));
                        score += Math.Min(10.0, (sleep >= 7.0 && sleep <= 9.0 ? 10.0 : 5.0));

                        // Add small noise to make gradient descent fit a realistic weight vector
                        score += rand.NextDouble() * 1.5 - 0.75;
                        score = Math.Clamp(score, 0.0, 100.0);

                        trainingSet.Add(new double[]
                        {
                            Math.Min(1.0, water / 2000.0),
                            (sleep >= 7.0 && sleep <= 9.0) ? 1.0 : 0.0,
                            workout > 0.0 ? 1.0 : 0.0,
                            pending == 0.0 ? 1.0 : 0.0,
                            Math.Min(1.0, pending / 5.0)
                        });
                        labels.Add(score);
                    }
                }

                try
                {
                    var historyList = new List<PythonDailyFeature>();
                    for (int idx = 0; idx < trainingSet.Count; idx++)
                    {
                        historyList.Add(new PythonDailyFeature
                        {
                            water_ratio = trainingSet[idx][0],
                            optimal_sleep = trainingSet[idx][1],
                            workout_active = trainingSet[idx][2],
                            no_tasks = trainingSet[idx][3],
                            pending_tasks = trainingSet[idx][4],
                            score = labels[idx]
                        });
                    }

                    var targetInput = new PythonTargetInput
                    {
                        water_intake = input.WaterIntake,
                        sleep_hours = input.SleepHours,
                        workout_minutes = input.WorkoutMinutes,
                        steps_count = input.StepsCount,
                        pending_tasks = input.PendingTasks
                    };

                    string? authHeader = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"];
                    if (string.IsNullOrEmpty(authHeader))
                    {
                        if (_httpContextAccessor.HttpContext?.Request.Cookies.TryGetValue("accessToken", out var cookieToken) == true)
                        {
                            authHeader = $"Bearer {cookieToken}";
                        }
                    }

                    using (var client = new System.Net.Http.HttpClient())
                    {
                        if (!string.IsNullOrEmpty(authHeader))
                        {
                            client.DefaultRequestHeaders.Add("Authorization", authHeader);
                        }

                        var requestBody = new PythonForecastRequest
                        {
                            historical_data = historyList,
                            target_input = targetInput
                        };

                        var json = System.Text.Json.JsonSerializer.Serialize(requestBody);
                        var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

                        var forecastUrl = _configuration["MlServiceSettings:ForecastUrl"];
                        if (string.IsNullOrEmpty(forecastUrl))
                        {
                            var baseUrl = _configuration["MlServiceSettings:BaseUrl"] ?? "http://localhost:8010";
                            forecastUrl = $"{baseUrl.TrimEnd('/')}/api/ml/forecast";
                        }
                        var response = await client.PostAsync(forecastUrl, content);
                        if (response.IsSuccessStatusCode)
                        {
                            var responseJson = await response.Content.ReadAsStringAsync();
                            var pythonResult = System.Text.Json.JsonSerializer.Deserialize<WellnessForecastDto>(responseJson, new System.Text.Json.JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });

                            if (pythonResult != null)
                            {
                                return ApiResponse<WellnessForecastDto>.Success(pythonResult, "Wellness score forecasted successfully using Python Random Forest Regressor.");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Fall back to local Gradient Descent engine if Python is unavailable
                    System.Diagnostics.Debug.WriteLine($"Python ML Service unreachable: {ex.Message}");
                }

                // Gradient Descent Solver
                int m = trainingSet.Count;
                int numFeatures = 5;
                double[] w = new double[numFeatures]; // Initialize weights to 0
                double b = 0.0;                       // Initialize bias to 0
                
                double alpha = 0.01;                  // Safe learning rate to prevent divergence
                int epochs = 1000;                    // Iterations

                for (int epoch = 0; epoch < epochs; epoch++)
                {
                    double[] dw = new double[numFeatures];
                    double db = 0.0;

                    for (int i = 0; i < m; i++)
                    {
                        double xi_dot_w = 0.0;
                        for (int j = 0; j < numFeatures; j++)
                        {
                            xi_dot_w += trainingSet[i][j] * w[j];
                        }
                        double prediction = xi_dot_w + b;
                        double error = prediction - labels[i];

                        for (int j = 0; j < numFeatures; j++)
                        {
                            dw[j] += error * trainingSet[i][j];
                        }
                        db += error;
                    }

                    // Update parameters
                    for (int j = 0; j < numFeatures; j++)
                    {
                        w[j] -= (alpha / m) * dw[j];
                    }
                    b -= (alpha / m) * db;
                }

                // Calculate metrics on the training set
                double sumSquaredErrors = 0.0;
                double sumAbsoluteErrors = 0.0;
                double sumLabels = 0.0;

                for (int i = 0; i < m; i++)
                {
                    double xi_dot_w = 0.0;
                    for (int j = 0; j < numFeatures; j++)
                    {
                        xi_dot_w += trainingSet[i][j] * w[j];
                    }
                    double prediction = xi_dot_w + b;
                    double error = prediction - labels[i];

                    sumSquaredErrors += error * error;
                    sumAbsoluteErrors += Math.Abs(error);
                    sumLabels += labels[i];
                }

                double meanLabel = sumLabels / m;
                double totalSumSquares = 0.0;
                for (int i = 0; i < m; i++)
                {
                    double diff = labels[i] - meanLabel;
                    totalSumSquares += diff * diff;
                }

                // Safe calculations to avoid divide-by-zero or NaN
                double rSquared = totalSumSquares > 0.0 ? (1.0 - (sumSquaredErrors / totalSumSquares)) : 0.0;
                double mae = sumAbsoluteErrors / m;

                if (double.IsNaN(rSquared) || double.IsInfinity(rSquared)) rSquared = 0.0;
                if (double.IsNaN(mae) || double.IsInfinity(mae)) mae = 0.0;

                string accuracyText = $"Gradient Descent Regression Model (R-Squared: {rSquared:F2}, Mean Error: {mae:F2})";

                // Predict prospective targets (normalized features)
                double[] targetFeatures = new double[]
                {
                    Math.Min(1.0, input.WaterIntake / 2000.0),
                    (input.SleepHours >= 7.0 && input.SleepHours <= 9.0) ? 1.0 : 0.0,
                    input.WorkoutMinutes > 0.0 ? 1.0 : 0.0,
                    input.PendingTasks == 0.0 ? 1.0 : 0.0,
                    Math.Min(1.0, input.PendingTasks / 5.0)
                };

                double predictedDot = 0.0;
                for (int j = 0; j < numFeatures; j++)
                {
                    predictedDot += targetFeatures[j] * w[j];
                }
                
                double finalScore = predictedDot + b;
                if (double.IsNaN(finalScore) || double.IsInfinity(finalScore))
                {
                    finalScore = 70.0; // safe baseline fallback if model diverged
                }
                finalScore = Math.Clamp(finalScore, 0.0, 100.0);

                // Compile recommendations based on targets
                string recommendation = "Your predicted score looks strong! Keep up your routines.";
                if (finalScore < 70)
                {
                    if (input.SleepHours < 7)
                        recommendation = "Forecast Warning: Short sleep is predicted to drag down your cognitive energy. Prioritize getting 7+ hours of sleep tonight.";
                    else if (input.WaterIntake < 2000)
                        recommendation = "Forecast Warning: Low hydration levels will cause brain fog. Try to increase water intake by carrying a bottle today.";
                    else if (input.PendingTasks > 4)
                        recommendation = "Forecast Warning: A high backlog of tasks is creating mental overload. Break them down and tackle the easiest task first.";
                }

                var result = new WellnessForecastDto
                {
                    ForecastedLifeScore = (float)Math.Round(finalScore, 1),
                    ModelAccuracy = accuracyText,
                    HealthRecommendation = recommendation
                };

                return ApiResponse<WellnessForecastDto>.Success(result, "Wellness score forecasted successfully using Gradient Descent Regression.");
            }
            catch (Exception ex)
            {
                return ApiResponse<WellnessForecastDto>.Fail($"Wellness forecasting failed: {ex.Message}");
            }
        }
    }

    public class PythonDailyFeature
    {
        public double water_ratio { get; set; }
        public double optimal_sleep { get; set; }
        public double workout_active { get; set; }
        public double no_tasks { get; set; }
        public double pending_tasks { get; set; }
        public double score { get; set; }
    }

    public class PythonTargetInput
    {
        public double water_intake { get; set; }
        public double sleep_hours { get; set; }
        public double workout_minutes { get; set; }
        public double steps_count { get; set; }
        public double pending_tasks { get; set; }
    }

    public class PythonForecastRequest
    {
        public List<PythonDailyFeature> historical_data { get; set; } = new();
        public PythonTargetInput target_input { get; set; } = new();
    }
}

