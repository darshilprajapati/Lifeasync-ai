using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Output.Search;

namespace LifeSyncAI.Core.Services
{
    public class ExternalSearchService : IExternalSearchService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ExternalSearchService> _logger;
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(7) };

        public ExternalSearchService(IConfiguration configuration, ILogger<ExternalSearchService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<SearchResponseDto> SearchAsync(string query, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new SearchResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = "Search query is empty."
                };
            }

            var apiKey = _configuration["GoogleSearch:ApiKey"]
                         ?? Environment.GetEnvironmentVariable("GOOGLE_SEARCH_API_KEY");
            var cx = _configuration["GoogleSearch:SearchEngineId"]
                     ?? Environment.GetEnvironmentVariable("GOOGLE_SEARCH_CX");

            if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(cx))
            {
                _logger.LogInformation("External search requested for '{Query}', but Google Search API key or Search Engine ID is not configured.", query);
                return new SearchResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = "External search provider is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX."
                };
            }

            try
            {
                var encodedQuery = Uri.EscapeDataString(query.Trim());
                var requestUrl = $"https://www.googleapis.com/customsearch/v1?key={apiKey}&cx={cx}&q={encodedQuery}&num=3";

                using var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Google Search API returned status code {StatusCode} for query '{Query}'.", response.StatusCode, query);
                    return new SearchResponseDto
                    {
                        IsSuccess = false,
                        ErrorMessage = $"External search provider returned status code {response.StatusCode}."
                    };
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var jsonDoc = JsonDocument.Parse(content);
                var root = jsonDoc.RootElement;

                var items = new List<SearchResultItem>();
                if (root.TryGetProperty("items", out var itemsElement) && itemsElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in itemsElement.EnumerateArray())
                    {
                        var title = item.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
                        var snippet = item.TryGetProperty("snippet", out var s) ? s.GetString() ?? string.Empty : string.Empty;
                        var link = item.TryGetProperty("link", out var l) ? l.GetString() ?? string.Empty : string.Empty;

                        if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(link))
                        {
                            items.Add(new SearchResultItem
                            {
                                Title = title,
                                Snippet = snippet,
                                Url = link
                            });
                        }
                    }
                }

                _logger.LogInformation("External search for '{Query}' returned {Count} results.", query, items.Count);
                return new SearchResponseDto
                {
                    IsSuccess = items.Count > 0,
                    Items = items,
                    ErrorMessage = items.Count == 0 ? "No search results found." : null
                };
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("External search for '{Query}' timed out.", query);
                return new SearchResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = "External search request timed out."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during external search for '{Query}'.", query);
                return new SearchResponseDto
                {
                    IsSuccess = false,
                    ErrorMessage = "Failed to retrieve external search results."
                };
            }
        }
    }
}
