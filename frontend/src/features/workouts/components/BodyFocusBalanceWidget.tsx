import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  LinearProgress,
  Alert
} from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import { useThemeSystem } from '../../../context/ThemeContext';

interface BodyFocusBalanceWidgetProps {
  distribution?: Record<string, number>;
  completedDistribution?: Record<string, number>;
}

const MUSCLE_GROUPS = ['Back', 'Chest', 'Shoulders', 'Legs', 'Cardio', 'Core', 'Arms'];

const MUSCLE_COLORS: Record<string, string> = {
  Back: '#3b82f6',
  Chest: '#FF6F26',
  Shoulders: '#f59e0b',
  Legs: '#10b981',
  Cardio: '#06b6d4',
  Core: '#ec4899',
  Arms: '#8b5cf6'
};

export const BodyFocusBalanceWidget: React.FC<BodyFocusBalanceWidgetProps> = ({
  distribution,
  completedDistribution
}) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';

  const data = completedDistribution || distribution || {};
  const totalVolume = Object.values(data).reduce((acc, v) => acc + (v || 0), 0);
  const isEmpty = totalVolume === 0;

  return (
    <Card
      sx={{
        borderRadius: isProf ? '0px' : '20px',
        bgcolor: isProf
          ? 'var(--card-bg)'
          : (mode === 'dark' ? 'rgba(26, 29, 45, 0.88)' : 'rgba(255, 255, 255, 0.85)'),
        backdropFilter: isProf ? 'none' : 'blur(16px)',
        boxShadow: isProf ? 'none' : '0 10px 30px rgba(0,0,0,0.06)',
        border: isProf
          ? '1px solid var(--card-border)'
          : (mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255, 111, 38, 0.12)'),
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <AccessibilityNewIcon sx={{ color: '#FF6F26', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Body Focus & Balance
            </Typography>
          </Stack>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
            Realized muscle training volume from completed exercises
          </Typography>

          {isEmpty && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mb: 2,
                py: 0.5,
                px: 1.5,
                fontSize: '12px',
                borderRadius: isProf ? '0px' : '8px',
                bgcolor: 'rgba(235, 94, 40, 0.08)',
                color: 'var(--text-primary)',
                border: '1px dashed rgba(235, 94, 40, 0.3)'
              }}
            >
              Complete an exercise to see your training balance.
            </Alert>
          )}

          <Stack spacing={1.6}>
            {MUSCLE_GROUPS.map((muscle) => {
              const pct = data[muscle] ?? 0;
              const color = MUSCLE_COLORS[muscle] || 'var(--accent-primary)';
              return (
                <Box key={muscle}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {muscle}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: pct > 0 ? color : 'var(--text-secondary)' }}>
                      {pct}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: isProf ? '0px' : 3,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: color,
                        borderRadius: isProf ? '0px' : 3
                      }
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

