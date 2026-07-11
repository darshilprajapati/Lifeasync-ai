using System.Collections.Generic;
using System.Threading.Tasks;
using LifeSyncAI.Core.DTO.Input.Vault;
using LifeSyncAI.Core.DTO.Output.Vault;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Contracts.Interfaces.Services
{
    public interface IVaultService
    {
        Task<ApiResponse<List<VaultItemDto>>> GetItemsAsync(int userId);
        Task<ApiResponse<VaultItemDto>> CreateItemAsync(CreateVaultItemDto dto, int userId);
        Task<ApiResponse<bool>> DeleteItemAsync(int id);
    }
}
