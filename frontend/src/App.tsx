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
  // 1. Splash starts visible on fresh application load (0%).
  // 2. Minimum display window (1,200ms) guarantees the visual progress is smoothly seen.
  // 3. Progress advances from 0% toward 100% while auth initializes (!loading).
  // 4. Once auth is ready and minDuration elapsed (or failsafe fires), reaches 100% and displays "Ready!".
  // 5. Holds briefly then smoothly fades out and never reappears during client-side navigation.
  // 6. 3,500ms failsafe ensures it can never get stuck on slow networks.
  // 7. Optional ?splash_freeze=true query parameter holds the splash for visual inspection.
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [isSplashDismissed, setIsSplashDismissed] = useState(false);
  const [failsafeTriggered, setFailsafeTriggered] = useState(false);

  const isFrozenForTesting = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('splash_freeze') === 'true';

  const explicitTestProgress = (() => {
    if (typeof window === 'undefined') return undefined;
    const p = new URLSearchParams(window.location.search).get('splash_progress');
    if (p !== null && p !== undefined && p !== '' && !isNaN(Number(p))) {
      return Number(p);
    }
    return undefined;
  })();

  // Mark mount time for lifecycle diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __lifesync_splash_mounted?: boolean }).__lifesync_splash_mounted = true;
      (window as unknown as { __lifesync_splash_start?: number }).__lifesync_splash_start = performance.now();
    }
  }, []);

  // Minimum duration timer (1,200ms) started on app mount
  useEffect(() => {
    if (isFrozenForTesting) return;
    const timer = setTimeout(() => {
      setMinDurationElapsed(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isFrozenForTesting]);

  // Failsafe timer (3,500ms) to guarantee progress completes and dismisses even if auth stalls
  useEffect(() => {
    if (isFrozenForTesting || isSplashDismissed) return;
    const failsafe = setTimeout(() => {
      setFailsafeTriggered(true);
    }, 3500);

    // Hard fallback failsafe: force dismiss if still visible at 4,200ms
    const hardFallback = setTimeout(() => {
      setIsSplashDismissed(true);
      if (typeof window !== 'undefined') {
        (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
        (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
      }
    }, 4200);

    return () => {
      clearTimeout(failsafe);
      clearTimeout(hardFallback);
    };
  }, [isFrozenForTesting, isSplashDismissed]);

  // Callback when progress bar reaches 100% and ready status has been presented
  const handleSplashComplete = () => {
    if (isFrozenForTesting) return;
    setIsSplashDismissed(true);
    if (typeof window !== 'undefined') {
      (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
      (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
    }
  };

  // Signal indicating underlying app initialization is satisfied
  const isInitReady = (minDurationElapsed && !loading) || failsafeTriggered;

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
            <SplashScreen
              progress={explicitTestProgress}
              isReady={isInitReady}
              onComplete={handleSplashComplete}
              isFrozen={isFrozenForTesting}
            />
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
