using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LifeSyncAI.Core.DTO.Output.LifeScore
{
    public class LeaderboardEntryDto
    {
        [JsonPropertyName("rank")]
        public int Rank { get; set; }

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonPropertyName("totalLifeScore")]
        public double TotalLifeScore { get; set; }

        [JsonPropertyName("isCurrentUser")]
        public bool IsCurrentUser { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }
    }

    public class LeaderboardResponseDto
    {
        [JsonPropertyName("scope")]
        public string Scope { get; set; } = "city";

        [JsonPropertyName("scopeValue")]
        public string ScopeValue { get; set; } = string.Empty;

        [JsonPropertyName("hasLocation")]
        public bool HasLocation { get; set; }

        [JsonPropertyName("currentUserRank")]
        public int CurrentUserRank { get; set; }

        [JsonPropertyName("currentUserTotalScore")]
        public double CurrentUserTotalScore { get; set; }

        [JsonPropertyName("topRankings")]
        public List<LeaderboardEntryDto> TopRankings { get; set; } = new List<LeaderboardEntryDto>();

        [JsonPropertyName("totalParticipants")]
        public int TotalParticipants { get; set; }

        [JsonPropertyName("page")]
        public int Page { get; set; } = 1;

        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; } = 20;

        [JsonPropertyName("totalPages")]
        public int TotalPages { get; set; } = 1;
    }
}
