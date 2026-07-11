using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    public interface IReportRepository
    {
        void Save(ReportRequest request);
        ReportRequest? GetById(string id);
        List<ReportRequest> GetByUserId(int userId);
    }

    public class ReportRepository : IReportRepository
    {
        private readonly ConcurrentDictionary<string, ReportRequest> _cache = new();

        public void Save(ReportRequest request)
        {
            _cache[request.Id] = request;
        }

        public ReportRequest? GetById(string id)
        {
            _cache.TryGetValue(id, out var request);
            return request;
        }

        public List<ReportRequest> GetByUserId(int userId)
        {
            return _cache.Values
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.RequestedAt)
                .ToList();
        }
    }
}

