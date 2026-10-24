import React from 'react';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeSystem } from '../../context/ThemeContext';

interface MobileTopBarProps {
  onOpenDrawer: () => void;
  onOpenNotifications?: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onOpenDrawer
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const bg = isProf
    ? (isDark ? 'rgba(31, 39, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)')
    : isDark
    ? 'rgba(15, 17, 26, 0.88)'
    : 'rgba(255, 250, 246, 0.88)';

  const border = isProf
    ? (isDark ? '1px solid #2E3846' : '1px solid #DFE1E6')
    : isDark
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(232, 90, 79, 0.12)';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '58px',
        bgcolor: bg,
        backdropFilter: isProf ? 'none' : 'blur(20px)',
        WebkitBackdropFilter: isProf ? 'none' : 'blur(20px)',
        borderBottom: border,
        zIndex: 1100,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        boxShadow: isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.35)'
          : '0 4px 16px rgba(142, 141, 138, 0.08)',
      }}
    >
      {/* Left: Hamburger Button */}
      <IconButton
        onClick={onOpenDrawer}
        aria-label="Open navigation menu"
        size="small"
        sx={{
          width: 38,
          height: 38,
          borderRadius: isProf ? '0px' : '12px',
          bgcolor: isProf
            ? 'transparent'
            : isDark
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(232, 90, 79, 0.06)',
          color: 'var(--text-primary)',
          border: isProf ? 'none' : '1px solid var(--border-color)',
          '&:hover': {
            bgcolor: 'rgba(232, 90, 79, 0.12)',
          },
        }}
      >
        <MenuIcon sx={{ fontSize: 22 }} />
      </IconButton>

      {/* Center: Brand Logo + LIFESYNC AI */}
      <Box
        onClick={() => navigate('/')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Box
          component="img"
          src="/logo.jpg"
          alt="LifeSync AI"
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid var(--accent-primary)',
            boxShadow: '0 2px 8px rgba(255, 111, 38, 0.35)',
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            fontSize: '16px',
            color: 'var(--text-primary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          LifeSync AI
        </Typography>
      </Box>

      {/* Right: Profile Avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          onClick={() => navigate('/profile')}
          sx={{
            width: 34,
            height: 34,
            fontSize: '12px',
            fontWeight: 700,
            bgcolor: 'var(--accent-primary)',
            color: '#FFFFFF',
            cursor: 'pointer',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          }}
        >
          {userInitials}
        </Avatar>
      </Box>
    </Box>
  );
};
