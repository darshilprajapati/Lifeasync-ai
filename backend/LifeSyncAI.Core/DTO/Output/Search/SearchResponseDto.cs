using System.Collections.Generic;

namespace LifeSyncAI.Core.DTO.Output.Search
{
    public class SearchResultItem
    {
        public string Title { get; set; } = string.Empty;
        public string Snippet { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }

    public class SearchResponseDto
    {
        public bool IsSuccess { get; set; }
        public List<SearchResultItem> Items { get; set; } = new List<SearchResultItem>();
        public string? ErrorMessage { get; set; }
    }
}
