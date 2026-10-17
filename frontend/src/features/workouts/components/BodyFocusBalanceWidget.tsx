import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  LinearProgress
} from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

interface BodyFocusBalanceWidgetProps {
  distribution: Record<string, number>;
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Legs: '#10b981',
  Shoulders: '#f59e0b',
  Arms: '#8b5cf6',
  Core: '#ec4899',
  Cardio: '#06b6d4',
  'Full Body': '#6366f1'
};

export const BodyFocusBalanceWidget: React.FC<BodyFocusBalanceWidgetProps> = ({ distribution }) => {
  const groups = Object.keys(distribution).length > 0
    ? distribution
    : {
        Chest: 25,
        Back: 20,
        Legs: 25,
        Shoulders: 15,
        Arms: 15
      };

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
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2.5 }}>
            Kinematic muscle group load distribution across your routine
          </Typography>

          <Stack spacing={1.8}>
            {Object.entries(groups).map(([muscle, pct]) => {
              const color = MUSCLE_COLORS[muscle] || 'var(--accent-primary)';
              return (
                <Box key={muscle}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {muscle}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color }}>
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
