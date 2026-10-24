import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

export type DesignSystem = 'professional' | 'modern3d';
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  designSystem: DesignSystem;
  setDesignSystem: (ds: DesignSystem) => void;
  toggleDesignSystem: () => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LS_DESIGN_KEY = 'lifesync_design_system';
const LS_THEME_KEY = 'lifesync_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [designSystem, setDesignSystemState] = useState<DesignSystem>(() => {
    const saved = localStorage.getItem(LS_DESIGN_KEY);
    return saved === 'professional' ? 'professional' : 'modern3d';
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LS_THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const applyThemeTokens = (ds: DesignSystem, m: ThemeMode) => {
    const root = document.documentElement;
    root.setAttribute('data-design-system', ds);
    root.setAttribute('data-theme', m);

    if (ds === 'professional') {
      if (m === 'light') {
        root.style.setProperty('--bg-primary', '#F4F5F7');
        root.style.setProperty('--bg-secondary', '#EBECF0');
        root.style.setProperty('--card-bg', '#FFFFFF');
        root.style.setProperty('--bg-card', '#FFFFFF');
        root.style.setProperty('--card-border', '#DFE1E6');
        root.style.setProperty('--border-color', '#DFE1E6');
        root.style.setProperty('--text-primary', '#172B4D');
        root.style.setProperty('--text-secondary', '#5E6C84');
        root.style.setProperty('--neutral-primary', '#D1D5DB');
        root.style.setProperty('--neutral-secondary', '#6B7280');
        root.style.setProperty('--accent-primary', '#D9531E');
        root.style.setProperty('--accent-secondary', '#C2410C');
        root.style.setProperty('--accent-blue', '#2B6CB0');
        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-button', '0px');
        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-chip', '0px');
        root.style.setProperty('--shadow-soft', '0 1px 3px rgba(0, 0, 0, 0.08)');
        root.style.setProperty('--shadow-hover', '0 2px 6px rgba(0, 0, 0, 0.12)');
      } else {
        root.style.setProperty('--bg-primary', '#12161A');
        root.style.setProperty('--bg-secondary', '#181F26');
        root.style.setProperty('--card-bg', '#1F2732');
        root.style.setProperty('--bg-card', '#1F2732');
        root.style.setProperty('--card-border', '#2E3846');
        root.style.setProperty('--border-color', '#2E3846');
        root.style.setProperty('--text-primary', '#F7FAFC');
        root.style.setProperty('--text-secondary', '#A0AEC0');
        root.style.setProperty('--neutral-primary', '#374151');
        root.style.setProperty('--neutral-secondary', '#9CA3AF');
        root.style.setProperty('--accent-primary', '#E26D38');
        root.style.setProperty('--accent-secondary', '#EA580C');
        root.style.setProperty('--accent-blue', '#4299E1');
        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-button', '0px');
        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-chip', '0px');
        root.style.setProperty('--shadow-soft', '0 1px 3px rgba(0, 0, 0, 0.35)');
        root.style.setProperty('--shadow-hover', '0 2px 6px rgba(0, 0, 0, 0.45)');
      }
    } else {
      // Modern 3D
      if (m === 'light') {
        root.style.setProperty('--bg-primary', '#F5F3EE');
        root.style.setProperty('--bg-secondary', '#EAE7DC');
        root.style.setProperty('--card-bg', '#FFFFFF');
        root.style.setProperty('--bg-card', '#FFFFFF');
        root.style.setProperty('--card-border', 'rgba(232, 90, 79, 0.15)');
        root.style.setProperty('--border-color', 'rgba(232, 90, 79, 0.15)');
        root.style.setProperty('--text-primary', '#2D2D2D');
        root.style.setProperty('--text-secondary', '#6D6D6D');
        root.style.setProperty('--neutral-primary', '#D8C3A5');
        root.style.setProperty('--neutral-secondary', '#8E8D8A');
        root.style.setProperty('--accent-primary', '#E85A4F');
        root.style.setProperty('--accent-secondary', '#E98074');
        root.style.setProperty('--accent-blue', '#4A90E2');
        root.style.setProperty('--radius-card', '18px');
        root.style.setProperty('--radius-button', '12px');
        root.style.setProperty('--radius-input', '12px');
        root.style.setProperty('--radius-chip', '10px');
        root.style.setProperty('--shadow-soft', '0 8px 24px -4px rgba(142, 141, 138, 0.18), 0 2px 6px -1px rgba(0, 0, 0, 0.05)');
        root.style.setProperty('--shadow-hover', '0 14px 34px -4px rgba(232, 90, 79, 0.22)');
      } else {
        root.style.setProperty('--bg-primary', '#0F111A');
        root.style.setProperty('--bg-secondary', '#141724');
        root.style.setProperty('--card-bg', '#1A1D2D');
        root.style.setProperty('--bg-card', '#1A1D2D');
        root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--text-primary', '#FFFFFF');
        root.style.setProperty('--text-secondary', '#A5B0C2');
        root.style.setProperty('--neutral-primary', '#282E42');
        root.style.setProperty('--neutral-secondary', '#717D96');
        root.style.setProperty('--accent-primary', '#FF6B5B');
        root.style.setProperty('--accent-secondary', '#FF8A7C');
        root.style.setProperty('--accent-blue', '#38BDF8');
        root.style.setProperty('--radius-card', '18px');
        root.style.setProperty('--radius-button', '12px');
        root.style.setProperty('--radius-input', '12px');
        root.style.setProperty('--radius-chip', '10px');
        root.style.setProperty('--shadow-soft', '0 12px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--shadow-hover', '0 16px 36px 0 rgba(232, 90, 79, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)');
      }
    }
  };

  useEffect(() => {
    applyThemeTokens(designSystem, mode);
    localStorage.setItem(LS_DESIGN_KEY, designSystem);
    localStorage.setItem(LS_THEME_KEY, mode);

    // Global helper bindings for backwards compatibility
    (window as any).toggleLifeSyncTheme = () => {
      setModeState((prev) => {
        const next = prev === 'dark' ? 'light' : 'dark';
        applyThemeTokens(designSystem, next);
        localStorage.setItem(LS_THEME_KEY, next);
        return next;
      });
    };

    (window as any).toggleLifeSyncDesignSystem = () => {
      setDesignSystemState((prev) => {
        const next = prev === 'professional' ? 'modern3d' : 'professional';
        applyThemeTokens(next, mode);
        localStorage.setItem(LS_DESIGN_KEY, next);
        return next;
      });
    };

    (window as any).setLifeSyncDesignSystem = (ds: DesignSystem) => {
      setDesignSystemState(ds);
      applyThemeTokens(ds, mode);
      localStorage.setItem(LS_DESIGN_KEY, ds);
    };

    (window as any).setLifeSyncTheme = (m: ThemeMode) => {
      setModeState(m);
      applyThemeTokens(designSystem, m);
      localStorage.setItem(LS_THEME_KEY, m);
    };
  }, [designSystem, mode]);

  const setDesignSystem = (ds: DesignSystem) => {
    setDesignSystemState(ds);
  };

  const toggleDesignSystem = () => {
    setDesignSystemState((prev) => (prev === 'professional' ? 'modern3d' : 'professional'));
  };

  const setMode = (m: ThemeMode) => {
    setModeState(m);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Construct Material UI Theme dynamically based on Design System & Mode
  const muiTheme = useMemo(() => {
    const isDark = mode === 'dark';
    const isProf = designSystem === 'professional';

    const bgDefault = isDark
      ? (isProf ? '#12161A' : '#0F111A')
      : (isProf ? '#F4F5F7' : '#F5F3EE');

    const bgPaper = isDark
      ? (isProf ? '#1F2732' : '#1A1D2D')
      : '#FFFFFF';

    const primaryColor = isProf
      ? (isDark ? '#E26D38' : '#D9531E')
      : (isDark ? '#FF6B5B' : '#E85A4F');

    const primaryLight = isProf ? '#E85A4F' : '#E98074';
    const primaryDark = isProf ? '#C2410C' : '#D44439';

    const textPrimary = isDark
      ? (isProf ? '#F7FAFC' : '#FFFFFF')
      : (isProf ? '#172B4D' : '#2D2D2D');

    const textSecondary = isDark
      ? (isProf ? '#A0AEC0' : '#A5B0C2')
      : (isProf ? '#5E6C84' : '#6D6D6D');

    const cardBorder = isProf
      ? (isDark ? '1px solid #2E3846' : '1px solid #DFE1E6')
      : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(232, 90, 79, 0.14)');

    const cardShadow = isProf
      ? (isDark ? '0 1px 3px rgba(0, 0, 0, 0.35)' : '0 1px 3px rgba(0, 0, 0, 0.08)')
      : (isDark ? '0 12px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)' : '0 8px 24px -4px rgba(142, 141, 138, 0.18), 0 2px 6px -1px rgba(0, 0, 0, 0.05)');

    return createTheme({
      typography: {
        fontFamily: isProf ? '"Inter", "Segoe UI", -apple-system, sans-serif' : '"Josefin Sans", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: isProf ? 600 : 600, letterSpacing: isProf ? '0.02em' : '0.05em' },
      },
      palette: {
        mode,
        background: {
          default: bgDefault,
          paper: bgPaper,
        },
        primary: {
          main: primaryColor,
          light: primaryLight,
          dark: primaryDark,
        },
        info: {
          main: isProf ? '#2B6CB0' : (isDark ? '#38BDF8' : '#4A90E2'),
        },
        text: {
          primary: textPrimary,
          secondary: textSecondary,
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
      },
      shape: {
        borderRadius: isProf ? 0 : 12,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '18px',
              border: cardBorder,
              boxShadow: cardShadow,
              backgroundImage: 'none',
              transition: isProf
                ? 'background-color 0.15s ease, border-color 0.15s ease'
                : 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '12px',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: isProf ? 'none' : undefined,
              transition: isProf
                ? 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              '&:hover': {
                transform: isProf ? 'none' : 'translateY(-2px)',
                boxShadow: isProf ? 'none' : undefined,
              },
              '&:active': {
                transform: isProf ? 'none' : 'translateY(1px)',
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '14px',
              backgroundImage: 'none',
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '12px',
            },
            notchedOutline: {
              borderRadius: isProf ? '0px' : '12px',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            root: {
              zIndex: 1300,
            },
            paper: {
              borderRadius: isProf ? '0px' : '20px',
              backgroundColor: bgPaper,
              color: textPrimary,
              border: cardBorder,
              backgroundImage: 'none',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100% - 32px)',
              margin: '16px',
              boxSizing: 'border-box',
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: {
              flexWrap: 'wrap',
              gap: '8px',
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            root: {
              zIndex: 1450,
            },
            paper: {
              borderRadius: isProf ? '0px' : '14px',
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            root: {
              zIndex: 1450,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '10px',
              fontWeight: 600,
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: isProf ? '0px' : '12px',
            },
          },
        },
      },
    });
  }, [designSystem, mode]);

  return (
    <ThemeContext.Provider
      value={{
        designSystem,
        setDesignSystem,
        toggleDesignSystem,
        mode,
        setMode,
        toggleMode,
      }}
    >
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeSystem = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeSystem must be used within a ThemeProvider');
  }
  return context;
};
