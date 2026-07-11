using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.DTO.Input.Career;
using LifeSyncAI.Core.DTO.Output.Career;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CareerController : ControllerBase
    {
        private readonly ICareerService _careerService;

        public CareerController(ICareerService careerService)
        {
            _careerService = careerService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<JobApplicationDto>>>> GetApplications()
        {
            var userId = GetUserId();
            var result = await _careerService.GetApplicationsAsync(userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<JobApplicationDto>>> CreateApplication([FromBody] CreateJobApplicationDto dto)
        {
            var userId = GetUserId();
            var result = await _careerService.CreateApplicationAsync(dto, userId);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateStatus(int id, [FromBody] UpdateJobApplicationStatusDto dto)
        {
            var result = await _careerService.UpdateStatusAsync(id, dto.Status);
            if (!result.IsSuccess) return BadRequest(result);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteApplication(int id)
        {
            var result = await _careerService.DeleteApplicationAsync(id);
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
