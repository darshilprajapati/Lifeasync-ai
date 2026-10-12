using System.Threading;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Output.Search;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IExternalSearchService
    {
        /// <summary>
        /// Performs an external web search using the configured search provider (e.g., Google Custom Search).
        /// Returns empty or error result safely if no search provider key is configured.
        /// </summary>
        Task<SearchResponseDto> SearchAsync(string query, CancellationToken cancellationToken = default);
    }
}
