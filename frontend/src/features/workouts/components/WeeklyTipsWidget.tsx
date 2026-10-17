import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack
} from '@mui/material';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';

export const WeeklyTipsWidget: React.FC = () => {
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
            <TipsAndUpdatesOutlinedIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Coaching & Recovery Tips
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
            Kinesiology guidelines for sustainable fitness adaptation
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', mb: 0.5 }}>
                1. Progressive Overload
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                When 3 sets of 12 reps feel comfortable with clean form, increase resistance by 2.5–5% or increase reps to 15.
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(16, 185, 129, 0.05)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', display: 'block', mb: 0.5 }}>
                2. Intra-Workout Hydration
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                Consume 250ml of water every 15–20 minutes of intense training to sustain muscular contractions and avoid cramping.
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#d97706', display: 'block', mb: 0.5 }}>
                3. The 48-Hour Muscle Window
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                Allow targeted muscle groups 48 hours to complete protein synthesis before training the exact same muscle group again.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};
