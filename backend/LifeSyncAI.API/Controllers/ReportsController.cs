using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;
using LifeSyncAI.Core.Services;

namespace LifeSyncAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportQueue _queue;
        private readonly IReportRepository _repository;

        public ReportsController(IReportQueue queue, IReportRepository repository)
        {
            _queue = queue;
            _repository = repository;
        }

        [HttpPost("request")]
        public ActionResult<ApiResponse<ReportRequest>> RequestReport([FromBody] RequestReportDto dto)
        {
            var userId = GetUserId();
            if (userId == 0)
            {
                return Unauthorized(ApiResponse<ReportRequest>.Fail("User is not authenticated."));
            }

            var request = new ReportRequest
            {
                UserId = userId,
                Module = dto.Module,
                Frequency = dto.Frequency,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _repository.Save(request);
            _queue.QueueReportRequest(request);

            return Ok(ApiResponse<ReportRequest>.Success(request, "Report request queued successfully. The background worker is processing your request."));
        }

        [HttpGet("status/{id}")]
        public ActionResult<ApiResponse<ReportRequest>> GetReportStatus(string id)
        {
            var request = _repository.GetById(id);
            if (request == null)
            {
                return NotFound(ApiResponse<ReportRequest>.Fail("Report request not found."));
            }

            var userId = GetUserId();
            if (request.UserId != userId)
            {
                return Forbid();
            }

            return Ok(ApiResponse<ReportRequest>.Success(request, "Report status retrieved successfully."));
        }

        [HttpGet("download/{id}")]
        [AllowAnonymous] // Allow download redirect or file stream directly
        public IActionResult DownloadReport(string id)
        {
            var request = _repository.GetById(id);
            if (request == null || request.Status != "Completed" || string.IsNullOrEmpty(request.FilePath))
            {
                return NotFound("Report file is not ready or does not exist.");
            }

            if (!System.IO.File.Exists(request.FilePath))
            {
                return NotFound("The generated report file could not be located on the server.");
            }

            var memory = new MemoryStream();
            using (var stream = new FileStream(request.FilePath, FileMode.Open, FileAccess.Read))
            {
                stream.CopyTo(memory);
            }
            memory.Position = 0;

            string contentType = "application/pdf";
            string downloadName = $"{request.Module}_Report_{request.Frequency}_{DateTime.Now:yyyyMMdd}.pdf";

            return this.File(memory, contentType, downloadName);
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }

    public class RequestReportDto
    {
        public string Module { get; set; } = string.Empty; // 'Planner', 'Finance', 'Health', 'Career', 'Vault', 'AiInsights', 'All'
        public string Frequency { get; set; } = string.Empty; // 'Daily', 'Weekly', 'Monthly', 'Yearly'
    }
}
