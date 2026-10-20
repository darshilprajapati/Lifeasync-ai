import { useEffect, useRef } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AppRoutes from './routes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider as LifeSyncThemeProvider } from './context/ThemeContext';
import { trackNavigation } from './utils/analytics';
import { setupNoonKeepAliveScheduler } from './utils/keepAlive';

// Initialize TanStack query client
const queryClient = new QueryClient();

function AppContent() {
  const { loading } = useAuth();
  const location = useLocation();
  const lastTrackedRouteRef = useRef<string | null>(null);

  // Initialize automatic daily database keep-alive scheduler
  useEffect(() => {
    const cleanup = setupNoonKeepAliveScheduler();
    return cleanup;
  }, []);

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

  const publicPaths = ['/login', '/register', '/signup', '/forgot-password'];
  const currentPath = location.pathname.toLowerCase();
  const isPublicRoute = publicPaths.some(path => currentPath.startsWith(path));

  // Splash screen is shown strictly while verifying stored session on protected routes
  const displaySplash = !isPublicRoute && loading;

  return (
    <AnimatePresence mode="wait">
      {displaySplash ? (
        <Box
          key="splash"
          component={motion.div}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: '#EAE7DC',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component={motion.div}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '300px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Animated Brand Logo with Rotating Dots */}
            <Box sx={{ position: 'relative', width: 160, height: 160, mb: 5 }}>
              {/* Rotating outer ring of trailing orbital dots */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1,
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i * 22.5 * Math.PI) / 180;
                    const cx = 50 + 42 * Math.cos(angle);
                    const cy = 50 + 42 * Math.sin(angle);
                    const opacity = 0.15 + (i / 15) * 0.85;
                    const radius = 1.5 + (i / 15) * 1.5;

                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="#E85A4F"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(232, 90, 79, 0.6))',
                          opacity: opacity,
                        }}
                      />
                    );
                  })}
                </svg>
              </motion.div>

              {/* Pulsing inner logo emblem */}
              <Box
                component={motion.div}
                animate={{ 
                  scale: [0.93, 1.05, 0.93],
                  rotate: [0, 3, -3, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3, 
                  ease: 'easeInOut' 
                }}
                sx={{
                  position: 'absolute',
                  top: 22,
                  left: 22,
                  width: 116,
                  height: 116,
                  borderRadius: '50%',
                  backgroundImage: 'url(/logo.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '2.5px solid rgba(232, 90, 79, 0.3)',
                  boxShadow: '0 8px 24px rgba(232, 90, 79, 0.25)',
                  zIndex: 2,
                }}
              />
            </Box>

            {/* Brand Text */}
            <Box
              component={motion.div}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: '#2D2D2D',
                  mb: 1,
                  textTransform: 'uppercase',
                  fontFamily: '"Josefin Sans", sans-serif',
                }}
              >
                LifeSync AI
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  fontSize: '11px',
                  color: '#6D6D6D',
                  letterSpacing: '0.08em',
                  fontFamily: '"Josefin Sans", sans-serif',
                  opacity: 0.7,
                }}
              >
                Personal Intelligence Platform
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <AppRoutes />
      )}
    </AnimatePresence>
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
