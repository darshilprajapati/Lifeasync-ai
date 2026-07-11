using System.Threading.Tasks;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    /// <summary>
    /// Contract for email delivery service.
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Sends an email asynchronously with specified recipient, subject title, and body.
        /// </summary>
        Task SendEmailAsync(string toEmail, string subject, string body);
    }
}
