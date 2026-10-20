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
import { useThemeSystem } from '../../../context/ThemeContext';

interface WeeklyTipsWidgetProps {
  tips?: string[];
  goal?: string;
  fitnessLevel?: string;
}

const DEFAULT_TIPS = [
  {
    title: '1. Progressive Overload Calibration',
    desc: 'When your target sets and reps feel comfortable with strict mechanical form, increase resistance by 2.5–5% or add 2 repetitions.',
    color: '#FF6F26',
    bgColor: 'rgba(255, 111, 38, 0.08)'
  },
  {
    title: '2. Intra-Workout Hydration',
    desc: 'Consume 200–250ml of water every 15–20 minutes of training to sustain intracellular hydration and prevent muscular fatigue.',
    color: '#059669',
    bgColor: 'rgba(16, 185, 129, 0.08)'
  },
  {
    title: '3. Muscular Protein Synthesis Window',
    desc: 'Allow targeted major muscle groups 48 hours of recovery before high-intensity loading on the same kinetic chain.',
    color: '#d97706',
    bgColor: 'rgba(245, 158, 11, 0.08)'
  }
];

export const WeeklyTipsWidget: React.FC<WeeklyTipsWidgetProps> = ({
  tips = [],
  goal,
  fitnessLevel
}) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';

  const displayItems = tips.length > 0
    ? tips.map((t, idx) => {
        const parts = t.split(': ');
        const title = parts.length > 1 ? `${idx + 1}. ${parts[0]}` : `${idx + 1}. Training Insight`;
        const desc = parts.length > 1 ? parts.slice(1).join(': ') : t;
        const colors = ['#FF6F26', '#059669', '#d97706'];
        const bgColors = ['rgba(255, 111, 38, 0.08)', 'rgba(16, 185, 129, 0.08)', 'rgba(245, 158, 11, 0.08)'];
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
                    borderRadius: isProf ? '0px' : '8px',
                    bgcolor: 'rgba(255, 111, 38, 0.12)',
                    color: '#FF6F26'
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
              <Box key={i} sx={{ p: 1.5, borderRadius: isProf ? '0px' : '12px', bgcolor: item.bgColor, border: isProf ? '1px solid var(--border-color, #E2E8F0)' : 'none' }}>
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
