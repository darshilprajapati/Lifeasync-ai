using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LifeSyncAI.Core.DTO.Output
{
    public class PaginatedUsersDto
    {
        [JsonPropertyName("users")]
        public List<UserDto> Users { get; set; } = new();

        [JsonPropertyName("totalCount")]
        public int TotalCount { get; set; }

        [JsonPropertyName("pageNumber")]
        public int PageNumber { get; set; }

        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; }

        [JsonPropertyName("totalPages")]
        public int TotalPages { get; set; }
    }
}
