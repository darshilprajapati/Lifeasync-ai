namespace LifeSyncAI.Core.DTO.Output.Vault
{
    public class VaultItemDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? Category { get; set; } = "Login";
        public int UserId { get; set; }
    }
}
