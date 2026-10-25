import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider';
import { ThemeProvider as LifeSyncThemeProvider } from './context/ThemeProvider';
import { trackNavigation } from './utils/analytics';
import { setupNoonKeepAliveScheduler } from './utils/keepAlive';
import { SplashScreen } from './components/SplashScreen';

// Initialize TanStack query client
const queryClient = new QueryClient();

function AppContent() {
  const { loading } = useAuth();
  const location = useLocation();
  const lastTrackedRouteRef = useRef<string | null>(null);

  // Startup splash state machine:
  // 1. Splash starts visible on fresh application load.
  // 2. Minimum display window (1,300ms) guarantees the visual effect is noticeable.
  // 3. Waits for both minDurationElapsed AND auth initialization (!loading).
  // 4. Smoothly fades out and never reappears during client-side navigation.
  // 5. 3,500ms failsafe ensures it can never get stuck on slow networks.
  // 6. Optional ?splash_freeze=true query parameter holds the splash for visual inspection.
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [isSplashDismissed, setIsSplashDismissed] = useState(false);

  const isFrozenForTesting = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('splash_freeze') === 'true';

  // Mark mount time for lifecycle diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __lifesync_splash_mounted?: boolean }).__lifesync_splash_mounted = true;
      (window as unknown as { __lifesync_splash_start?: number }).__lifesync_splash_start = performance.now();
    }
  }, []);

  // Minimum duration timer (1,300ms) started on app mount
  useEffect(() => {
    if (isFrozenForTesting) return;
    const timer = setTimeout(() => {
      setMinDurationElapsed(true);
    }, 1300);
    return () => clearTimeout(timer);
  }, [isFrozenForTesting]);

  // Dismiss splash when both the minimum duration has elapsed and auth is ready
  useEffect(() => {
    if (isFrozenForTesting) return;
    if (minDurationElapsed && !loading) {
      setIsSplashDismissed(true);
      if (typeof window !== 'undefined') {
        (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
        (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
      }
    }
  }, [minDurationElapsed, loading, isFrozenForTesting]);

  // Failsafe timer (3,500ms) to guarantee dismissal even if auth or network stalls
  useEffect(() => {
    if (isFrozenForTesting || isSplashDismissed) return;
    const failsafe = setTimeout(() => {
      setIsSplashDismissed(true);
      if (typeof window !== 'undefined') {
        (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
        (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
      }
    }, 3500);
    return () => clearTimeout(failsafe);
  }, [isFrozenForTesting, isSplashDismissed]);

  // Active only during initial application launch
  const showSplashOverlay = !isSplashDismissed;

  // Dedicated navigation events fired exactly once per genuine route transition (preventing re-render duplicates)
  useEffect(() => {
    const rawPath = location.pathname.toLowerCase();
    const currentPath = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
    if (lastTrackedRouteRef.current === currentPath) {
      return;
    }
    lastTrackedRouteRef.current = currentPath;

    const routeEvents: Record<string, string> = {
      '/': 'dashboard_view',
      '/planner': 'planner_view',
      '/finance': 'finance_view',
      '/health': 'health_view',
      '/career': 'career_view',
      '/vault': 'vault_view',
      '/insights': 'ai_insights_view',
      '/profile': 'profile_view',
      '/admin': 'admin_panel_view',
      '/login': 'login_view',
      '/register': 'register_view',
      '/forgot-password': 'forgot_password_view',
    };

    const eventName = routeEvents[currentPath];
    if (eventName) {
      trackNavigation(eventName);
    }
  }, [location.pathname]);

  // Initialize automatic daily database keep-alive scheduler
  useEffect(() => {
    const cleanup = setupNoonKeepAliveScheduler();
    return cleanup;
  }, []);

  return (
    <>
      <AppRoutes />
      <AnimatePresence>
        {showSplashOverlay && (
          <motion.div
            key="lifesync-initial-splash-overlay"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              pointerEvents: 'auto',
            }}
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LifeSyncThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LifeSyncThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
