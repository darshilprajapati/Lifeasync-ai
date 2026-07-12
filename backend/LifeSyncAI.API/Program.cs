using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
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

                // Use Serilog as the logging provider
                builder.Host.UseSerilog();

                // Add DbContext
                var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
                builder.Services.AddDbContext<ApplicationDbContext>(options =>
                {
                    if (connectionString.Contains(".db") || connectionString.Contains("DataSource") || connectionString.Contains("Data Source"))
                    {
                        options.UseSqlite(connectionString);
                    }
                    else
                    {
                        options.UseSqlServer(connectionString);
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

                // CORS Policy setup - Allow any origin securely with credentialed cookie/token support
                builder.Services.AddCors(options =>
                {
                    options.AddPolicy("CorsPolicy", policy =>
                    {
                        policy.SetIsOriginAllowed(origin => true)
                              .AllowAnyMethod()
                              .AllowAnyHeader()
                              .AllowCredentials() // Required for SignalR cookies/tokens
                              .WithExposedHeaders("X-Demo-OTP");
                    });
                });

                var app = builder.Build();

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

                app.UseCors("CorsPolicy");

                app.UseAuthentication();
                app.UseAuthorization();

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
    }
}
