import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EventIcon from '@mui/icons-material/Event';
import HotelIcon from '@mui/icons-material/Hotel';
import type { WorkoutDay, WorkoutDayExercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseDemonstrationMedia } from './ExerciseDemonstrationMedia';
import { trackAction } from '../../../utils/analytics';
import { formatLocalDate, isDateToday } from '../utils/workoutDateUtils';
import { useNotification } from '../../../context/NotificationContext';

interface WorkoutDayDetailModalProps {
  open: boolean;
  day: WorkoutDay | null;
  calendarDate: Date;
  onClose: () => void;
  onDayUpdated: (updatedDay: WorkoutDay) => void;
}

export const WorkoutDayDetailModal: React.FC<WorkoutDayDetailModalProps> = ({
  open,
  day,
  calendarDate,
  onClose,
  onDayUpdated
}) => {
  const { notify } = useNotification();
  const [activeDay, setActiveDay] = useState<WorkoutDay | null>(day);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Sync state when day changes
  React.useEffect(() => {
    setActiveDay(day);
  }, [day]);

  if (!activeDay) return null;

  const isToday = isDateToday(calendarDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isPast = calendarDate < todayStart;
  const isFuture = calendarDate > todayEnd;

  const exercises = activeDay.exercises || [];
  const completedCount = exercises.filter((e) => e.isCompleted).length;
  const totalCount = exercises.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFullyCompleted = activeDay.isCompletedForDate || (totalCount > 0 && completedCount === totalCount);

  const formattedDate = calendarDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleToggleExercise = async (ex: WorkoutDayExercise) => {
    if (togglingId !== null) return; // Prevent duplicate concurrent requests

    if (!isToday) {
      const msg = 'Workout exercises can only be completed for today’s scheduled date.';
      notify.warning(msg, 'Restricted Action');
      return;
    }

    setTogglingId(ex.id);

    try {
      const sessionDateStr = formatLocalDate(calendarDate);
      let updatedDay: WorkoutDay;

      if (ex.isCompleted) {
        // Undo completion
        updatedDay = await workoutService.undoExercise(ex.id, sessionDateStr);
        trackAction('workout_exercise_undone', {
          module: 'workout',
          exercise_id: ex.exerciseId,
          day_id: activeDay.id
        });
        notify.info(`Reverted completion for ${ex.exerciseName}.`, 'Exercise Status Updated');
      } else {
        // Mark complete
        updatedDay = await workoutService.completeExercise(ex.id, sessionDateStr);
        trackAction('workout_exercise_completed', {
          module: 'workout',
          exercise_id: ex.exerciseId,
          day_id: activeDay.id
        });
        notify.success(`Completed ${ex.exerciseName}! Great work.`, 'Exercise Completed');
      }

      setActiveDay(updatedDay);
      onDayUpdated(updatedDay);
      window.dispatchEvent(new CustomEvent('lifesync:workout-updated', { detail: { day: updatedDay } }));
    } catch (err: any) {
      console.error('Failed to toggle exercise completion:', err);
      const errMsg = err?.response?.data?.message || 'Failed to update exercise status.';
      notify.error(errMsg, 'Update Failed');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            bgcolor: 'var(--bg-card, #ffffff)',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            maxHeight: '90vh'
          }
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.8 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'var(--accent-primary, #6366f1)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px'
              }}
            >
              {formattedDate}
            </Typography>

            {isToday && (
              <Chip
                label="Today's Session"
                size="small"
                sx={{
                  bgcolor: 'var(--accent-primary, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '10px',
                  height: 20
                }}
              />
            )}

            {isPast && (
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: '11px !important', color: '#6b7280 !important' }} />}
                label="Historical (Immutable)"
                size="small"
                sx={{
                  bgcolor: 'rgba(107, 114, 128, 0.1)',
                  color: '#6b7280',
                  fontWeight: 700,
                  fontSize: '10px',
                  height: 20
                }}
              />
            )}

            {isFuture && (
              <Chip
                icon={<EventIcon sx={{ fontSize: '11px !important', color: '#3b82f6 !important' }} />}
                label="Upcoming"
                size="small"
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  fontWeight: 700,
                  fontSize: '10px',
                  height: 20
                }}
              />
            )}
          </Stack>

          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeDay.focusTitle}
          </Typography>

          {!activeDay.isRestDay && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: 'center' }}>
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
                label={
                  completedCount > 0 && activeDay.actualDurationMinutes != null
                    ? `${activeDay.actualDurationMinutes} mins actual (${activeDay.targetDurationMinutes}m planned)`
                    : `${activeDay.targetDurationMinutes} mins planned`
                }
                size="small"
                sx={{
                  bgcolor: completedCount > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                  color: completedCount > 0 ? '#059669' : 'var(--accent-primary)',
                  fontWeight: 600
                }}
              />
              <Chip
                icon={<LocalFireDepartmentIcon sx={{ fontSize: '14px !important', color: '#f97316 !important' }} />}
                label={
                  completedCount > 0 && activeDay.estimatedCaloriesBurned != null
                    ? `${activeDay.estimatedCaloriesBurned} kcal burned (est.)`
                    : `0 kcal (est. ${totalCount * 45} kcal total)`
                }
                size="small"
                sx={{ bgcolor: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', fontWeight: 600 }}
              />
              <Chip
                label={`${completedCount} of ${totalCount} completed`}
                size="small"
                sx={{
                  bgcolor: isFullyCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  color: isFullyCompleted ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: 700
                }}
              />
            </Stack>
          )}
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>

        {/* Rest Day view */}
        {activeDay.isRestDay ? (
          <Box
            sx={{
              py: 6,
              px: 2,
              textAlign: 'center',
              bgcolor: 'rgba(139, 92, 246, 0.04)',
              borderRadius: '16px',
              border: '1px dashed rgba(139, 92, 246, 0.3)'
            }}
          >
            <HotelIcon sx={{ fontSize: 48, color: '#8b5cf6', mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
              Rest & Recovery Scheduled
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', maxWidth: 460, mx: 'auto', mt: 1 }}>
              {activeDay.restDayNotes ||
                'Rest days allow muscle tissue remodeling and central nervous system regeneration. Prioritize hydration, joint mobility, and restful sleep.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Completion Progress Bar */}
            <Box
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: isFullyCompleted ? 'rgba(16, 185, 129, 0.06)' : 'rgba(99, 102, 241, 0.04)',
                border: isFullyCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(99, 102, 241, 0.1)'
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isFullyCompleted ? '#10b981' : 'var(--text-primary)' }}>
                  {isFullyCompleted ? '🎉 Workout Fully Completed!' : `Workout Session Progress (${progressPercent}%)`}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {completedCount} / {totalCount} Exercises Done
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isFullyCompleted ? '#10b981' : 'var(--accent-primary)',
                    borderRadius: 4
                  }
                }}
              />
            </Box>

            {/* Exercise List */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scheduled Exercises ({exercises.length})
            </Typography>

            {exercises.map((ex, index) => {
              const isExDone = Boolean(ex.isCompleted);
              const isToggling = togglingId === ex.id;

              return (
                <Box
                  key={ex.id || index}
                  sx={{
                    borderRadius: '16px',
                    border: isExDone ? '1px solid #10b981' : '1px solid rgba(0, 0, 0, 0.08)',
                    bgcolor: isExDone ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-card, #ffffff)',
                    p: 2.5,
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.04))'
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2.5}
                    sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
                  >
                    {/* Media Demonstration Animation */}
                    <Box sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
                      <ExerciseDemonstrationMedia
                        exerciseName={ex.exerciseName}
                        category={ex.category}
                        targetMuscles={ex.targetMuscles}
                        instructions={ex.instructions}
                        size="compact"
                        autoPlay={isToday && !isExDone}
                      />
                    </Box>

                    {/* Exercise Details */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: 'rgba(0,0,0,0.06)' }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-primary)' }}>
                          {ex.exerciseName}
                        </Typography>
                        {ex.requiresEquipment && (
                          <Chip
                            icon={<FitnessCenterIcon sx={{ fontSize: '12px !important' }} />}
                            label={ex.equipmentType}
                            size="small"
                            sx={{ height: 20, fontSize: '10px', fontWeight: 600, bgcolor: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)' }}
                          />
                        )}
                      </Stack>

                      {/* Sets, Reps, Rest Chips */}
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={`${ex.sets} Sets`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: 'rgba(0,0,0,0.05)', fontSize: '11px' }}
                        />
                        <Chip
                          label={`${ex.reps} Reps`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: 'rgba(0,0,0,0.05)', fontSize: '11px' }}
                        />
                        <Chip
                          label={`${ex.restSeconds}s Rest`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: 'rgba(0,0,0,0.05)', fontSize: '11px' }}
                        />
                      </Stack>

                      {/* Instructions */}
                      {ex.instructions && (
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
                          {ex.instructions}
                        </Typography>
                      )}
                    </Box>

                    {/* Completion Action Control */}
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
                      <Button
                        variant={isExDone ? 'contained' : 'outlined'}
                        color={isExDone ? 'success' : 'primary'}
                        disabled={!isToday || isToggling}
                        onClick={() => handleToggleExercise(ex)}
                        startIcon={
                          isExDone ? (
                            <CheckCircleIcon sx={{ fontSize: '18px !important' }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: '18px !important' }} />
                          )
                        }
                        sx={{
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '13px',
                          px: 2.5,
                          py: 1,
                          bgcolor: isExDone ? '#10b981' : 'transparent',
                          borderColor: isExDone ? '#10b981' : 'rgba(0,0,0,0.15)',
                          color: isExDone ? '#ffffff' : 'var(--text-primary)',
                          '&:hover': {
                            bgcolor: isExDone ? '#059669' : 'rgba(99, 102, 241, 0.08)'
                          }
                        }}
                      >
                        {isExDone ? 'Completed' : 'Mark Complete'}
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
