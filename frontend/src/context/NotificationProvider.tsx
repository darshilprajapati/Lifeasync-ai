import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NotificationContext,
  type NotificationType,
  type NotificationItem
} from './NotificationContext';

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  info: 4000,
  warning: 5500,
  error: 7000,
};

const VARIANT_CONFIGS = {
  success: {
    icon: CheckCircleIcon,
    accentColor: '#3FA76D',
    bgColor: 'rgba(255, 255, 255, 0.96)',
    darkBgColor: 'rgba(30, 30, 30, 0.96)',
    borderColor: 'rgba(63, 167, 109, 0.35)',
    defaultTitle: 'Success',
  },
  error: {
    icon: ErrorIcon,
    accentColor: '#E74C3C',
    bgColor: 'rgba(255, 255, 255, 0.96)',
    darkBgColor: 'rgba(30, 30, 30, 0.96)',
    borderColor: 'rgba(231, 76, 60, 0.35)',
    defaultTitle: 'Error',
  },
  warning: {
    icon: WarningAmberIcon,
    accentColor: '#F5B041',
    bgColor: 'rgba(255, 255, 255, 0.96)',
    darkBgColor: 'rgba(30, 30, 30, 0.96)',
    borderColor: 'rgba(245, 176, 65, 0.35)',
    defaultTitle: 'Warning',
  },
  info: {
    icon: InfoOutlinedIcon,
    accentColor: '#4A90E2',
    bgColor: 'rgba(255, 255, 255, 0.96)',
    darkBgColor: 'rgba(30, 30, 30, 0.96)',
    borderColor: 'rgba(74, 144, 226, 0.35)',
    defaultTitle: 'Information',
  },
};

interface NotificationCardProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ item, onDismiss }) => {
  const config = VARIANT_CONFIGS[item.type];
  const IconComponent = config.icon;
  const timerRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(item.duration || DEFAULT_DURATIONS[item.type]);
  const startTimeRef = useRef<number>(Date.now());

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      onDismiss(item.id);
    }, remainingTimeRef.current);
  }, [item.id, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  return (
    <Box
      component={motion.div}
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      sx={{
        pointerEvents: 'auto',
        width: '100%',
        maxWidth: '460px',
        bgcolor: 'var(--card-bg, #ffffff)',
        color: 'var(--text-primary, #2D2D2D)',
        borderRadius: '14px',
        border: `1.5px solid ${config.borderColor}`,
        boxShadow: '0 10px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(12px)',
        p: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 1.25,
        userSelect: 'none',
      }}
      role="status"
      aria-live="polite"
    >
      <Box
        sx={{
          color: config.accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 0.2,
          flexShrink: 0,
        }}
      >
        <IconComponent sx={{ fontSize: 22 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--text-primary, #2D2D2D)',
            lineHeight: 1.25,
            mb: 0.3,
            letterSpacing: '0.02em',
          }}
        >
          {item.title || config.defaultTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: '12px',
            color: 'var(--text-secondary, #6D6D6D)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {item.message}
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        sx={{
          color: 'var(--text-secondary, #8E8D8A)',
          p: 0.4,
          flexShrink: 0,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.06)',
            color: 'var(--text-primary, #2D2D2D)',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const recentMessagesRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: NotificationType, message: string, title?: string, duration?: number) => {
      // Prevent duplicates within 4000ms
      const cacheKey = `${type}:${message}`;
      const now = Date.now();
      const lastSeen = recentMessagesRef.current.get(cacheKey) || 0;
      if (now - lastSeen < 4000) {
        return;
      }
      recentMessagesRef.current.set(cacheKey, now);

      const newItem: NotificationItem = {
        id: `notif_${now}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        message,
        title,
        duration: duration || DEFAULT_DURATIONS[type],
      };

      setNotifications((prev) => {
        // Strict deduplication: never stack an identical notification card currently active
        if (prev.some((n) => n.type === type && n.message === message)) {
          return prev;
        }
        // Cap visible queue at 3
        const updated = [newItem, ...prev];
        return updated.slice(0, 3);
      });
    },
    []
  );

  useEffect(() => {
    const handleGlobalNotify = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: NotificationType; message: string; title?: string; duration?: number }>;
      if (customEvent.detail?.type && customEvent.detail?.message) {
        addNotification(
          customEvent.detail.type,
          customEvent.detail.message,
          customEvent.detail.title,
          customEvent.detail.duration
        );
      }
    };
    window.addEventListener('lifesync:notify', handleGlobalNotify);
    return () => window.removeEventListener('lifesync:notify', handleGlobalNotify);
  }, [addNotification]);

  const notify = useMemo(
    () => ({
      success: (msg: string, title?: string, dur?: number) => addNotification('success', msg, title, dur),
      error: (msg: string, title?: string, dur?: number) => addNotification('error', msg, title, dur),
      warning: (msg: string, title?: string, dur?: number) => addNotification('warning', msg, title, dur),
      info: (msg: string, title?: string, dur?: number) => addNotification('info', msg, title, dur),
      dismiss,
    }),
    [addNotification, dismiss]
  );

  const contextValue = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Global Top-Center Fixed Overlay Container */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100000,
          width: { xs: '92%', sm: '460px' },
          maxWidth: '460px',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <AnimatePresence mode="sync">
          {notifications.map((item) => (
            <NotificationCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </Box>
    </NotificationContext.Provider>
  );
};
