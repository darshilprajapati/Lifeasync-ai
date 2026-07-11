using System.ComponentModel.DataAnnotations;

namespace LifeSyncAI.Core.DTO.Input.Vault
{
    public class CreateVaultItemDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Content is required.")]
        public string Content { get; set; } = string.Empty;
    }
}
