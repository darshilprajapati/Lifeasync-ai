using System;
using System.Net;
using System.Net.Mail;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeSyncAI.Core.Contracts.Interfaces.Services;

namespace LifeSyncAI.Core.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private static readonly HttpClient _httpClient = new HttpClient();

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var section = _configuration.GetSection("EmailSettings");
            var provider = section["Provider"] ?? "Mock";
            var apiKey = section["ApiKey"];
            var senderEmail = section["SenderEmail"] ?? "no-reply@lifesync.ai";
            var senderName = section["SenderName"] ?? "LifeSync AI";

            // Backwards compatibility check: If provider is mock but SMTP is configured, auto-select SMTP
            if (provider.Equals("Mock", StringComparison.OrdinalIgnoreCase))
            {
                var smtpHost = _configuration.GetSection("SmtpSettings")["Host"];
                var smtpUser = _configuration.GetSection("SmtpSettings")["Username"];
                var smtpPass = _configuration.GetSection("SmtpSettings")["Password"];

                if (!string.IsNullOrEmpty(smtpHost) &&
                    smtpHost != "smtp.gmail.com" &&
                    !string.IsNullOrEmpty(smtpUser) && !smtpUser.Contains("YOUR_SMTP") &&
                    !string.IsNullOrEmpty(smtpPass) && !smtpPass.Contains("YOUR_SMTP"))
                {
                    provider = "Smtp";
                }
            }

            // 1. BREVO WEB API SENDER
            if (provider.Equals("Brevo", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(apiKey))
                {
                    throw new Exception("Brevo API Key is missing. Please configure EmailSettings__ApiKey.");
                }

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                requestMessage.Headers.Add("api-key", apiKey);
                
                var payload = new
                {
                    sender = new { name = senderName, email = senderEmail },
                    to = new[] { new { email = toEmail } },
                    subject = subject,
                    htmlContent = body
                };

                var jsonPayload = System.Text.Json.JsonSerializer.Serialize(payload);
                requestMessage.Content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(requestMessage);
                if (!response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Brevo API returned status code {response.StatusCode}: {responseContent}");
                }
                
                _logger.LogInformation("Successfully sent OTP email to {ToEmail} using Brevo Web API.", toEmail);
                return;
            }

            // 2. SENDGRID WEB API SENDER
            if (provider.Equals("SendGrid", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(apiKey))
                {
                    throw new Exception("SendGrid API Key is missing. Please configure EmailSettings__ApiKey.");
                }

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.sendgrid.com/v3/mail/send");
                requestMessage.Headers.Add("Authorization", $"Bearer {apiKey}");
                
                var payload = new
                {
                    personalizations = new[]
                    {
                        new { to = new[] { new { email = toEmail } } }
                    },
                    from = new { email = senderEmail, name = senderName },
                    subject = subject,
                    content = new[]
                    {
                        new { type = "text/html", value = body }
                    }
                };

                var jsonPayload = System.Text.Json.JsonSerializer.Serialize(payload);
                requestMessage.Content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(requestMessage);
                if (!response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    throw new Exception($"SendGrid API returned status code {response.StatusCode}: {responseContent}");
                }
                
                _logger.LogInformation("Successfully sent OTP email to {ToEmail} using SendGrid Web API.", toEmail);
                return;
            }

            // 3. SMTP EMAIL SENDER
            if (provider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
            {
                var smtpSection = _configuration.GetSection("SmtpSettings");
                var host = smtpSection["Host"];
                var portStr = smtpSection["Port"];
                var username = smtpSection["Username"];
                var password = smtpSection["Password"];
                var enableSslStr = smtpSection["EnableSsl"];
                var smtpSenderEmail = smtpSection["SenderEmail"] ?? senderEmail;
                var smtpSenderName = smtpSection["SenderName"] ?? senderName;

                if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) ||
                    username.Contains("YOUR_SMTP") || password.Contains("YOUR_SMTP"))
                {
                    // Fallback to mock mode if SMTP details are placeholders
                    provider = "Mock";
                }
                else
                {
                    int port = int.TryParse(portStr, out var parsedPort) ? parsedPort : 587;
                    bool enableSsl = !bool.TryParse(enableSslStr, out var parsedSsl) || parsedSsl;

                    try
                    {
                        using (var mailMessage = new MailMessage())
                        {
                            mailMessage.From = new MailAddress(smtpSenderEmail, smtpSenderName);
                            mailMessage.To.Add(new MailAddress(toEmail));
                            mailMessage.Subject = subject;
                            mailMessage.Body = body;
                            mailMessage.IsBodyHtml = true;

                            using (var smtpClient = new SmtpClient(host, port))
                            {
                                smtpClient.Credentials = new NetworkCredential(username, password);
                                smtpClient.EnableSsl = enableSsl;
                                
                                await smtpClient.SendMailAsync(mailMessage);
                                _logger.LogInformation("Successfully sent OTP email to {ToEmail} using SMTP server.", toEmail);
                            }
                        }
                        return;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to deliver email to {ToEmail} via SMTP.", toEmail);
                        throw new Exception($"Email delivery failed via SMTP: {ex.Message}", ex);
                    }
                }
            }

            // 4. MOCK EMAIL SENDER (FALLBACK)
            if (provider.Equals("Mock", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("SMTP settings not fully configured in appsettings.json. Running in MOCK Mode.");
                _logger.LogInformation("=========================================================================");
                _logger.LogInformation("SIMULATED EMAIL DISPATCH:");
                _logger.LogInformation("TO: {ToEmail}", toEmail);
                _logger.LogInformation("SUBJECT: {Subject}", subject);
                _logger.LogInformation("BODY:\n{Body}", body);
                _logger.LogInformation("=========================================================================");
            }
        }
    }
}
