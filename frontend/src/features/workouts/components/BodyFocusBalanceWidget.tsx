import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

interface BodyFocusBalanceWidgetProps {
  distribution: Record<string, number>;
  completedDistribution?: Record<string, number>;
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

export const BodyFocusBalanceWidget: React.FC<BodyFocusBalanceWidgetProps> = ({
  distribution,
  completedDistribution = {}
}) => {
  const [viewMode, setViewMode] = useState<'planned' | 'completed'>('planned');

  const hasCompletedData = Object.keys(completedDistribution).length > 0;
  const activeData = viewMode === 'completed' && hasCompletedData ? completedDistribution : distribution;

  const groups = Object.keys(activeData).length > 0 ? activeData : {};

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
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AccessibilityNewIcon sx={{ color: 'var(--accent-primary)', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Body Focus & Balance
              </Typography>
            </Stack>

            {hasCompletedData && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, next) => next && setViewMode(next)}
                size="small"
                sx={{
                  height: 24,
                  '& .MuiToggleButton-root': {
                    fontSize: '10px',
                    px: 1,
                    py: 0,
                    textTransform: 'none',
                    fontWeight: 600,
                  }
                }}
              >
                <ToggleButton value="planned">Planned</ToggleButton>
                <ToggleButton value="completed">Done</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
            {viewMode === 'completed'
              ? 'Realized muscle training volume from completed exercises'
              : 'Kinematic muscle group load distribution across routine'}
          </Typography>

          {Object.keys(groups).length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {viewMode === 'completed'
                  ? 'No completed exercises yet this week.'
                  : 'No active workout routine loaded.'}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.6}>
              {Object.entries(groups).map(([muscle, pct]) => {
                const color = MUSCLE_COLORS[muscle] || 'var(--accent-primary)';
                return (
                  <Box key={muscle}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
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
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
