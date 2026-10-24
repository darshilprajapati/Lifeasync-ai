import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Avatar, Menu, MenuItem, ListItemIcon, useTheme, useMediaQuery } from '@mui/material';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import WorkIcon from '@mui/icons-material/Work';
import LockIcon from '@mui/icons-material/Lock';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useThemeSystem } from '../context/ThemeContext';
import CompanionChatDrawer from '../components/CompanionChatDrawer';
import LogoLoader from '../components/LogoLoader';
import { trackAction } from '../utils/analytics';
import { ModernSpotlightLayer } from '../components/modern3d/ModernSpotlightLayer';
import { ModernRippleDistortionCanvas } from '../components/modern3d/ModernRippleDistortionCanvas';
import { MobileTopBar } from '../components/mobile/MobileTopBar';
import { MobileBottomNav } from '../components/mobile/MobileBottomNav';
import { MobileNavDrawer } from '../components/mobile/MobileNavDrawer';

// Sidebar Item Structure
interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { designSystem, mode } = useThemeSystem();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isProf = designSystem === 'professional';
  const isModernDark = designSystem === 'modern3d' && mode === 'dark';
  const [collapsed, setCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [pageChanging, setPageChanging] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const contentContainerRef = React.useRef<HTMLDivElement>(null);

  // Draggable Docking Navigation Panel States (reverted to single active dock position)
  const [dockPosition, setDockPosition] = useState<'left' | 'right' | 'top' | 'bottom'>(() => {
    return (localStorage.getItem('lifesync_nav_position') as 'left' | 'right' | 'top' | 'bottom') || 'left';
  });
  const [navHidden, setNavHidden] = useState(() => {
    return localStorage.getItem('lifesync_nav_hidden') === 'true';
  });
  const [isDragging, setIsDragging] = useState(false);
  const [activeZone, setActiveZone] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  React.useEffect(() => {
    localStorage.setItem('lifesync_nav_position', dockPosition);
  }, [dockPosition]);

  React.useEffect(() => {
    localStorage.setItem('lifesync_nav_hidden', String(navHidden));
  }, [navHidden]);  // Dragging event handlers for moving the single navbar
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Classify viewport drop zones (Left, Right, Top, Bottom)
      if (clientX < innerWidth * 0.22) {
        setActiveZone('left');
      } else if (clientX > innerWidth * 0.78) {
        setActiveZone('right');
      } else if (clientY < innerHeight * 0.22) {
        setActiveZone('top');
      } else if (clientY > innerHeight * 0.78) {
        setActiveZone('bottom');
      } else {
        setActiveZone(null);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (activeZone) {
        setDockPosition(activeZone);
      }
      setActiveZone(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeZone]);

  React.useEffect(() => {
    // Instantaneous, non-blocking route transitions
    setPageChanging(false);
  }, [location.pathname]);

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { name: 'Planner', path: '/planner', icon: <CalendarTodayIcon /> },
    { name: 'Finance', path: '/finance', icon: <AccountBalanceWalletIcon /> },
    { name: 'Health', path: '/health', icon: <FitnessCenterIcon /> },
    { name: 'Career', path: '/career', icon: <WorkIcon /> },
    { name: 'Vault', path: '/vault', icon: <LockIcon /> },
    { name: 'AI Insights', path: '/insights', icon: <PsychologyIcon /> },
    { name: 'Admin Panel', path: '/admin', icon: <AdminPanelSettingsIcon />, adminOnly: true },
  ];

  const handleLogout = async () => {
    setProfileAnchor(null);
    trackAction('logout');
    await logout();
    navigate('/login');
  };


  // Helper renderers for perfect vertical sidebar grouping vs horizontal distribution
  const renderProfileMenu = () => {
    return (
      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        disableAutoFocusItem={true}
        anchorOrigin={{
          vertical: dockPosition === 'bottom' ? 'top' : 'bottom',
          horizontal: dockPosition === 'right' ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: dockPosition === 'bottom' ? 'bottom' : 'top',
          horizontal: dockPosition === 'right' ? 'right' : 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: isProf ? '0px !important' : '14px',
              boxShadow: 'var(--shadow-soft)',
              border: '1px solid var(--card-border)',
              minWidth: 150,
            }
          }
        }}
      >
        <MenuItem onClick={() => { setProfileAnchor(null); navigate('/profile'); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>My Profile</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>Logout</Typography>
        </MenuItem>
      </Menu>
    );
  };

  const renderBrandHeader = () => {
    const isSidebar = dockPosition === 'left' || dockPosition === 'right';
    
    if (isSidebar) {
      if (collapsed) {
        return (
          <Box style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '100%'
          }}>
            {/* Drag Handle at the top of the collapsed column */}
            <Tooltip title="Drag to snap layout edge" placement={dockPosition === 'right' ? 'left' : 'right'}>
              <IconButton
                onMouseDown={startDrag}
                size="small"
                sx={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  color: 'var(--neutral-secondary)',
                  '&:active': { cursor: 'grabbing' }
                }}
              >
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Collapsed Brand Logo */}
            <Box
              component="img"
              src="/logo.jpg"
              alt="L"
              sx={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)'
              }}
            />

            {/* Expand Chevron */}
            <IconButton onClick={() => setCollapsed(false)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
              {dockPosition === 'right' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Box>
        );
      } else {
        // Expanded vertical sidebar header
        return (
          <Box style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            width: '100%',
          }}>
            {/* Logo + Brand Name (In Modern Dark, hidden here because permanent high-z-index logo layer renders it) */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isModernDark ? 0 : 1 }}>
              <Box
                component="img"
                src="/logo.jpg"
                alt="LS"
                sx={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid var(--accent-primary)'
                }}
              />
              <Typography variant="h6" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                LIFESYNC
              </Typography>
            </Box>

            {/* Controls Box: Drag, Hide, Collapse grouped together */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Tooltip title="Drag to snap layout edge">
                <IconButton
                  onMouseDown={startDrag}
                  size="small"
                  sx={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    color: 'var(--neutral-secondary)',
                    '&:active': { cursor: 'grabbing' }
                  }}
                >
                  <DragIndicatorIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Hide Navbar">
                <IconButton onClick={() => setNavHidden(true)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
                  <VisibilityOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <IconButton onClick={() => setCollapsed(true)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
                {dockPosition === 'right' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Box>
          </Box>
        );
      }
    } else {
      // Horizontal top/bottom header logo and drag controls
      return (
        <Box style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Tooltip title="Drag to snap layout edge">
            <IconButton
              onMouseDown={startDrag}
              size="small"
              sx={{
                cursor: isDragging ? 'grabbing' : 'grab',
                color: 'var(--neutral-secondary)',
                '&:active': { cursor: 'grabbing' }
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box
              component="img"
              src="/logo.jpg"
              alt="LS"
              sx={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)'
              }}
            />
            <Typography variant="h6" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
              LIFESYNC
            </Typography>
          </Box>
        </Box>
      );
    }
  };

  const renderNavigationLinks = () => {
    const isSidebar = dockPosition === 'left' || dockPosition === 'right';
    const isItemCollapsed = collapsed && isSidebar;
    return (
      <Box style={{
        display: 'flex',
        flexDirection: isSidebar ? 'column' : 'row',
        gap: '4px',
        marginTop: isSidebar ? '10px' : '0',
        alignItems: 'stretch',
        width: isSidebar ? '100%' : 'auto',
        justifyContent: isSidebar ? 'flex-start' : 'center',
        flex: isSidebar ? 'unset' : 1,
        overflowX: isSidebar ? 'unset' : 'auto',
      }}>
        {menuItems
          .filter(item => !item.adminOnly || user?.role === 'Admin')
          .map((item) => {
            const linkContent = (
              <NavLink
                to={item.path}
                className="lifesync-nav-link"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: isItemCollapsed ? '0px' : '12px',
                  padding: '12px',
                  borderRadius: isProf ? '0px' : '14px',
                  textDecoration: 'none',
                  color: isActive
                    ? (isProf ? 'var(--accent-primary)' : '#FFFFFF')
                    : 'var(--text-secondary)',
                  background: isActive
                    ? (isProf
                        ? 'rgba(217, 83, 30, 0.08)'
                        : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%)')
                    : 'transparent',
                  borderLeft: isProf && dockPosition === 'left'
                    ? (isActive ? '3px solid var(--accent-primary)' : '3px solid transparent')
                    : 'none',
                  borderRight: isProf && dockPosition === 'right'
                    ? (isActive ? '3px solid var(--accent-primary)' : '3px solid transparent')
                    : 'none',
                  borderBottom: isProf && dockPosition === 'top'
                    ? (isActive ? '3px solid var(--accent-primary)' : '3px solid transparent')
                    : 'none',
                  borderTop: isProf && dockPosition === 'bottom'
                    ? (isActive ? '3px solid var(--accent-primary)' : '3px solid transparent')
                    : 'none',
                  boxShadow: !isProf && isActive
                    ? '0 6px 18px rgba(255, 111, 38, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                    : 'none',
                  transition: isProf ? 'background-color 0.15s ease' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  justifyContent: isItemCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                })}
              >
                <Box style={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
                  {item.icon}
                </Box>
                <AnimatePresence>
                  {!isItemCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      style={{
                        fontWeight: 500,
                        fontSize: '15px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );

            return isItemCollapsed ? (
              <Tooltip title={item.name} placement={dockPosition === 'right' ? 'left' : 'right'} key={item.name}>
                <div style={{ width: '100%' }}>{linkContent}</div>
              </Tooltip>
            ) : (
              <React.Fragment key={item.name}>{linkContent}</React.Fragment>
            );
          })}
      </Box>
    );
  };

  const renderProfileAndControls = () => {
    const isSidebar = dockPosition === 'left' || dockPosition === 'right';
    
    if (isSidebar) {
      if (collapsed) {
        return (
          <Box style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            borderTop: '1px solid var(--bg-secondary)',
            paddingTop: '16px'
          }}>
            {/* User Profile Avatar */}
            <Box
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              style={{ cursor: 'pointer' }}
            >
              <Avatar src={user?.profilePhoto || undefined} sx={{ bgcolor: 'var(--accent-secondary)', width: 36, height: 36, fontSize: '15px', fontWeight: 600 }}>
                {!user?.profilePhoto && (user?.fullName?.charAt(0) || 'U')}
              </Avatar>
            </Box>

            {/* Collapsed Hide Button */}
            <Tooltip title="Hide Navbar" placement={dockPosition === 'right' ? 'left' : 'right'}>
              <IconButton onClick={() => setNavHidden(true)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {renderProfileMenu()}
          </Box>
        );
      } else {
        // Expanded vertical sidebar profile widget
        return (
          <Box
            style={{
              borderTop: '1px solid var(--bg-secondary)',
              paddingTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Box
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                overflow: 'hidden',
                padding: '6px',
                borderRadius: '12px',
                flex: 1,
                backgroundColor: profileAnchor ? 'rgba(142, 141, 138, 0.08)' : 'transparent',
              }}
            >
              <Avatar src={user?.profilePhoto || undefined} sx={{ bgcolor: 'var(--accent-secondary)', width: 36, height: 36, fontSize: '15px', fontWeight: 600 }}>
                {!user?.profilePhoto && (user?.fullName?.charAt(0) || 'U')}
              </Avatar>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Typography style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.fullName}
                </Typography>
                <Typography style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.role}
                </Typography>
              </Box>
            </Box>

            {renderProfileMenu()}
          </Box>
        );
      }
    } else {
      // Horizontal top/bottom profile & controls
      return (
        <Box style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* User Profile Widget */}
          <Box
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              overflow: 'hidden',
              padding: '6px',
              borderRadius: '12px',
              backgroundColor: profileAnchor ? 'rgba(142, 141, 138, 0.08)' : 'transparent',
            }}
          >
            <Avatar src={user?.profilePhoto || undefined} sx={{ bgcolor: 'var(--accent-secondary)', width: 36, height: 36, fontSize: '15px', fontWeight: 600 }}>
              {!user?.profilePhoto && (user?.fullName?.charAt(0) || 'U')}
            </Avatar>
            <Box style={{ display: 'flex', flexDirection: 'column' }}>
              <Typography style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </Typography>
            </Box>
          </Box>

          {/* Controls: Hide & Collapse */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tooltip title="Hide Navbar">
              <IconButton onClick={() => setNavHidden(true)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={collapsed ? 'Expand Navbar' : 'Collapse Navbar'}>
              <IconButton onClick={() => setCollapsed(!collapsed)} size="small" style={{ color: 'var(--neutral-secondary)' }}>
                {collapsed ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {renderProfileMenu()}
        </Box>
      );
    }
  };

  const renderNavbar = () => {
    const isSidebar = dockPosition === 'left' || dockPosition === 'right';
    return (
      <motion.div
        className="lifesync-navbar"
        animate={
          isSidebar
            ? { width: collapsed ? '80px' : '260px', height: '100%' }
            : { width: '100%', height: collapsed ? '60px' : '72px' }
        }
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        style={{
          backgroundColor: 'var(--card-bg)',
          borderRight: dockPosition === 'left' ? '1px solid var(--card-border)' : 'none',
          borderLeft: dockPosition === 'right' ? '1px solid var(--card-border)' : 'none',
          borderTop: dockPosition === 'bottom' ? '1px solid var(--card-border)' : 'none',
          borderBottom: dockPosition === 'top' ? '1px solid var(--card-border)' : 'none',
          display: 'flex',
          flexDirection: isSidebar ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isSidebar ? 'stretch' : 'center',
          padding: isSidebar ? '20px 10px' : '0 20px',
          zIndex: 10,
          boxShadow: 'var(--shadow-soft)',
          overflow: 'hidden',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {isSidebar ? (
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {renderBrandHeader()}
            {renderNavigationLinks()}
          </Box>
        ) : (
          <>
            {renderBrandHeader()}
            {renderNavigationLinks()}
          </>
        )}
        {renderProfileAndControls()}
      </motion.div>
    );
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: dockPosition === 'left' ? 'row' : (dockPosition === 'right' ? 'row-reverse' : (dockPosition === 'top' ? 'column' : 'column-reverse')),
      height: '100vh',
      width: '100vw',
      bgcolor: 'var(--bg-secondary)',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* Permanent LifeSync Logo & Brand Mark (Desktop Modern Dark Mode only) */}
      {!isMobile && !navHidden && isModernDark && (
        <Box
          sx={{
            position: 'fixed',
            top: dockPosition === 'top' ? 14 : 20,
            left: dockPosition === 'right' ? 'auto' : (collapsed ? 26 : 18),
            right: dockPosition === 'right' ? (collapsed ? 26 : 24) : 'auto',
            bottom: dockPosition === 'bottom' ? 16 : 'auto',
            zIndex: 1100, // Permanently above the spotlight reveal mask (zIndex: 900)
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'all 0.25s ease'
          }}
        >
          <Box
            component="img"
            src="/logo.jpg"
            alt="LifeSync AI"
            sx={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid var(--accent-primary)',
              boxShadow: '0 2px 8px rgba(255, 111, 38, 0.4)'
            }}
          />
          {!collapsed && (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
                textShadow: mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.8)' : 'none'
              }}
            >
              LIFESYNC
            </Typography>
          )}
        </Box>
      )}

      {/* True Application-Wide Spotlight Reveal Mask (Modern Night Mode only) */}
      <ModernSpotlightLayer />

      {/* Floating Drag & Dock Zone Overlay Indicators (Active during dragging on desktop) */}
      {!isMobile && isDragging && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
          {/* Left Zone */}
          <Box sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '20%',
            background: activeZone === 'left' ? 'rgba(232, 90, 79, 0.16)' : 'rgba(232, 90, 79, 0.03)',
            borderRight: activeZone === 'left' ? '3px dashed var(--accent-primary)' : '2px dashed rgba(232, 90, 79, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Dock Left</Typography>
          </Box>

          {/* Right Zone */}
          <Box sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '20%',
            background: activeZone === 'right' ? 'rgba(232, 90, 79, 0.16)' : 'rgba(232, 90, 79, 0.03)',
            borderLeft: activeZone === 'right' ? '3px dashed var(--accent-primary)' : '2px dashed rgba(232, 90, 79, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Dock Right</Typography>
          </Box>

          {/* Top Zone */}
          <Box sx={{
            position: 'absolute',
            left: '20%',
            right: '20%',
            top: 0,
            height: '20%',
            background: activeZone === 'top' ? 'rgba(232, 90, 79, 0.16)' : 'rgba(232, 90, 79, 0.03)',
            borderBottom: activeZone === 'top' ? '3px dashed var(--accent-primary)' : '2px dashed rgba(232, 90, 79, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Dock Top</Typography>
          </Box>

          {/* Bottom Zone */}
          <Box sx={{
            position: 'absolute',
            left: '20%',
            right: '20%',
            bottom: 0,
            height: '20%',
            background: activeZone === 'bottom' ? 'rgba(232, 90, 79, 0.16)' : 'rgba(232, 90, 79, 0.03)',
            borderTop: activeZone === 'bottom' ? '3px dashed var(--accent-primary)' : '2px dashed rgba(232, 90, 79, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
          }}>
            <Typography variant="subtitle1" sx={{ color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Dock Bottom</Typography>
          </Box>
        </Box>
      )}

      {/* Floating Show Navbar Button (Visible on desktop when navbar is hidden) */}
      {!isMobile && navHidden && (
        <Tooltip title="Show Navigation Menu" placement={dockPosition === 'right' ? 'left' : 'right'}>
          <IconButton
            onClick={() => setNavHidden(false)}
            sx={{
              position: 'fixed',
              top: 16,
              left: dockPosition === 'right' ? 'auto' : 16,
              right: dockPosition === 'right' ? 16 : 'auto',
              width: 44,
              height: 44,
              bgcolor: 'var(--card-bg)',
              color: 'var(--accent-primary)',
              borderRadius: isProf ? '0px !important' : '12px',
              border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(232, 90, 79, 0.25)',
              boxShadow: 'var(--shadow-soft)',
              backdropFilter: isProf ? 'none' : 'blur(8px)',
              zIndex: 100,
              transition: 'all 0.25s ease',
              '&:hover': {
                bgcolor: 'rgba(232, 90, 79, 0.08)',
                transform: isProf ? 'none' : 'scale(1.08)'
              }
            }}
          >
            {dockPosition === 'right' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Tooltip>
      )}

      {/* Desktop Draggable/Docked Single Navbar */}
      {!isMobile && !navHidden && renderNavbar()}

      {/* Mobile Top Bar */}
      <MobileTopBar
        onOpenDrawer={() => setMobileDrawerOpen(true)}
        onOpenNotifications={() => navigate('/profile')}
      />

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* Main View Container */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Main Content (router renders active route component here with transition cross-fade) */}
        <Box
          ref={contentContainerRef}
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'var(--bg-secondary)',
            position: 'relative',
            backgroundImage: !isProf && mode === 'light' ? 'url(/modern-bg.png)' : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Modern 3D WebGL Liquid Ripple Distortion Canvas */}
          <ModernRippleDistortionCanvas containerRef={contentContainerRef} />

          <AnimatePresence mode="wait">
            {pageChanging ? (
              <Box
                key="page-transition-loader"
                component={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative', zIndex: 3 }}
              >
                <LogoLoader />
              </Box>
            ) : (
              <Box
                key="page-transition-content"
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  height: '100%',
                  position: 'relative',
                  zIndex: 3,
                  pt: { xs: '58px', md: 0 },
                  pb: { xs: '76px', md: 0 }
                }}
              >
                <Outlet />
              </Box>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav onOpenChat={() => setChatOpen(true)} />

      {/* Slide-in Companion Chat Widget Panel Drawer */}
      <CompanionChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} anchor={dockPosition === 'right' ? 'left' : 'right'} />
    </Box>
  );
};

export default AppLayout;
