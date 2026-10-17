import axios from 'axios';

/**
 * Global Axios API Client instance for LifeSync AI.
 * Configurations:
 * - baseURL: Points to localhost ASP.NET Web API (http://localhost:5048).
 * - withCredentials: true. Automatically attaches secure HttpOnly cookies (accessToken, refreshToken).
 * - Interceptors: Automatically catches 401 errors, rotates tokens via /api/auth/refresh, and retries original requests.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5048',
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach client date and timezone headers to all outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    config.headers['X-Client-Date'] = `${y}-${m}-${d}`;
    try {
      config.headers['X-Client-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      config.headers['X-Client-Timezone'] = 'UTC';
    }
    config.headers['X-Client-Offset'] = now.getTimezoneOffset().toString();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor for Silent Refresh on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard: Prevent intercepting Auth endpoints to avoid infinite refresh loops
    if (
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/register') ||
      originalRequest.url?.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // Intercept 401 Unauthorized responses
    if (error.response?.status === 401) {
      if (!originalRequest._retry) {
        if (isRefreshing) {
          // If refresh is already in-progress, queue request until refresh finishes
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              originalRequest._retry = true;
              return apiClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Trigger silent token refresh - server updates secure cookies automatically
          await apiClient.post('/api/auth/refresh');
          
          processQueue(null);
          isRefreshing = false;
          
          // Retry the original request with new cookies active
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          isRefreshing = false;
          
          // Refresh failed: session cannot be recovered
          localStorage.removeItem('lifesync_token');
          window.dispatchEvent(new CustomEvent('lifesync:unauthorized'));
          
          return Promise.reject(refreshError);
        }
      } else {
        // Request already retried and still returned 401: unrecoverable session
        localStorage.removeItem('lifesync_token');
        window.dispatchEvent(new CustomEvent('lifesync:unauthorized'));
      }
    }

    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      window.dispatchEvent(
        new CustomEvent('lifesync:notify', {
          detail: {
            type: 'error',
            message: 'Unable to connect to LifeSync AI servers. Please verify your connection.',
            title: 'Network Disconnected'
          }
        })
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
