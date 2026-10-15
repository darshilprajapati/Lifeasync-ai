import apiClient from '../api/apiClient';

const KEEPALIVE_SECRET = 'LifeSync_KeepAlive_Secret_2026_Key!';
const STORAGE_KEY = 'lifesync_last_daily_activation';

/**
 * Sends a non-blocking keep-alive ping to the backend API to wake up Neon PostgreSQL
 * and trigger the daily activation status email.
 */
export async function triggerDailyDatabaseActivation(): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastExecuted = localStorage.getItem(STORAGE_KEY);

  if (lastExecuted === todayStr) {
    return; // Already executed today on this client
  }

  try {
    console.log('[LifeSync Keep-Alive] Triggering daily database activation ping...');
    await apiClient.get('/api/system/keep-alive', {
      headers: {
        'X-KeepAlive-Key': KEEPALIVE_SECRET,
      },
      timeout: 60000, // 60s timeout to allow free tier backend to cold-start
    });

    localStorage.setItem(STORAGE_KEY, todayStr);
    console.log('[LifeSync Keep-Alive] Daily activation ping succeeded. Status email dispatched.');
  } catch (error) {
    // Non-blocking; fails silently on UI while server boots up
    console.warn('[LifeSync Keep-Alive] Activation ping sent:', error);
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
