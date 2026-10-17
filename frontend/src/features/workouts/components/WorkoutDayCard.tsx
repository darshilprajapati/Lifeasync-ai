import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HotelIcon from '@mui/icons-material/Hotel';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import type { WorkoutDay } from '../types/workout';

interface WorkoutDayCardProps {
  day: WorkoutDay;
  calendarDate: Date;
  isToday: boolean;
  onToggleComplete: (day: WorkoutDay, date: Date) => void;
  onEdit: (day: WorkoutDay) => void;
}

export const WorkoutDayCard: React.FC<WorkoutDayCardProps> = ({
  day,
  calendarDate,
  isToday,
  onToggleComplete,
  onEdit,
}) => {
  const isCompleted = day.isCompletedForDate;
  const dayNameShort = calendarDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dateFormatted = calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card
      sx={{
        borderRadius: '16px',
        bgcolor: 'var(--bg-card, #ffffff)',
        border: isToday
          ? '2px solid var(--accent-primary, #6366f1)'
          : isCompleted
          ? '2px solid #10b981'
          : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isToday ? '0 8px 24px rgba(99, 102, 241, 0.15)' : 'var(--shadow-soft, 0 4px 12px rgba(0,0,0,0.05))',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 200,
        flex: '1 1 0',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.08)'
        }
      }}
    >
      {/* Today Pill */}
      {isToday && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            right: 12,
            bgcolor: 'var(--accent-primary, #6366f1)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            px: 1,
            py: 0.2,
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)'
          }}
        >
          Today
        </Box>
      )}

      <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Day Header */}
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase' }}>
              {dayNameShort} · {dateFormatted}
            </Typography>
            <Tooltip title="Customize Day Routine">
              <IconButton size="small" onClick={() => onEdit(day)} sx={{ color: 'var(--text-secondary, #8D8D8D)', p: 0.5 }}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: day.isRestDay ? '#8B5CF6' : 'var(--text-primary, #111827)',
              fontSize: '15px',
              mt: 0.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {day.focusTitle}
          </Typography>
        </Box>

        {/* Card Body */}
        {day.isRestDay ? (
          <Box
            sx={{
              py: 2.5,
              px: 1,
              bgcolor: 'rgba(139, 92, 246, 0.05)',
              borderRadius: '12px',
              textAlign: 'center',
              my: 'auto'
            }}
          >
            <HotelIcon sx={{ color: '#8B5CF6', fontSize: 28, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#8B5CF6', display: 'block' }}>
              Rest & Recovery
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary, #6b7280)', fontSize: '11px', display: 'block', mt: 0.5 }}>
              {day.restDayNotes || 'Light stretching & recovery sleep'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ my: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Target Duration & Calories */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                label={`${day.targetDurationMinutes} min`}
                size="small"
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.08)',
                  color: 'var(--accent-primary, #6366f1)',
                  fontWeight: 600,
                  fontSize: '11px',
                  height: 22
                }}
              />
              <Chip
                icon={<LocalFireDepartmentIcon sx={{ fontSize: '13px !important', color: '#f97316 !important' }} />}
                label={day.estimatedCaloriesBurned ? `Est. ${day.estimatedCaloriesBurned} kcal` : `${day.exercises.length * 45} kcal`}
                size="small"
                sx={{
                  bgcolor: 'rgba(249, 115, 22, 0.08)',
                  color: '#ea580c',
                  fontWeight: 600,
                  fontSize: '11px',
                  height: 22
                }}
              />
            </Stack>

            {/* Exercise List preview */}
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {day.exercises.slice(0, 3).map((ex) => (
                <Stack key={ex.id || ex.exerciseId} direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                  <FitnessCenterIcon sx={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '11px',
                      color: 'var(--text-primary, #374151)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {ex.exerciseName} ({ex.sets}x{ex.reps})
                  </Typography>
                </Stack>
              ))}
              {day.exercises.length > 3 && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary, #6b7280)', fontSize: '10px' }}>
                  +{day.exercises.length - 3} more exercises
                </Typography>
              )}
              {day.exercises.length === 0 && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary, #9ca3af)', fontStyle: 'italic', fontSize: '11px' }}>
                  No exercises added
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Action Button: Mark Done / Completed */}
        <Box sx={{ mt: 2 }}>
          {day.isRestDay ? (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled
              sx={{
                borderRadius: '10px',
                py: 0.6,
                fontSize: '11px',
                textTransform: 'none',
                borderColor: 'rgba(139, 92, 246, 0.2)',
                color: '#8B5CF6'
              }}
            >
              Rest Scheduled
            </Button>
          ) : (
            <Button
              fullWidth
              size="small"
              variant={isCompleted ? 'contained' : 'outlined'}
              onClick={() => onToggleComplete(day, calendarDate)}
              startIcon={
                isCompleted ? (
                  <CheckCircleIcon sx={{ fontSize: '16px !important', color: '#ffffff' }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: '16px !important' }} />
                )
              }
              sx={{
                borderRadius: '10px',
                py: 0.6,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: isCompleted ? '#10b981' : 'transparent',
                borderColor: isCompleted ? '#10b981' : 'rgba(0, 0, 0, 0.15)',
                color: isCompleted ? '#ffffff' : 'var(--text-primary, #111827)',
                '&:hover': {
                  bgcolor: isCompleted ? '#059669' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: isCompleted ? '#059669' : 'var(--accent-primary, #6366f1)'
                }
              }}
            >
              {isCompleted ? 'Completed' : 'Mark Done'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
