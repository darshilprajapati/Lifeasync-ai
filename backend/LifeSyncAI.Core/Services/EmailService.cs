using System;
using System.Net;
using System.Net.Mail;
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

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var section = _configuration.GetSection("SmtpSettings");
            var host = section["Host"];
            var portStr = section["Port"];
            var username = section["Username"];
            var password = section["Password"];
            var enableSslStr = section["EnableSsl"];
            var senderEmail = section["SenderEmail"] ?? "no-reply@lifesync.ai";
            var senderName = section["SenderName"] ?? "LifeSync AI";

            // If SMTP configuration is missing, run in Mock Mode for easy testing
            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                _logger.LogInformation("SMTP settings not fully configured in appsettings.json. Running in MOCK Mode.");
                _logger.LogInformation("=========================================================================");
                _logger.LogInformation("SIMULATED EMAIL DISPATCH:");
                _logger.LogInformation("TO: {ToEmail}", toEmail);
                _logger.LogInformation("SUBJECT: {Subject}", subject);
                _logger.LogInformation("BODY:\n{Body}", body);
                _logger.LogInformation("=========================================================================");
                return;
            }

            int port = int.TryParse(portStr, out var parsedPort) ? parsedPort : 587;
            bool enableSsl = !bool.TryParse(enableSslStr, out var parsedSsl) || parsedSsl;

            try
            {
                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(senderEmail, senderName);
                    mailMessage.To.Add(new MailAddress(toEmail));
                    mailMessage.Subject = subject;
                    mailMessage.Body = body;
                    mailMessage.IsBodyHtml = true;

                    using (var smtpClient = new SmtpClient(host, port))
                    {
                        smtpClient.Credentials = new NetworkCredential(username, password);
                        smtpClient.EnableSsl = enableSsl;
                        
                        await smtpClient.SendMailAsync(mailMessage);
                        _logger.LogInformation("Successfully sent OTP email to {ToEmail} using configured SMTP server.", toEmail);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deliver email to {ToEmail} via SMTP.", toEmail);
                throw new Exception($"Email delivery failed: {ex.Message}", ex);
            }
        }
    }
}
