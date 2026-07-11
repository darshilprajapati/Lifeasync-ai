using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Vault;
using LifeSyncAI.Core.DTO.Output.Vault;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/vault")]
    public class VaultController : ControllerBase
    {
        private readonly IVaultService _vaultService;

        public VaultController(IVaultService vaultService)
        {
            _vaultService = vaultService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<VaultItemDto>>>> GetItems()
        {
            var userId = GetUserId();
            var result = await _vaultService.GetItemsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<VaultItemDto>>> CreateItem([FromBody] CreateVaultItemDto dto)
        {
            var userId = GetUserId();
            var result = await _vaultService.CreateItemAsync(dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(int id)
        {
            var result = await _vaultService.DeleteItemAsync(id);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }
}
