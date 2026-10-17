import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SpeedIcon from '@mui/icons-material/Speed';
import type { Exercise } from '../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  actionLabel?: string;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onSelect,
  actionLabel = 'Add to Routine'
}) => {
  return (
    <Card
      sx={{
        borderRadius: '14px',
        bgcolor: 'var(--bg-card, #ffffff)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: 'var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.04))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
        }
      }}
    >
      <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: 1.3
            }}
          >
            {exercise.name}
          </Typography>
          <Chip
            label={exercise.category}
            size="small"
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              fontSize: '10px',
              height: 20
            }}
          />
        </Stack>

        <Typography
          variant="caption"
          sx={{
            color: 'var(--text-secondary)',
            fontSize: '11px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {exercise.targetMuscles}
        </Typography>

        {/* Equipment & Difficulty Badges */}
        <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {exercise.requiresEquipment ? (
            <Chip
              label={exercise.equipmentType}
              size="small"
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '10px',
                height: 20
              }}
            />
          ) : (
            <Chip
              label="Bodyweight"
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                fontWeight: 600,
                fontSize: '10px',
                height: 20
              }}
            />
          )}

          <Chip
            label={exercise.difficultyLevel}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '10px',
              height: 20,
              borderColor: 'rgba(0,0,0,0.1)'
            }}
          />

          <Chip
            icon={<SpeedIcon sx={{ fontSize: '11px !important' }} />}
            label={`${exercise.estimatedMetValue} MET`}
            size="small"
            sx={{
              fontSize: '10px',
              height: 20,
              bgcolor: 'rgba(245, 158, 11, 0.1)',
              color: '#d97706'
            }}
          />
        </Stack>

        {/* Instructions preview */}
        {exercise.instructions && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontStyle: 'italic',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mt: 0.5
            }}
          >
            {exercise.instructions}
          </Typography>
        )}

        {/* Action button */}
        {onSelect && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onSelect(exercise)}
            startIcon={<AddIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              mt: 1,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 600,
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              '&:hover': {
                bgcolor: 'var(--accent-primary)',
                color: '#ffffff',
                borderColor: 'var(--accent-primary)'
              }
            }}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
