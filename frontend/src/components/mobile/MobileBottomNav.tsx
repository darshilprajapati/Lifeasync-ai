import React, { useState } from 'react';
import {
  Box,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  IconButton
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import WorkIcon from '@mui/icons-material/Work';
import LockIcon from '@mui/icons-material/Lock';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useAuth } from '../../context/AuthContext';
import { useThemeSystem } from '../../context/ThemeContext';
import { trackAction } from '../../utils/analytics';

interface MobileBottomNavProps {
  onOpenChat?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenChat }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { designSystem, mode, setDesignSystem, setMode } = useThemeSystem();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const currentPath = location.pathname;

  const bg = isProf
    ? (isDark ? 'rgba(31, 39, 50, 0.96)' : 'rgba(255, 255, 255, 0.96)')
    : isDark
    ? 'rgba(20, 16, 30, 0.92)'
    : 'rgba(255, 250, 246, 0.94)';

  const border = isProf
    ? (isDark ? '1px solid #2E3846' : '1px solid #DFE1E6')
    : isDark
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(232, 90, 79, 0.12)';

  // Primary 4 tabs
  const navTabs = [
    { label: 'Home', path: '/', icon: <HomeRoundedIcon sx={{ fontSize: 22 }} /> },
    { label: 'Planner', path: '/planner', icon: <CalendarTodayRoundedIcon sx={{ fontSize: 21 }} /> },
    { label: 'Finance', path: '/finance', icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 21 }} /> },
    { label: 'Health', path: '/health', icon: <FavoriteRoundedIcon sx={{ fontSize: 21 }} /> },
  ];

  const isMoreActive =
    ['/career', '/vault', '/insights', '/admin', '/profile'].some((p) => currentPath.startsWith(p));

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setMoreDrawerOpen(false);
    trackAction('logout');
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Box
        component="nav"
        aria-label="Mobile Navigation"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          bgcolor: bg,
          backdropFilter: isProf ? 'none' : 'blur(24px)',
          WebkitBackdropFilter: isProf ? 'none' : 'blur(24px)',
          borderTop: border,
          zIndex: 1200,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-around',
          px: 1,
          pb: 'env(safe-area-inset-bottom, 8px)',
          boxShadow: isDark
            ? '0 -8px 24px rgba(0, 0, 0, 0.45)'
            : '0 -4px 20px rgba(142, 141, 138, 0.12)',
        }}
      >
        {navTabs.map((tab) => {
          const isActive =
            tab.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(tab.path);

          return (
            <Box
              key={tab.path}
              onClick={() => handleNavClick(tab.path)}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                py: 0.5,
                px: 0.8,
                borderRadius: isProf ? '0px' : '16px',
                background: isActive
                  ? isProf
                    ? 'rgba(217, 83, 30, 0.1)'
                    : isDark
                    ? 'linear-gradient(135deg, rgba(255, 107, 91, 0.28) 0%, rgba(255, 138, 124, 0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 111, 38, 0.16) 0%, rgba(255, 160, 72, 0.10) 100%)'
                  : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                minWidth: 0,
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                }}
              >
                {tab.icon}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '11px',
                  fontWeight: isActive ? 800 : 500,
                  letterSpacing: '0.01em',
                  color: 'inherit',
                  mt: 0.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          );
        })}

        {/* More Tab */}
        <Box
          onClick={() => setMoreDrawerOpen(true)}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            py: 0.5,
            px: 0.8,
            borderRadius: isProf ? '0px' : '16px',
            background: isMoreActive
              ? isProf
                ? 'rgba(217, 83, 30, 0.1)'
                : isDark
                ? 'linear-gradient(135deg, rgba(255, 107, 91, 0.28) 0%, rgba(255, 138, 124, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(255, 111, 38, 0.16) 0%, rgba(255, 160, 72, 0.10) 100%)'
              : 'transparent',
            color: isMoreActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            minWidth: 0,
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
              transform: isMoreActive ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.2s ease',
            }}
          >
            <GridViewRoundedIcon sx={{ fontSize: 21 }} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: '11px',
              fontWeight: isMoreActive ? 800 : 500,
              letterSpacing: '0.01em',
              color: 'inherit',
              mt: 0.2,
              whiteSpace: 'nowrap',
            }}
          >
            More
          </Typography>
        </Box>
      </Box>

      {/* More Bottom Sheet Drawer */}
      <Drawer
        anchor="bottom"
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: isProf ? 0 : '24px',
              borderTopRightRadius: isProf ? 0 : '24px',
              bgcolor: 'var(--bg-primary)',
              p: 2.5,
              maxHeight: '85vh',
              borderTop: '1px solid var(--border-color)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GridViewRoundedIcon sx={{ color: 'var(--accent-primary)', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              All Modules & Tools
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setMoreDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ pt: 0 }}>
          <ListItemButton
            selected={currentPath.startsWith('/career')}
            onClick={() => {
              navigate('/career');
              setMoreDrawerOpen(false);
            }}
            sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
          >
            <ListItemIcon sx={{ color: 'var(--accent-primary)', minWidth: 40 }}>
              <WorkIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>Career & Job Tracking</Typography>}
              secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Kanban board, interviews, offer pipeline</Typography>}
            />
          </ListItemButton>

          <ListItemButton
            selected={currentPath.startsWith('/vault')}
            onClick={() => {
              navigate('/vault');
              setMoreDrawerOpen(false);
            }}
            sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
          >
            <ListItemIcon sx={{ color: '#00BCD4', minWidth: 40 }}>
              <LockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>CipherVault</Typography>}
              secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>AES-256 encrypted passwords & secure notes</Typography>}
            />
          </ListItemButton>

          <ListItemButton
            selected={currentPath.startsWith('/insights')}
            onClick={() => {
              navigate('/insights');
              setMoreDrawerOpen(false);
            }}
            sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
          >
            <ListItemIcon sx={{ color: '#9C27B0', minWidth: 40 }}>
              <PsychologyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>AI Insights</Typography>}
              secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Telemetry intelligence, focus trends, priority tasks</Typography>}
            />
          </ListItemButton>

          {user?.role === 'Admin' && (
            <ListItemButton
              selected={currentPath.startsWith('/admin')}
              onClick={() => {
                navigate('/admin');
                setMoreDrawerOpen(false);
              }}
              sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
            >
              <ListItemIcon sx={{ color: '#FF9800', minWidth: 40 }}>
                <AdminPanelSettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>Admin Panel</Typography>}
                secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>User directory, registration approvals, audit logs</Typography>}
              />
            </ListItemButton>
          )}

          <ListItemButton
            selected={currentPath.startsWith('/profile')}
            onClick={() => {
              navigate('/profile');
              setMoreDrawerOpen(false);
            }}
            sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
          >
            <ListItemIcon sx={{ color: 'var(--text-secondary)', minWidth: 40 }}>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>Profile & Settings</Typography>}
              secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Account security, personal details, notifications</Typography>}
            />
          </ListItemButton>

          {onOpenChat && (
            <ListItemButton
              onClick={() => {
                setMoreDrawerOpen(false);
                onOpenChat();
              }}
              sx={{ borderRadius: isProf ? 0 : '12px', mb: 0.8 }}
            >
              <ListItemIcon sx={{ color: 'var(--accent-primary)', minWidth: 40 }}>
                <ChatIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>AI Companion Chat</Typography>}
                secondary={<Typography sx={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Open floating intelligent assistant</Typography>}
              />
            </ListItemButton>
          )}
        </List>

        <Divider sx={{ my: 1.5 }} />

        {/* Theme Settings row */}
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

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: isProf ? 0 : '12px',
            bgcolor: 'rgba(232, 90, 79, 0.08)',
            color: 'var(--accent-primary)',
            '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.16)' },
          }}
        >
          <ListItemIcon sx={{ color: 'var(--accent-primary)', minWidth: 40 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography sx={{ fontWeight: 800, fontSize: '14px', color: 'var(--accent-primary)' }}>Sign Out</Typography>}
          />
        </ListItemButton>
      </Drawer>
    </>
  );
};
