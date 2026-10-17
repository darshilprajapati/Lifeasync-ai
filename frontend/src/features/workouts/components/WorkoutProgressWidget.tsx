import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  LinearProgress,
  Grid
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { WorkoutWeekSummary } from '../types/workout';

interface WorkoutProgressWidgetProps {
  summary: WorkoutWeekSummary | null;
}

export const WorkoutProgressWidget: React.FC<WorkoutProgressWidgetProps> = ({ summary }) => {
  if (!summary) return null;

  const adherence = Math.min(100, Math.round(summary.adherenceRatePercentage || 0));

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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
            Weekly Progress & Adherence
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
            Performance snapshot for active calendar week
          </Typography>

          {/* Adherence Bar */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Weekly Target Completion
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: adherence >= 80 ? '#10b981' : 'var(--accent-primary)' }}>
                {adherence}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={adherence}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: adherence >= 80 ? '#10b981' : 'var(--accent-primary)',
                  borderRadius: 4
                }
              }}
            />
          </Box>

          {/* 4 KPI Grid Cards */}
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(16, 185, 129, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                    Workouts
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#047857', lineHeight: 1.2 }}>
                  {summary.completedWorkouts} <Typography component="span" variant="caption" sx={{ color: '#6b7280' }}>/ {summary.totalPlannedWorkouts}</Typography>
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#059669', fontWeight: 500 }}>
                  {summary.completedExercises !== undefined && summary.totalScheduledExercises !== undefined
                    ? `${summary.completedExercises}/${summary.totalScheduledExercises} exercises`
                    : `${summary.completedWorkouts} days completed`}
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(99, 102, 241, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <AccessTimeIcon sx={{ fontSize: 16, color: 'var(--accent-primary)' }} />
                  <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Total Time
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {summary.totalMinutesExercised} <Typography component="span" variant="caption" sx={{ color: '#6b7280' }}>mins</Typography>
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(249, 115, 22, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <LocalFireDepartmentIcon sx={{ fontSize: 16, color: '#ea580c' }} />
                  <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 600 }}>
                    Est. Burn
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#c2410c' }}>
                  {summary.totalEstimatedCaloriesBurned} <Typography component="span" variant="caption" sx={{ color: '#6b7280' }}>kcal</Typography>
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: 'rgba(245, 158, 11, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <EmojiEventsIcon sx={{ fontSize: 16, color: '#d97706' }} />
                  <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>
                    Life Score Impact
                  </Typography>
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#b45309' }}>
                  +{Math.min(15, Math.round((summary.totalMinutesExercised / 30) * 15))} <Typography component="span" variant="caption" sx={{ color: '#6b7280' }}>/ 15 pts</Typography>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};
