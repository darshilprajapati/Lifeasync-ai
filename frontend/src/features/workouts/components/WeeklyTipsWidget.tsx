import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip
} from '@mui/material';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';

interface WeeklyTipsWidgetProps {
  tips?: string[];
  goal?: string;
  fitnessLevel?: string;
}

const DEFAULT_TIPS = [
  {
    title: '1. Progressive Overload Calibration',
    desc: 'When your target sets and reps feel comfortable with strict mechanical form, increase resistance by 2.5–5% or add 2 repetitions.',
    color: 'var(--accent-primary)',
    bgColor: 'rgba(99, 102, 241, 0.05)'
  },
  {
    title: '2. Intra-Workout Hydration',
    desc: 'Consume 200–250ml of water every 15–20 minutes of training to sustain intracellular hydration and prevent muscular fatigue.',
    color: '#059669',
    bgColor: 'rgba(16, 185, 129, 0.05)'
  },
  {
    title: '3. Muscular Protein Synthesis Window',
    desc: 'Allow targeted major muscle groups 48 hours of recovery before high-intensity loading on the same kinetic chain.',
    color: '#d97706',
    bgColor: 'rgba(245, 158, 11, 0.05)'
  }
];

export const WeeklyTipsWidget: React.FC<WeeklyTipsWidgetProps> = ({
  tips = [],
  goal,
  fitnessLevel
}) => {
  const displayItems = tips.length > 0
    ? tips.map((t, idx) => {
        const parts = t.split(': ');
        const title = parts.length > 1 ? `${idx + 1}. ${parts[0]}` : `${idx + 1}. Training Insight`;
        const desc = parts.length > 1 ? parts.slice(1).join(': ') : t;
        const colors = ['var(--accent-primary)', '#059669', '#d97706'];
        const bgColors = ['rgba(99, 102, 241, 0.05)', 'rgba(16, 185, 129, 0.05)', 'rgba(245, 158, 11, 0.05)'];
        return {
          title,
          desc,
          color: colors[idx % colors.length],
          bgColor: bgColors[idx % bgColors.length]
        };
      })
    : DEFAULT_TIPS;

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
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TipsAndUpdatesOutlinedIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Coaching & Recovery Tips
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5}>
              {goal && (
                <Chip
                  label={goal}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '10px',
                    fontWeight: 600,
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706'
                  }}
                />
              )}
              {fitnessLevel && (
                <Chip
                  label={fitnessLevel}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '10px',
                    fontWeight: 600,
                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--accent-primary, #6366f1)'
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
            Deterministic kinesiology & recovery guidelines for your active routine
          </Typography>

          <Stack spacing={1.5}>
            {displayItems.map((item, i) => (
              <Box key={i} sx={{ p: 1.5, borderRadius: '12px', bgcolor: item.bgColor }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: item.color, display: 'block', mb: 0.4 }}>
                  {item.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                  {item.desc}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};
