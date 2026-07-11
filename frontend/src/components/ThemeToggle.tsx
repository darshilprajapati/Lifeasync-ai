import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const ThemeToggle: React.FC = () => {
  const isDark = localStorage.getItem('lifesync_theme') === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={() => {
          if ((window as any).toggleLifeSyncTheme) {
            (window as any).toggleLifeSyncTheme();
          }
        }}
        sx={{
          color: 'var(--accent-primary)',
          border: '1px solid rgba(232, 90, 79, 0.25)',
          borderRadius: '12px',
          padding: '8px',
          bgcolor: 'var(--card-bg)',
          transition: 'all 0.25s ease',
          '&:hover': {
            bgcolor: 'rgba(232, 90, 79, 0.08)',
            transform: 'scale(1.05)'
          }
        }}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
