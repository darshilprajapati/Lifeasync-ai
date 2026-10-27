import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthProvider';
import { NotificationProvider } from './context/NotificationProvider';
import { ThemeProvider as LifeSyncThemeProvider } from './context/ThemeProvider';
import { trackNavigation } from './utils/analytics';
import { setupNoonKeepAliveScheduler } from './utils/keepAlive';
import { SplashScreen } from './components/SplashScreen';

// Initialize TanStack query client
const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const lastTrackedRouteRef = useRef<string | null>(null);

  // Startup splash state machine:
  // 1. Splash starts visible on fresh application load in Stage A (centered, ~1.8s).
  // 2. Stage B (~850ms) smoothly travels the logo emblem & branding into the top-left navbar position.
  // 3. Background and login content transition synchronized without a white flash.
  // 4. On completion, the splash unmounts and body.lifesync-splash-active is cleared.
  // 5. Failsafe (4,500ms) guarantees dismissal even under extreme conditions.
  // 6. Optional ?splash_freeze=true query parameter holds the splash for visual inspection.
  const [isSplashDismissed, setIsSplashDismissed] = useState(false);

  const isFrozenForTesting = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('splash_freeze') === 'true';

  // Mark body class on mount and remove on dismiss
  useEffect(() => {
    if (!isSplashDismissed) {
      document.body.classList.add('lifesync-splash-active');
    } else {
      document.body.classList.remove('lifesync-splash-active');
    }
    return () => {
      document.body.classList.remove('lifesync-splash-active');
    };
  }, [isSplashDismissed]);

  // Mark mount time for lifecycle diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __lifesync_splash_mounted?: boolean }).__lifesync_splash_mounted = true;
      (window as unknown as { __lifesync_splash_start?: number }).__lifesync_splash_start = performance.now();
    }
  }, []);

  // Failsafe timer (4,500ms) to guarantee splash completes and dismisses even if stalls occur
  useEffect(() => {
    if (isFrozenForTesting || isSplashDismissed) return;
    const failsafe = setTimeout(() => {
      setIsSplashDismissed(true);
      document.body.classList.remove('lifesync-splash-active');
      if (typeof window !== 'undefined') {
        (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
        (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
      }
    }, 4500);

    return () => clearTimeout(failsafe);
  }, [isFrozenForTesting, isSplashDismissed]);

  // Callback when logo transition has finished and docked into navbar
  const handleSplashComplete = () => {
    if (isFrozenForTesting) return;
    setIsSplashDismissed(true);
    document.body.classList.remove('lifesync-splash-active');
    if (typeof window !== 'undefined') {
      (window as unknown as { __lifesync_splash_dismissed?: boolean }).__lifesync_splash_dismissed = true;
      (window as unknown as { __lifesync_splash_end?: number }).__lifesync_splash_end = performance.now();
    }
  };

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
              transition: { duration: 0.1, ease: 'linear' },
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              pointerEvents: 'none',
            }}
          >
            <SplashScreen
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
