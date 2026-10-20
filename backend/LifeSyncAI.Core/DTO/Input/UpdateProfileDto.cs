using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace LifeSyncAI.Core.DTO.Input
{
    public class UpdateProfileDto
    {
        [Required(ErrorMessage = "FullName is required.")]
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters.")]
        [JsonPropertyName("fullName")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("profilePhoto")]
        public string? ProfilePhoto { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }
    }
}
