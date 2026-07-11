namespace LifeSyncAI.Core.Models
{
    public class VaultItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string EncryptedContent { get; set; } = string.Empty;
        public int UserId { get; set; }
    }
}
