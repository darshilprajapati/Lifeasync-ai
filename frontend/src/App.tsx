import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AppRoutes from './routes';
import CustomCursor from './components/CustomCursor';
import { AuthProvider, useAuth } from './context/AuthContext';

// Initialize TanStack query client
const queryClient = new QueryClient();

// Shared base typography settings
const typographyConfig = {
  fontFamily: '"Josefin Sans", sans-serif',
  allVariants: {
    letterSpacing: '0.04em',
  },
  h1: { fontFamily: '"Josefin Sans", sans-serif' },
  h2: { fontFamily: '"Josefin Sans", sans-serif' },
  h3: { fontFamily: '"Josefin Sans", sans-serif' },
  h4: { fontFamily: '"Josefin Sans", sans-serif' },
  h5: { fontFamily: '"Josefin Sans", sans-serif' },
  h6: { fontFamily: '"Josefin Sans", sans-serif' },
  body1: { fontFamily: '"Josefin Sans", sans-serif' },
  body2: { fontFamily: '"Josefin Sans", sans-serif' },
  button: { fontFamily: '"Josefin Sans", sans-serif' },
};

function AppContent() {
  const { loading } = useAuth();

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <Box
          key="splash"
          component={motion.div}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
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
            <Box sx={{ position: 'relative', width: 120, height: 120, mb: 4.5 }}>
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
                  top: 17,
                  left: 17,
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  backgroundImage: 'url(/logo.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '2px solid rgba(232, 90, 79, 0.3)',
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
  const [isDark, setIsDark] = useState(() => localStorage.getItem('lifesync_theme') === 'dark');

  useEffect(() => {
    (window as any).toggleLifeSyncTheme = () => {
      setIsDark((prev) => {
        const next = !prev;
        localStorage.setItem('lifesync_theme', next ? 'dark' : 'light');
        const root = document.documentElement;
        if (next) {
          root.style.setProperty('--bg-primary', '#121212');
          root.style.setProperty('--bg-secondary', '#1A1A1A');
          root.style.setProperty('--card-bg', '#1E1E1E');
          root.style.setProperty('--text-primary', '#FFFFFF');
          root.style.setProperty('--text-secondary', '#A0A0A0');
          root.style.setProperty('--neutral-primary', '#333333');
        } else {
          root.style.setProperty('--bg-primary', '#EAE7DC');
          root.style.setProperty('--bg-secondary', '#F5F3EE');
          root.style.setProperty('--card-bg', '#FFFFFF');
          root.style.setProperty('--text-primary', '#2D2D2D');
          root.style.setProperty('--text-secondary', '#6D6D6D');
          root.style.setProperty('--neutral-primary', '#D8C3A5');
        }
        return next;
      });
    };

    const root = document.documentElement;
    if (isDark) {
      root.style.setProperty('--bg-primary', '#121212');
      root.style.setProperty('--bg-secondary', '#1A1A1A');
      root.style.setProperty('--card-bg', '#1E1E1E');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#A0A0A0');
      root.style.setProperty('--neutral-primary', '#333333');
    } else {
      root.style.setProperty('--bg-primary', '#EAE7DC');
      root.style.setProperty('--bg-secondary', '#F5F3EE');
      root.style.setProperty('--card-bg', '#FFFFFF');
      root.style.setProperty('--text-primary', '#2D2D2D');
      root.style.setProperty('--text-secondary', '#6D6D6D');
      root.style.setProperty('--neutral-primary', '#D8C3A5');
    }
  }, [isDark]);

  const activeTheme = createTheme({
    typography: typographyConfig,
    palette: {
      mode: isDark ? 'dark' : 'light',
      background: {
        default: isDark ? '#121212' : '#EAE7DC',
        paper: isDark ? '#1E1E1E' : '#FFFFFF',
      },
      primary: {
        main: '#E85A4F',
        light: '#E98074',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#2D2D2D',
        secondary: isDark ? '#A0A0A0' : '#6D6D6D',
      },
      success: {
        main: '#3FA76D',
      },
      warning: {
        main: '#F5B041',
      },
      error: {
        main: '#E74C3C',
      },
      info: {
        main: '#4A90E2',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '18px',
            boxShadow: isDark 
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.5)' 
              : '0 4px 20px -2px rgba(142, 141, 138, 0.15)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={activeTheme}>
        <CssBaseline />
        <CustomCursor />
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
