import React from 'react';
import { Stack, IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import { useThemeSystem } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, toggleMode, designSystem, toggleDesignSystem } = useThemeSystem();
  const isDark = mode === 'dark';
  const isProf = designSystem === 'professional';

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {/* Design System Switcher */}
      <Tooltip
        title={
          isProf
            ? 'Switch to Modern 3D Design (Dimensional & Futuristic)'
            : 'Switch to Professional Design (Sharp & Productivity-Focused)'
        }
      >
        <IconButton
          id="btn-toggle-design-system"
          onClick={toggleDesignSystem}
          sx={{
            color: 'var(--accent-primary)',
            border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(232, 90, 79, 0.25)',
            borderRadius: isProf ? '0px !important' : '12px',
            padding: '8px',
            bgcolor: 'var(--card-bg)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(232, 90, 79, 0.08)',
              transform: isProf ? 'none' : 'translateY(-2px)',
              boxShadow: isProf ? 'none' : '0 4px 12px rgba(232, 90, 79, 0.2)',
            },
          }}
        >
          {isProf ? <ViewInArIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {/* Light / Dark Mode Switcher */}
      <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
        <IconButton
          id="btn-toggle-theme-mode"
          onClick={toggleMode}
          sx={{
            color: 'var(--accent-primary)',
            border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(232, 90, 79, 0.25)',
            borderRadius: isProf ? '0px !important' : '12px',
            padding: '8px',
            bgcolor: 'var(--card-bg)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(232, 90, 79, 0.08)',
              transform: isProf ? 'none' : 'translateY(-2px)',
              boxShadow: isProf ? 'none' : '0 4px 12px rgba(232, 90, 79, 0.2)',
            },
          }}
        >
          {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default ThemeToggle;
