import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Avatar,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import WorkIcon from '@mui/icons-material/Work';
import LockIcon from '@mui/icons-material/Lock';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useThemeSystem } from '../../context/ThemeContext';
import { trackAction } from '../../utils/analytics';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  open,
  onClose,
  onOpenChat
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { designSystem, mode, setDesignSystem, setMode } = useThemeSystem();

  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const currentPath = location.pathname;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
    { name: 'Planner', path: '/planner', icon: <CalendarTodayIcon fontSize="small" /> },
    { name: 'Finance', path: '/finance', icon: <AccountBalanceWalletIcon fontSize="small" /> },
    { name: 'Health', path: '/health', icon: <FitnessCenterIcon fontSize="small" /> },
    { name: 'Career', path: '/career', icon: <WorkIcon fontSize="small" /> },
    { name: 'Vault', path: '/vault', icon: <LockIcon fontSize="small" /> },
    { name: 'AI Insights', path: '/insights', icon: <PsychologyIcon fontSize="small" /> },
    ...(user?.role === 'Admin'
      ? [{ name: 'Admin Panel', path: '/admin', icon: <AdminPanelSettingsIcon fontSize="small" /> }]
      : []),
  ];

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    trackAction('logout');
    await logout();
    navigate('/login');
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: '300px',
            maxWidth: '85vw',
            bgcolor: 'var(--bg-primary)',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid var(--border-color)',
            boxShadow: '10px 0 30px rgba(0,0,0,0.25)',
          },
        },
      }}
    >
      <Box>
        {/* Top Header: Logo + Close */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              component="img"
              src="/logo.jpg"
              alt="LifeSync AI"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)',
                boxShadow: '0 2px 8px rgba(255, 111, 38, 0.4)',
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              LIFESYNC AI
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* User Card */}
        <Box
          onClick={() => handleNavigate('/profile')}
          sx={{
            p: 1.8,
            borderRadius: isProf ? 0 : '16px',
            bgcolor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2.5,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)' },
          }}
        >
          <Avatar
            sx={{
              width: 42,
              height: 42,
              bgcolor: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {userInitials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {user?.fullName || 'User Account'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>
              {user?.email || ''}
            </Typography>
            <Chip
              size="small"
              label={user?.role || 'Member'}
              sx={{
                height: 18,
                fontSize: '9.5px',
                fontWeight: 800,
                mt: 0.5,
                bgcolor: 'rgba(232, 90, 79, 0.15)',
                color: 'var(--accent-primary)',
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Navigation Links */}
        <List sx={{ p: 0 }}>
          {menuItems.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path);

            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: isProf ? 0 : '12px',
                  mb: 0.6,
                  bgcolor: isActive
                    ? isProf
                      ? 'rgba(217, 83, 30, 0.1)'
                      : 'rgba(232, 90, 79, 0.12)'
                    : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  '&:hover': {
                    bgcolor: 'rgba(232, 90, 79, 0.08)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    minWidth: 38,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: isActive ? 800 : 600, fontSize: '14px', color: 'inherit' }}>
                      {item.name}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Footer: Theme toggles and Logout */}
      <Box sx={{ pt: 2, borderTop: '1px solid var(--border-color)' }}>
        {onOpenChat && (
          <Button
            fullWidth
            startIcon={<ChatIcon />}
            onClick={() => {
              onClose();
              onOpenChat();
            }}
            sx={{
              mb: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: isProf ? 0 : '12px',
              bgcolor: 'var(--bg-secondary)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            AI Companion Chat
          </Button>
        )}

        {/* Design System & Appearance Mode Selectors */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9.5px', display: 'block', mb: 0.6 }}>
            Design System
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.8, bgcolor: 'var(--bg-secondary)', p: 0.4, borderRadius: isProf ? 0 : '10px', border: '1px solid var(--border-color)' }}>
            <Button
              size="small"
              onClick={() => setDesignSystem('professional')}
              sx={{
                flex: 1,
                py: 0.5,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: isProf ? 0 : '8px',
                bgcolor: isProf ? 'var(--accent-primary)' : 'transparent',
                color: isProf ? '#FFFFFF' : 'var(--text-primary)',
                boxShadow: isProf ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                '&:hover': { bgcolor: isProf ? 'var(--accent-primary)' : 'rgba(0,0,0,0.06)' }
              }}
            >
              Professional
            </Button>
            <Button
              size="small"
              onClick={() => setDesignSystem('modern3d')}
              sx={{
                flex: 1,
                py: 0.5,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: isProf ? 0 : '8px',
                bgcolor: !isProf ? 'var(--accent-primary)' : 'transparent',
                color: !isProf ? '#FFFFFF' : 'var(--text-primary)',
                boxShadow: !isProf ? '0 2px 6px rgba(255, 111, 38, 0.3)' : 'none',
                '&:hover': { bgcolor: !isProf ? 'var(--accent-primary)' : 'rgba(0,0,0,0.06)' }
              }}
            >
              Modern 3D
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9.5px', display: 'block', mb: 0.6 }}>
            Appearance Mode
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.8, bgcolor: 'var(--bg-secondary)', p: 0.4, borderRadius: isProf ? 0 : '10px', border: '1px solid var(--border-color)' }}>
            <Button
              size="small"
              startIcon={<LightModeIcon sx={{ fontSize: '13px !important' }} />}
              onClick={() => setMode('light')}
              sx={{
                flex: 1,
                py: 0.5,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: isProf ? 0 : '8px',
                bgcolor: !isDark ? 'var(--accent-primary)' : 'transparent',
                color: !isDark ? '#FFFFFF' : 'var(--text-primary)',
                boxShadow: !isDark ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                '&:hover': { bgcolor: !isDark ? 'var(--accent-primary)' : 'rgba(0,0,0,0.06)' }
              }}
            >
              Light
            </Button>
            <Button
              size="small"
              startIcon={<DarkModeIcon sx={{ fontSize: '13px !important' }} />}
              onClick={() => setMode('dark')}
              sx={{
                flex: 1,
                py: 0.5,
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: isProf ? 0 : '8px',
                bgcolor: isDark ? 'var(--accent-primary)' : 'transparent',
                color: isDark ? '#FFFFFF' : 'var(--text-primary)',
                boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                '&:hover': { bgcolor: isDark ? 'var(--accent-primary)' : 'rgba(0,0,0,0.06)' }
              }}
            >
              Night
            </Button>
          </Box>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: isProf ? 0 : '12px',
            borderColor: 'rgba(232, 90, 79, 0.4)',
            color: 'var(--accent-primary)',
            '&:hover': {
              borderColor: 'var(--accent-primary)',
              bgcolor: 'rgba(232, 90, 79, 0.08)',
            },
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Drawer>
  );
};
