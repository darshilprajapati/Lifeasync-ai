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
import { useThemeSystem } from '../../../context/ThemeContext';
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
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

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
  let cardBorder = isProf
    ? (isDark ? '1px solid #2E3846' : '1px solid #DFE1E6')
    : isDark
    ? '1px solid rgba(255, 255, 255, 0.08)'
    : '1px solid rgba(255, 255, 255, 0.7)';

  let cardShadow = isProf
    ? 'var(--shadow-soft)'
    : isDark
    ? '0 8px 24px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 8px 24px -4px rgba(142, 141, 138, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)';

  if (isToday) {
    cardBorder = '2px solid var(--accent-primary)';
    cardShadow = isProf
      ? 'var(--shadow-soft)'
      : isDark
      ? '0 12px 28px rgba(255, 111, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
      : '0 10px 24px -2px rgba(255, 111, 38, 0.22), inset 0 1px 0 #ffffff';
  } else if (isFullyCompleted) {
    cardBorder = '2px solid #10B981';
  } else if (isPartiallyCompleted) {
    cardBorder = '1.5px solid #F59E0B';
  }

  const cardBg = isProf
    ? 'var(--card-bg)'
    : isDark
    ? (isToday ? 'rgba(32, 37, 54, 0.92)' : 'rgba(26, 29, 45, 0.85)')
    : (isToday ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)');

  return (
    <Card
      sx={{
        borderRadius: isProf ? '0px !important' : '18px',
        bgcolor: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
        backdropFilter: isProf ? 'none' : 'blur(12px)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        width: '100%',
        height: '100%',
        transition: isProf
          ? 'background-color 0.15s ease, border-color 0.15s ease'
          : 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        '&:hover': {
          transform: isProf ? 'none' : 'translateY(-4px)',
          boxShadow: isProf ? 'var(--shadow-soft)' : isToday ? '0 16px 32px rgba(255, 111, 38, 0.3)' : 'var(--shadow-hover)'
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, lg: 1.25, xl: 1.5 }, pb: '14px !important', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Day Header */}
        <Box sx={{ mb: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: { xs: '11px', lg: '10px', xl: '11px' }, whiteSpace: 'nowrap' }}>
                {dayNameShort} · {dateFormatted}
              </Typography>

              {isToday && (
                <Box
                  sx={{
                    background: isProf ? 'var(--accent-primary)' : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%)',
                    color: '#fff',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    px: 0.8,
                    py: 0.15,
                    borderRadius: isProf ? '0px !important' : '6px',
                    boxShadow: isProf ? 'none' : '0 2px 6px rgba(255, 111, 38, 0.35)',
                    lineHeight: 1.3
                  }}
                >
                  Today
                </Box>
              )}

              {isFullyCompleted && !isToday && (
                <Box
                  sx={{
                    background: isProf ? '#10B981' : 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                    color: '#fff',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    px: 0.8,
                    py: 0.15,
                    borderRadius: isProf ? '0px !important' : '6px',
                    boxShadow: isProf ? 'none' : '0 2px 6px rgba(16, 185, 129, 0.35)',
                    lineHeight: 1.3
                  }}
                >
                  Done
                </Box>
              )}
            </Stack>

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
              bgcolor: isProf ? 'transparent' : 'rgba(139, 92, 246, 0.05)',
              border: isProf ? '1px dashed var(--card-border)' : '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: isProf ? '0px !important' : '14px',
              textAlign: 'center',
              my: 'auto'
            }}
          >
            <HotelIcon sx={{ color: '#8B5CF6', fontSize: 28, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#8B5CF6', display: 'block' }}>
              Rest & Recovery
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', mt: 0.5 }}>
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
                    borderRadius: isProf ? '0px !important' : '8px',
                    bgcolor: completedExercises > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 115, 56, 0.1)',
                    color: completedExercises > 0 ? '#10B981' : 'var(--accent-primary)',
                    fontWeight: 600,
                    fontSize: '11px',
                    height: 22
                  }}
                />
              </Tooltip>
              <Tooltip title={completedExercises > 0 ? "Estimated calories burned from completed exercises" : "Estimated calories upon completing full session"}>
                <Chip
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: '13px !important', color: '#F97316 !important' }} />}
                  label={completedExercises > 0 && day.estimatedCaloriesBurned != null
                    ? `${day.estimatedCaloriesBurned} kcal est.`
                    : `0 kcal (${totalExercises * 45} est.)`}
                  size="small"
                  sx={{
                    borderRadius: isProf ? '0px !important' : '8px',
                    bgcolor: 'rgba(249, 115, 22, 0.1)',
                    color: '#EA580C',
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
                    <CheckCircleIcon sx={{ fontSize: 13, color: '#10B981', flexShrink: 0 }} />
                  ) : (
                    <FitnessCenterIcon sx={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }} />
                  )}
                  <Tooltip title={`${ex.exerciseName} (${ex.sets}x${ex.reps})`} arrow>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: '11px', lg: '10px', xl: '11px' },
                        color: ex.isCompleted ? '#10B981' : 'var(--text-primary)',
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
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  +{totalExercises - 3} more exercises
                </Typography>
              )}

              {totalExercises === 0 && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '11px' }}>
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
                  <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 700, color: isFullyCompleted ? '#10B981' : 'var(--accent-primary)' }}>
                    {progressPercent}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? '0px !important' : 3,
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isFullyCompleted ? '#10B981' : 'var(--accent-primary)',
                      borderRadius: isProf ? '0px !important' : 3
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
                borderRadius: isProf ? '0px !important' : '10px',
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
                borderRadius: isProf ? '0px !important' : '10px',
                py: { xs: 0.6, lg: 0.5, xl: 0.6 },
                fontSize: { xs: '12px', lg: '10.5px', xl: '11.5px' },
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: isToday
                  ? isProf
                    ? 'var(--accent-primary)'
                    : 'var(--accent-primary)'
                  : 'transparent',
                background: isToday && !isProf
                  ? 'linear-gradient(180deg, #FF7A45 0%, #FF5722 100%)'
                  : undefined,
                borderColor: isToday ? 'transparent' : isProf ? 'var(--card-border)' : 'rgba(255, 115, 56, 0.3)',
                color: isToday ? '#ffffff' : 'var(--text-primary)',
                boxShadow: isToday && !isProf
                  ? '0 4px 14px rgba(255, 87, 34, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
                  : 'none',
                transition: isProf
                  ? 'background-color 0.15s ease, border-color 0.15s ease'
                  : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                '&:hover': {
                  bgcolor: isToday
                    ? isProf
                      ? 'var(--accent-secondary)'
                      : 'var(--accent-secondary)'
                    : isProf
                    ? 'rgba(0, 0, 0, 0.04)'
                    : 'rgba(255, 115, 56, 0.08)',
                  transform: isProf ? 'none' : 'translateY(-2px)',
                  boxShadow: isToday && !isProf
                    ? '0 6px 18px rgba(255, 87, 34, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                    : 'none'
                },
                '&:active': {
                  transform: isProf ? 'none' : 'translateY(1px)'
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
