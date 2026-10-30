import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Chip,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeSystem } from '../../context/ThemeContext';
import { STANDARD_DATE_INPUT_PROPS, clampYearToFourDigits } from '../../utils/dateValidation';

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterGroup[];
  customDateRange?: {
    start: string;
    end: string;
    onStartChange: (s: string) => void;
    onEndChange: (e: string) => void;
    show: boolean;
  };
  onReset?: () => void;
  onApply?: () => void;
}

export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  open,
  onClose,
  title = 'Filter & Refine',
  groups,
  customDateRange,
  onReset,
  onApply,
}) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const handleApply = () => {
    if (onApply) onApply();
    onClose();
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: isProf ? 0 : '24px',
            borderTopRightRadius: isProf ? 0 : '24px',
            bgcolor: 'var(--card-bg)',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
            borderTop: '1px solid var(--card-border)',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: isProf ? 0 : '10px',
              bgcolor: 'rgba(232, 90, 79, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FilterAltIcon sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {title}
          </Typography>
        </Stack>

        <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.2, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {groups.map((group) => (
          <Box key={group.id}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 750,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '11px',
                mb: 1.2,
                display: 'block',
              }}
            >
              {group.label}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                gap: 1,
              }}
            >
              {group.options.map((opt) => {
                const isSelected = group.selectedValue === opt.value;
                return (
                  <Chip
                    key={opt.value}
                    icon={isSelected ? <CheckIcon sx={{ fontSize: '15px !important', color: '#fff !important' }} /> : opt.icon ? <Box sx={{ display: 'flex' }}>{opt.icon}</Box> : undefined}
                    label={opt.label}
                    onClick={() => group.onChange(opt.value)}
                    clickable
                    sx={{
                      height: '38px',
                      borderRadius: isProf ? 0 : '12px',
                      fontWeight: isSelected ? 750 : 550,
                      fontSize: '12.5px',
                      bgcolor: isSelected
                        ? 'var(--accent-primary)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.04)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      border: '1px solid',
                      borderColor: isSelected
                        ? 'var(--accent-primary)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        bgcolor: isSelected ? 'var(--accent-secondary)' : 'rgba(232, 90, 79, 0.08)',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        ))}

        {/* Custom Date Range pickers if active */}
        {customDateRange && customDateRange.show && (
          <Box
            sx={{
              p: 2,
              borderRadius: isProf ? 0 : '14px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              border: '1px dashed var(--card-border)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 750, color: 'var(--text-secondary)', mb: 1.5, display: 'block' }}>
              Custom Date Range
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                size="small"
                label="Start Date"
                type="date"
                fullWidth
                value={customDateRange.start}
                onChange={(e) => customDateRange.onStartChange(clampYearToFourDigits(e.target.value))}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
              <TextField
                size="small"
                label="End Date"
                type="date"
                fullWidth
                value={customDateRange.end}
                onChange={(e) => customDateRange.onEndChange(clampYearToFourDigits(e.target.value))}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
            </Stack>
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid var(--card-border)',
          bgcolor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
          display: 'flex',
          gap: 1.5,
        }}
      >
        {onReset && (
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            fullWidth
            sx={{
              borderRadius: isProf ? 0 : '12px',
              textTransform: 'none',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              borderColor: 'var(--card-border)',
              py: 1,
              '&:hover': { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' },
            }}
          >
            Reset
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleApply}
          fullWidth
          sx={{
            borderRadius: isProf ? 0 : '12px',
            textTransform: 'none',
            fontWeight: 750,
            bgcolor: 'var(--accent-primary)',
            color: '#FFFFFF',
            py: 1,
            boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
            '&:hover': { bgcolor: 'var(--accent-secondary)' },
          }}
        >
          Apply Filters
        </Button>
      </Box>
    </Drawer>
  );
};
