import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Typography,
  Box,
  type SxProps,
  type Theme
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { usePageLayout } from './usePageLayout';
import { useNotification } from '../../context/NotificationContext';
import { useThemeSystem } from '../../context/ThemeContext';

export interface ResetLayoutButtonProps {
  pageId: string;
  pageName?: string;
  size?: 'small' | 'medium';
  variant?: 'text' | 'outlined' | 'contained';
  sx?: SxProps<Theme>;
}

export const ResetLayoutButton: React.FC<ResetLayoutButtonProps> = ({
  pageId,
  pageName,
  size = 'small',
  variant = 'outlined',
  sx
}) => {
  const { resetLayout, hasCustomLayout } = usePageLayout(pageId);
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [confirmOpen, setConfirmOpen] = useState(false);

  const displayName = pageName || pageId.charAt(0).toUpperCase() + pageId.slice(1);

  const handleConfirm = () => {
    resetLayout();
    setConfirmOpen(false);
    notify.info(`${displayName} layout restored to default view.`, 'Layout Reset');
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        startIcon={<RestartAltIcon sx={{ fontSize: '15px !important' }} />}
        onClick={() => setConfirmOpen(true)}
        title={`Reset ${displayName} component sizes to default`}
        sx={{
          borderRadius: isProf ? '0px !important' : '10px',
          textTransform: 'none',
          fontSize: '12px',
          fontWeight: 650,
          borderColor: isProf
            ? 'var(--card-border)'
            : hasCustomLayout
            ? 'rgba(255, 111, 38, 0.4)'
            : isDark
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.12)',
          color: hasCustomLayout ? 'var(--accent-primary)' : 'var(--text-secondary)',
          bgcolor: isProf ? 'var(--card-bg)' : undefined,
          px: 1.5,
          py: 0.55,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'var(--accent-primary)',
            color: 'var(--accent-primary)',
            bgcolor: isProf ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 111, 38, 0.08)'
          },
          ...sx
        }}
      >
        Reset Layout
      </Button>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: isProf ? '0px' : '18px',
              bgcolor: isProf
                ? 'var(--card-bg)'
                : isDark
                ? 'rgba(26, 29, 45, 0.95)'
                : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: isProf ? 'none' : 'blur(16px)',
              border: isProf
                ? '1px solid var(--card-border)'
                : isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(255, 111, 38, 0.2)',
              p: 1
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)', pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                p: 0.8,
                borderRadius: isProf ? 0 : '10px',
                bgcolor: 'rgba(255, 111, 38, 0.12)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RestartAltIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
              Reset {displayName} Layout?
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            This will restore the default dimensions and card sizes on the {displayName} page.
            Your transactions, tasks, records, and activity data will remain completely unaffected.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{
              borderRadius: isProf ? '0px' : '8px',
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'var(--accent-primary)',
              color: '#ffffff',
              '&:hover': { bgcolor: 'var(--accent-secondary)' }
            }}
          >
            Reset Layout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
