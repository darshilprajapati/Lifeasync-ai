using System.Collections.Generic;

namespace LifeSyncAI.Core.Responses
{
    /// <summary>
    /// Unified API Response wrapper for all standard controller endpoints.
    /// </summary>
    /// <typeparam name="T">The type of returned data payload.</typeparam>
    public class ApiResponse<T>
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
        public List<string> Errors { get; set; } = new();

        public static ApiResponse<T> Success(T data, string message = "Operation completed successfully.")
        {
            return new ApiResponse<T>
            {
                IsSuccess = true,
                Message = message,
                Data = data
            };
        }

        public static ApiResponse<T> Fail(string message, List<string> errors = null)
        {
            return new ApiResponse<T>
            {
                IsSuccess = false,
                Message = message,
                Errors = errors ?? new List<string>()
            };
        }
    }

    /// <summary>
    /// Unified API Response wrapper for paginated endpoints.
    /// </summary>
    /// <typeparam name="T">The type of item in the list.</typeparam>
    public class PagedResponse<T> : ApiResponse<List<T>>
    {
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public int TotalRecords { get; set; }

        public static PagedResponse<T> CreatePaged(List<T> data, int pageNumber, int pageSize, int totalRecords, string message = "Data retrieved successfully.")
        {
            int totalPages = pageSize > 0 ? (int)System.Math.Ceiling(totalRecords / (double)pageSize) : 0;
            return new PagedResponse<T>
            {
                IsSuccess = true,
                Message = message,
                Data = data,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalRecords = totalRecords,
                TotalPages = totalPages
            };
        }
    }

    /// <summary>
    /// Details structure returned in case of exceptions or validations.
    /// </summary>
    public class ErrorResponse
    {
        public string Message { get; set; }
        public List<string> Errors { get; set; } = new();
        public string TraceId { get; set; }
    }
}
