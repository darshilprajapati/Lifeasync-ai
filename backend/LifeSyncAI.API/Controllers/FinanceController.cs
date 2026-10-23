using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Finance;
using LifeSyncAI.Core.DTO.Output.Finance;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FinanceController : ControllerBase
    {
        private readonly IFinanceService _financeService;

        public FinanceController(IFinanceService financeService)
        {
            _financeService = financeService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<TransactionDto>>>> GetTransactions()
        {
            var userId = GetUserId();
            var result = await _financeService.GetTransactionsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<TransactionDto>>> CreateTransaction([FromBody] CreateTransactionDto dto)
        {
            var userId = GetUserId();
            var result = await _financeService.CreateTransactionAsync(dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<TransactionDto>>> UpdateTransaction(int id, [FromBody] UpdateTransactionDto dto)
        {
            var userId = GetUserId();
            var result = await _financeService.UpdateTransactionAsync(id, dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteTransaction(int id)
        {
            var userId = GetUserId();
            var result = await _financeService.DeleteTransactionAsync(id, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<ApiResponse<FinanceSummaryDto>>> GetSummary()
        {
            var userId = GetUserId();
            var result = await _financeService.GetSummaryAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("recurring")]
        public async Task<ActionResult<ApiResponse<List<LifeSyncAI.Core.Models.RecurringItem>>>> GetRecurringItems()
        {
            var userId = GetUserId();
            var result = await _financeService.GetRecurringItemsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("recurring")]
        public async Task<ActionResult<ApiResponse<LifeSyncAI.Core.Models.RecurringItem>>> CreateRecurringItem([FromBody] CreateRecurringItemDto dto)
        {
            var userId = GetUserId();
            var result = await _financeService.CreateRecurringItemAsync(dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("recurring/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteRecurringItem(int id)
        {
            var userId = GetUserId();
            var result = await _financeService.DeleteRecurringItemAsync(id, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("recurring/{id}/pay")]
        public async Task<ActionResult<ApiResponse<TransactionDto>>> PayRecurringItem(int id)
        {
            var userId = GetUserId();
            var result = await _financeService.PayRecurringItemAsync(id, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("budgets")]
        public async Task<ActionResult<ApiResponse<List<UserBudgetDto>>>> GetBudgets()
        {
            var userId = GetUserId();
            var result = await _financeService.GetBudgetsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost("budgets")]
        public async Task<ActionResult<ApiResponse<UserBudgetDto>>> CreateBudget([FromBody] CreateUserBudgetDto dto)
        {
            var userId = GetUserId();
            var result = await _financeService.CreateBudgetAsync(userId, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("budgets/{id}")]
        public async Task<ActionResult<ApiResponse<UserBudgetDto>>> UpdateBudget(int id, [FromBody] UpdateUserBudgetDto dto)
        {
            var userId = GetUserId();
            var result = await _financeService.UpdateBudgetAsync(userId, id, dto);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("budgets/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteBudget(int id)
        {
            var userId = GetUserId();
            var result = await _financeService.DeleteBudgetAsync(userId, id);
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
