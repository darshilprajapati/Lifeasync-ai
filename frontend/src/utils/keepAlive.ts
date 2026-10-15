import apiClient from '../api/apiClient';

const STORAGE_KEY = 'lifesync_last_daily_activation';

/**
 * Sends a non-blocking keep-alive ping to the backend API to wake up Render and Neon PostgreSQL.
 * Uses /api/system/ping to keep services active without dispatching duplicate status emails.
 */
export async function triggerDailyDatabaseActivation(): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastExecuted = localStorage.getItem(STORAGE_KEY);

  if (lastExecuted === todayStr) {
    return; // Already executed today on this client
  }

  try {
    console.log('[LifeSync Keep-Alive] Triggering database wake-up ping...');
    await apiClient.get('/api/system/ping', {
      timeout: 30000,
    });

    localStorage.setItem(STORAGE_KEY, todayStr);
    console.log('[LifeSync Keep-Alive] Wake-up ping succeeded.');
  } catch (error) {
    // Non-blocking; fails silently on UI while server boots up
    console.warn('[LifeSync Keep-Alive] Wake-up ping sent:', error);
  }
}

/**
 * Initializes automatic scheduling:
 * 1. Checks on initial mount.
 * 2. Checks periodically every 15 minutes to fire when 12:00 PM arrives.
 */
export function setupNoonKeepAliveScheduler(): () => void {
  const evaluate = () => {
    const now = new Date();
    // If it is 12:00 PM (12:00) or later, trigger the daily activation
    if (now.getHours() >= 12) {
      triggerDailyDatabaseActivation();
    }
  };

  evaluate();
  const intervalId = window.setInterval(evaluate, 15 * 60 * 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}
