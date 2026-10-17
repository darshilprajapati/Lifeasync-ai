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

interface BodyFocusBalanceWidgetProps {
  distribution?: Record<string, number>;
  completedDistribution?: Record<string, number>;
}

const MUSCLE_GROUPS = ['Back', 'Chest', 'Shoulders', 'Legs', 'Cardio', 'Core', 'Arms'];

const MUSCLE_COLORS: Record<string, string> = {
  Back: '#3b82f6',
  Chest: '#ef4444',
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
  const data = completedDistribution || distribution || {};
  const totalVolume = Object.values(data).reduce((acc, v) => acc + (v || 0), 0);
  const isEmpty = totalVolume === 0;

  return (
    <Card
      sx={{
        borderRadius: '16px',
        bgcolor: 'var(--bg-card, #ffffff)',
        boxShadow: 'var(--shadow-soft, 0 4px 16px rgba(0,0,0,0.06))',
        border: '1px solid rgba(0,0,0,0.08)',
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <AccessibilityNewIcon sx={{ color: 'var(--accent-primary)', fontSize: 20 }} />
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
                borderRadius: '8px',
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
                      borderRadius: 3,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: color,
                        borderRadius: 3
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

