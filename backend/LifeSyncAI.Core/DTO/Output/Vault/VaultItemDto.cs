namespace LifeSyncAI.Core.DTO.Output.Vault
{
    public class VaultItemDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty; // Holds decrypted text when sent to UI
        public int UserId { get; set; }
    }
}
