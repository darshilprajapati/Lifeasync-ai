using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Services
{
    public interface IReportQueue
    {
        void QueueReportRequest(ReportRequest request);
        Task<ReportRequest> DequeueAsync(CancellationToken cancellationToken);
    }

    public class ReportQueue : IReportQueue
    {
        private readonly ConcurrentQueue<ReportRequest> _queue = new();
        private readonly SemaphoreSlim _signal = new(0);

        public void QueueReportRequest(ReportRequest request)
        {
            _queue.Enqueue(request);
            _signal.Release();
        }

        public async Task<ReportRequest> DequeueAsync(CancellationToken cancellationToken)
        {
            await _signal.WaitAsync(cancellationToken);
            _queue.TryDequeue(out var request);
            return request!;
        }
    }
}

