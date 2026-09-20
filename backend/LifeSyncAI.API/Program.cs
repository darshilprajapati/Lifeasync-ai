using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Services;

namespace LifeSyncAI.API
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // Enable legacy timestamp behavior for Npgsql to seamlessly handle DateTime without UTC cast issues
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            // Configure Serilog from appsettings
            var basePath = Environment.GetEnvironmentVariable("ASPNETCORE_CONTENTROOT") ?? AppContext.BaseDirectory;
            var configuration = new ConfigurationBuilder()
                .SetBasePath(basePath)
                .AddJsonFile("appsettings.json")
                .Build();

            var options = new Serilog.Settings.Configuration.ConfigurationReaderOptions(
                typeof(Serilog.ConsoleLoggerConfigurationExtensions).Assembly,
                typeof(Serilog.FileLoggerConfigurationExtensions).Assembly
            );

            Log.Logger = new LoggerConfiguration()
                .ReadFrom.Configuration(configuration, options)
                .CreateLogger();

            try
            {
                Log.Information("Starting LifeSync AI Web API...");

                var builder = WebApplication.CreateBuilder(args);

                // Ensure binding to dynamic PORT supplied by Render or container environments
                var renderPort = Environment.GetEnvironmentVariable("PORT");
                if (!string.IsNullOrEmpty(renderPort))
                {
                    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
                }

                // Use Serilog as the logging provider
                builder.Host.UseSerilog();

                // Add DbContext
                var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

                builder.Services.AddDbContext<ApplicationDbContext>(options =>
                {
                    bool isPostgreSql = rawConnectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
                                       (rawConnectionString.StartsWith("Server=", StringComparison.OrdinalIgnoreCase) && rawConnectionString.Contains(".neon.tech", StringComparison.OrdinalIgnoreCase)) ||
                                       rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                                       rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
                                       (rawConnectionString.Contains("Port=", StringComparison.OrdinalIgnoreCase) && rawConnectionString.Contains("Username=", StringComparison.OrdinalIgnoreCase));

                    if (isPostgreSql)
                    {
                        string npgsqlConnectionString = NormalizePostgreSqlConnectionString(rawConnectionString);
                        options.UseNpgsql(npgsqlConnectionString, npgsqlOptions =>
                        {
                            npgsqlOptions.MigrationsAssembly("LifeSyncAI.Core");
                            npgsqlOptions.CommandTimeout(60);
                            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                        });
                    }
                    else if (rawConnectionString.Contains(".db") || rawConnectionString.Contains("DataSource") || rawConnectionString.Contains("Data Source"))
                    {
                        options.UseSqlite(rawConnectionString);
                    }
                    else
                    {
                        options.UseSqlServer(rawConnectionString, sqlOptions => sqlOptions.CommandTimeout(60));
                    }
                });

                // Add Controllers and SignalR
                builder.Services.AddControllers()
                    .AddApplicationPart(typeof(Program).Assembly);
                builder.Services.AddHttpContextAccessor();

                // Register Authentication & User services
                builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
                builder.Services.AddScoped<IUserService, UserService>();
                builder.Services.AddScoped<IEmailService, EmailService>();

                // Register Module Services
                builder.Services.AddScoped<IPlannerService, PlannerService>();
                builder.Services.AddScoped<IFinanceService, FinanceService>();
                builder.Services.AddScoped<IHealthService, HealthService>();
                builder.Services.AddScoped<ICareerService, CareerService>();
                builder.Services.AddScoped<IVaultService, VaultService>();
                builder.Services.AddScoped<IAiInsightsService, AiInsightsService>();
                builder.Services.AddScoped<IWellnessForecasterService, WellnessForecasterService>();

                // Register Reports Asynchronous Background Processing Services
                builder.Services.AddSingleton<LifeSyncAI.Core.Services.IReportQueue, LifeSyncAI.Core.Services.ReportQueue>();
                builder.Services.AddSingleton<LifeSyncAI.Core.Services.IReportRepository, LifeSyncAI.Core.Services.ReportRepository>();
                builder.Services.AddHostedService<LifeSyncAI.Core.Services.ReportProcessorService>();

                // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
                builder.Services.AddEndpointsApiExplorer();
                builder.Services.AddSwaggerGen(c =>
                {
                    c.SwaggerDoc("v1", new OpenApiInfo 
                    { 
                        Title = "LifeSync AI API", 
                        Version = "v1",
                        Description = "Production-Level API for Personal Intelligence Platform"
                    });

                    // Add JWT Authentication option in Swagger UI
                    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                    {
                        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
                        Name = "Authorization",
                        In = ParameterLocation.Header,
                        Type = SecuritySchemeType.ApiKey,
                        Scheme = "Bearer"
                    });

                    c.AddSecurityRequirement(new OpenApiSecurityRequirement
                    {
                        {
                            new OpenApiSecurityScheme
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.SecurityScheme,
                                    Id = "Bearer"
                                }
                            },
                            Array.Empty<string>()
                        }
                    });
                });

                // Configure JWT Authentication
                var jwtSettings = builder.Configuration.GetSection("JwtSettings");
                var secretKey = jwtSettings["Secret"];
                if (string.IsNullOrEmpty(secretKey) || secretKey == "TemporaryFallbackSecretKeyMakeSureItIsLongEnough")
                {
                    if (!builder.Environment.IsDevelopment())
                    {
                        throw new InvalidOperationException("Production JWT Secret key is not configured or uses insecure defaults.");
                    }
                    secretKey = "TemporaryFallbackSecretKeyMakeSureItIsLongEnough";
                }
                var key = Encoding.ASCII.GetBytes(secretKey);

                builder.Services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment(); // Enforced HTTPS metadata in production
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ValidateIssuer = true,
                        ValidIssuer = jwtSettings["Issuer"],
                        ValidateAudience = true,
                        ValidAudience = jwtSettings["Audience"],
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero // Remove delay of token expiry
                    };

                    // Wire SignalR and HttpOnly Cookie Token Authorization
                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            // 1. Try to read token from authorization header first
                            string? authHeader = context.Request.Headers["Authorization"];
                            if (string.IsNullOrEmpty(authHeader))
                            {
                                // 2. If not present in headers, try reading from the HttpOnly cookie
                                if (context.Request.Cookies.TryGetValue("accessToken", out var cookieToken))
                                {
                                    context.Token = cookieToken;
                                }
                            }

                            // 3. Fallback to query string for SignalR hubs
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                            {
                                context.Token = accessToken;
                            }
                            return Task.CompletedTask;
                        }
                    };
                });

                // Configure reverse proxy forwarded headers for Render / Cloud container hosting
                builder.Services.Configure<ForwardedHeadersOptions>(options =>
                {
                    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                    options.KnownIPNetworks.Clear();
                    options.KnownProxies.Clear();
                });

                // CORS Policy setup - Explicitly allow production frontend origin and local dev origins with credentials
                var allowedOrigins = new List<string>
                {
                    "https://lifesync-ai.vercel.app",
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://127.0.0.1:5173",
                    "http://localhost:5048"
                };

                // Also support dynamic configuration from environment variables if provided (e.g. Cors__AllowedOrigins, CORS_ALLOWED_ORIGINS, or FRONTEND_URL)
                var envOrigins = builder.Configuration["Cors:AllowedOrigins"]
                                 ?? builder.Configuration["CORS_ALLOWED_ORIGINS"]
                                 ?? builder.Configuration["FRONTEND_URL"];

                if (!string.IsNullOrEmpty(envOrigins))
                {
                    var customOrigins = envOrigins.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var origin in customOrigins)
                    {
                        var trimmed = origin.TrimEnd('/');
                        if (!string.IsNullOrEmpty(trimmed) && !allowedOrigins.Contains(trimmed, StringComparer.OrdinalIgnoreCase))
                        {
                            allowedOrigins.Add(trimmed);
                        }
                    }
                }

                builder.Services.AddCors(options =>
                {
                    options.AddPolicy("CorsPolicy", policy =>
                    {
                        policy.WithOrigins(allowedOrigins.ToArray())
                              .AllowAnyMethod()
                              .AllowAnyHeader()
                              .AllowCredentials()
                              .WithExposedHeaders("X-Demo-OTP", "Content-Disposition")
                              .SetPreflightMaxAge(TimeSpan.FromMinutes(30));
                    });
                });

                var app = builder.Build();

                // 1. Process reverse proxy forwarded headers FIRST so Kestrel correctly reads HTTPS scheme from Render proxy
                app.UseForwardedHeaders();

                // 2. CORS must execute BEFORE HttpsRedirection, Routing, and Authentication
                // so that preflight OPTIONS requests are handled immediately with 204 No Content and appropriate CORS headers
                app.UseCors("CorsPolicy");

                // Auto-Migrate and Seed Database at Startup
                using (var scope = app.Services.CreateScope())
                {
                    var services = scope.ServiceProvider;
                    try
                    {
                        var context = services.GetRequiredService<ApplicationDbContext>();
                        await DatabaseSeeder.SeedAsync(context);
                        Log.Information("Database migration and seeding completed successfully.");
                    }
                    catch (Exception ex)
                    {
                        Log.Error(ex, "An error occurred while migrating or seeding the database.");
                    }
                }

                // Configure the HTTP request pipeline.
                if (app.Environment.IsDevelopment())
                {
                    app.UseSwagger();
                    app.UseSwaggerUI();

                    try
                    {
                        var url = "http://localhost:5048/swagger";
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = url,
                            UseShellExecute = true
                        });
                    }
                    catch (Exception ex)
                    {
                        Log.Warning($"Could not automatically launch browser: {ex.Message}");
                    }
                }

                if (!app.Environment.IsDevelopment())
                {
                    app.UseHttpsRedirection();
                }

                app.UseAuthentication();
                app.UseAuthorization();

                app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));
                app.MapControllers();
                
                // Map hubs for SignalR (to be defined later)
                // app.MapHub<NotificationHub>("/hubs/notifications");

                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "LifeSync AI Web API terminated unexpectedly during startup.");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }

        /// <summary>
        /// Normalizes PostgreSQL connection string formats (URI and ADO.NET) for reliable Npgsql connectivity.
        /// </summary>
        private static string NormalizePostgreSqlConnectionString(string raw)
        {
            if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var uri = new Uri(raw);
                    var userInfo = uri.UserInfo.Split(':');
                    var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
                    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                    var host = uri.Host;
                    var port = uri.Port > 0 ? uri.Port : 5432;
                    var database = uri.AbsolutePath.TrimStart('/');

                    var builder = new StringBuilder();
                    builder.Append($"Host={host};Port={port};Database={database};Username={username};Password={password};");
                    builder.Append("SSL Mode=Require;Trust Server Certificate=true;");
                    return builder.ToString();
                }
                catch (Exception ex)
                {
                    Log.Warning($"Failed to parse PostgreSQL URI, using raw connection string: {ex.Message}");
                }
            }

            // If it's a Neon host and does not explicitly specify SSL Mode, ensure SSL Mode=Require
            if (raw.Contains(".neon.tech", StringComparison.OrdinalIgnoreCase) && !raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase))
            {
                if (!raw.EndsWith(";")) raw += ";";
                raw += "SSL Mode=Require;Trust Server Certificate=true;";
            }

            return raw;
        }
    }
}
