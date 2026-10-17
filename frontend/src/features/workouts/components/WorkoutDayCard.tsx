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
  Tooltip,
  LinearProgress
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HotelIcon from '@mui/icons-material/Hotel';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { WorkoutDay } from '../types/workout';

interface WorkoutDayCardProps {
  day: WorkoutDay;
  calendarDate: Date;
  isToday: boolean;
  onOpenDetail: (day: WorkoutDay, date: Date) => void;
  onEdit: (day: WorkoutDay) => void;
}

export const WorkoutDayCard: React.FC<WorkoutDayCardProps> = ({
  day,
  calendarDate,
  isToday,
  onOpenDetail,
  onEdit
}) => {
  const today = new Date();
  const isPast = calendarDate < new Date(today.setHours(0, 0, 0, 0));
  const isFuture = calendarDate > new Date(today.setHours(23, 59, 59, 999));

  const totalExercises = day.exercises?.length ?? 0;
  const completedExercises = day.exercises?.filter((e) => e.isCompleted).length ?? 0;
  const isFullyCompleted = day.isCompletedForDate || (totalExercises > 0 && completedExercises === totalExercises);
  const isPartiallyCompleted = !isFullyCompleted && completedExercises > 0;
  const progressPercent = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const dayNameShort = calendarDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dateFormatted = calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Border & Glow styling
  let cardBorder = '1px solid rgba(0, 0, 0, 0.08)';
  let cardShadow = 'var(--shadow-soft, 0 4px 12px rgba(0,0,0,0.05))';

  if (isToday) {
    cardBorder = '2px solid var(--accent-primary, #6366f1)';
    cardShadow = '0 8px 24px rgba(99, 102, 241, 0.16)';
  } else if (isFullyCompleted) {
    cardBorder = '2px solid #10b981';
  } else if (isPartiallyCompleted) {
    cardBorder = '1.5px solid #f59e0b';
  }

  return (
    <Card
      sx={{
        borderRadius: '16px',
        bgcolor: 'var(--bg-card, #ffffff)',
        border: cardBorder,
        boxShadow: cardShadow,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        width: '100%',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.08)'
        }
      }}
    >
      {/* Top Status Pill */}
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
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)',
            zIndex: 1
          }}
        >
          Today
        </Box>
      )}

      {isFullyCompleted && !isToday && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            right: 12,
            bgcolor: '#10b981',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            px: 1,
            py: 0.2,
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
            zIndex: 1
          }}
        >
          Completed
        </Box>
      )}

      <CardContent sx={{ p: { xs: 2, lg: 1.25, xl: 1.5 }, pb: '14px !important', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Day Header */}
        <Box sx={{ mb: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary, #6b7280)', textTransform: 'uppercase', fontSize: { xs: '11px', lg: '10px', xl: '11px' } }}>
              {dayNameShort} · {dateFormatted}
            </Typography>

            {isPast ? (
              <Tooltip title="Past workouts are immutable and cannot be modified">
                <Box component="span">
                  <IconButton size="small" disabled sx={{ p: 0.3, opacity: 0.4 }}>
                    <LockOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Customize Day Routine">
                <IconButton size="small" onClick={() => onEdit(day)} sx={{ color: 'var(--text-secondary, #8D8D8D)', p: 0.3 }}>
                  <EditOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <Tooltip title={day.focusTitle} arrow>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: day.isRestDay ? '#8B5CF6' : 'var(--text-primary, #111827)',
                fontSize: { xs: '14.5px', lg: '12.5px', xl: '14px' },
                mt: 0.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'default'
              }}
            >
              {day.focusTitle}
            </Typography>
          </Tooltip>
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
              {day.restDayNotes || 'Active rest, walking & sleep'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ my: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Duration & Calories: Clear Distinction Between Planned and Actual */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Tooltip title={completedExercises > 0 ? "Actual completed workout duration" : "Target planned duration"}>
                <Chip
                  icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                  label={completedExercises > 0 && day.actualDurationMinutes != null
                    ? `${day.actualDurationMinutes} min`
                    : `Plan: ${day.targetDurationMinutes} min`}
                  size="small"
                  sx={{
                    bgcolor: completedExercises > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                    color: completedExercises > 0 ? '#059669' : 'var(--accent-primary, #6366f1)',
                    fontWeight: 600,
                    fontSize: '11px',
                    height: 22
                  }}
                />
              </Tooltip>
              <Tooltip title={completedExercises > 0 ? "Estimated calories burned from completed exercises" : "Estimated calories upon completing full session"}>
                <Chip
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: '13px !important', color: '#f97316 !important' }} />}
                  label={completedExercises > 0 && day.estimatedCaloriesBurned != null
                    ? `${day.estimatedCaloriesBurned} kcal est.`
                    : `0 kcal (${totalExercises * 45} est.)`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(249, 115, 22, 0.08)',
                    color: '#ea580c',
                    fontWeight: 600,
                    fontSize: '11px',
                    height: 22
                  }}
                />
              </Tooltip>
            </Stack>

            {/* Exercise List preview */}
            <Box sx={{ mt: 0.8, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
              {day.exercises.slice(0, 3).map((ex) => (
                <Stack key={ex.id || ex.exerciseId} direction="row" spacing={0.6} sx={{ alignItems: 'center', minWidth: 0 }}>
                  {ex.isCompleted ? (
                    <CheckCircleIcon sx={{ fontSize: 13, color: '#10b981', flexShrink: 0 }} />
                  ) : (
                    <FitnessCenterIcon sx={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', flexShrink: 0 }} />
                  )}
                  <Tooltip title={`${ex.exerciseName} (${ex.sets}x${ex.reps})`} arrow>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: '11px', lg: '10px', xl: '11px' },
                        color: ex.isCompleted ? '#10b981' : 'var(--text-primary, #374151)',
                        fontWeight: ex.isCompleted ? 600 : 500,
                        textDecoration: ex.isCompleted ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'default',
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      {ex.exerciseName} ({ex.sets}x{ex.reps})
                    </Typography>
                  </Tooltip>
                </Stack>
              ))}

              {totalExercises > 3 && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary, #6b7280)', fontSize: '10px' }}>
                  +{totalExercises - 3} more exercises
                </Typography>
              )}

              {totalExercises === 0 && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary, #9ca3af)', fontStyle: 'italic', fontSize: '11px' }}>
                  No exercises added
                </Typography>
              )}
            </Box>

            {/* Completion Progress Bar */}
            {totalExercises > 0 && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {isFullyCompleted ? 'All exercises done' : `${completedExercises}/${totalExercises} done`}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 700, color: isFullyCompleted ? '#10b981' : 'var(--accent-primary)' }}>
                    {progressPercent}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 5,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.06)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isFullyCompleted ? '#10b981' : 'var(--accent-primary)',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Action Button: Opens Day Workout Detail Modal */}
        <Box sx={{ mt: 2 }}>
          {day.isRestDay ? (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled
              sx={{
                borderRadius: '10px',
                py: { xs: 0.6, lg: 0.5, xl: 0.6 },
                fontSize: { xs: '11px', lg: '10px', xl: '11px' },
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
              variant={isToday ? 'contained' : 'outlined'}
              onClick={() => onOpenDetail(day, calendarDate)}
              startIcon={
                isToday ? (
                  <PlayArrowIcon sx={{ fontSize: '15px !important' }} />
                ) : (
                  <VisibilityOutlinedIcon sx={{ fontSize: '15px !important' }} />
                )
              }
              sx={{
                borderRadius: '10px',
                py: { xs: 0.6, lg: 0.5, xl: 0.6 },
                fontSize: { xs: '12px', lg: '10.5px', xl: '11.5px' },
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: isToday ? 'var(--accent-primary, #6366f1)' : 'transparent',
                borderColor: isToday ? 'var(--accent-primary, #6366f1)' : 'rgba(0, 0, 0, 0.15)',
                color: isToday ? '#ffffff' : 'var(--text-primary, #111827)',
                '&:hover': {
                  bgcolor: isToday ? '#4f46e5' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: isToday ? '#4f46e5' : 'var(--accent-primary, #6366f1)'
                }
              }}
            >
              {isToday
                ? isFullyCompleted
                  ? 'Review Workout'
                  : completedExercises > 0
                  ? 'Continue Workout'
                  : 'Start Workout'
                : isPast
                ? 'View History'
                : isFuture
                ? 'Scheduled Workout'
                : 'View Workout'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
