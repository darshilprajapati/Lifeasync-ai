import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
import { useThemeSystem } from '../../../context/ThemeContext';

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
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const [activeDay, setActiveDay] = useState<WorkoutDay | null>(day);
  const [completingExercise, setCompletingExercise] = useState<WorkoutDayExercise | null>(null);
  const [actualMinutesInput, setActualMinutesInput] = useState<string>('');
  const [isSubmittingDuration, setIsSubmittingDuration] = useState<boolean>(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState<boolean>(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState<boolean>(false);
  const [isFinishingSession, setIsFinishingSession] = useState<boolean>(false);

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

  const getExerciseScheduledMinutes = (ex: WorkoutDayExercise): number => {
    const sets = Math.max(1, ex.sets || 1);
    const restSecs = ex.restSeconds > 0 ? ex.restSeconds : 60;
    const exSeconds = sets * 45 + Math.max(0, sets - 1) * restSecs;
    return Math.max(1, Math.round(exSeconds / 60));
  };

  const handleOpenCompleteDialog = (ex: WorkoutDayExercise) => {
    if (!isToday) {
      const msg = 'Workout exercises can only be completed for today’s scheduled date.';
      notify.warning(msg, 'Restricted Action');
      return;
    }

    setCompletingExercise(ex);
    // If already completed, initialize with existing actual minutes; otherwise leave empty so user explicitly specifies
    if (ex.isCompleted && ex.actualDurationMinutes && ex.actualDurationMinutes > 0) {
      setActualMinutesInput(String(ex.actualDurationMinutes));
    } else {
      setActualMinutesInput('');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completingExercise || isSubmittingDuration) return;

    const trimmed = actualMinutesInput.trim();
    if (!trimmed) {
      notify.error('Please enter the actual time taken (minutes).', 'Validation Error');
      return;
    }

    const minutes = Number(trimmed);
    if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0) {
      notify.error('Actual time taken must be a positive whole number of minutes.', 'Validation Error');
      return;
    }

    setIsSubmittingDuration(true);

    try {
      const sessionDateStr = formatLocalDate(calendarDate);
      const updatedDay = await workoutService.completeExercise(
        completingExercise.id,
        sessionDateStr,
        minutes
      );

      trackAction('workout_exercise_completed', {
        module: 'workout',
        exercise_id: completingExercise.exerciseId,
        day_id: activeDay.id,
        actual_duration_minutes: minutes
      });

      notify.success(
        completingExercise.isCompleted
          ? `Updated actual duration for ${completingExercise.exerciseName} to ${minutes} mins.`
          : `Completed ${completingExercise.exerciseName} in ${minutes} mins! Great work.`,
        'Exercise Completed'
      );

      setActiveDay(updatedDay);
      onDayUpdated(updatedDay);
      window.dispatchEvent(new CustomEvent('lifesync:workout-updated', { detail: { day: updatedDay } }));
      setCompletingExercise(null);
    } catch (err: any) {
      console.error('Failed to complete exercise:', err);
      const errMsg = err?.response?.data?.message || 'Failed to save exercise completion.';
      notify.error(errMsg, 'Update Failed');
    } finally {
      setIsSubmittingDuration(false);
    }
  };

  const handleUndoExercise = async () => {
    if (!completingExercise || isSubmittingDuration) return;

    setIsSubmittingDuration(true);

    try {
      const sessionDateStr = formatLocalDate(calendarDate);
      const updatedDay = await workoutService.undoExercise(completingExercise.id, sessionDateStr);

      trackAction('workout_exercise_undone', {
        module: 'workout',
        exercise_id: completingExercise.exerciseId,
        day_id: activeDay.id
      });

      notify.info(`Reverted completion for ${completingExercise.exerciseName}.`, 'Exercise Status Updated');

      setActiveDay(updatedDay);
      onDayUpdated(updatedDay);
      window.dispatchEvent(new CustomEvent('lifesync:workout-updated', { detail: { day: updatedDay } }));
      setCompletingExercise(null);
    } catch (err: any) {
      console.error('Failed to undo exercise completion:', err);
      const errMsg = err?.response?.data?.message || 'Failed to revert exercise status.';
      notify.error(errMsg, 'Update Failed');
    } finally {
      setIsSubmittingDuration(false);
    }
  };

  const handleAttemptClose = () => {
    // If not today's session, or rest day, or no exercises were completed in this session, or already fully completed, exit safely
    if (!isToday || activeDay.isRestDay || completedCount === 0 || isFullyCompleted) {
      onClose();
      return;
    }
    // If exercises have been completed but workout is not finished yet, confirm exit
    setExitConfirmOpen(true);
  };

  const handleFinishSession = async () => {
    if (isFinishingSession) return;
    setIsFinishingSession(true);

    try {
      const sessionDateStr = formatLocalDate(calendarDate);
      const duration = activeDay.actualDurationMinutes && activeDay.actualDurationMinutes > 0
        ? activeDay.actualDurationMinutes
        : Math.max(1, activeDay.targetDurationMinutes || 25);

      await workoutService.logSession({
        workoutDayId: activeDay.id,
        sessionDate: sessionDateStr,
        isCompleted: true,
        actualDurationMinutes: duration,
        notes: `Completed ${completedCount} of ${totalCount} exercises.`
      });

      trackAction('workout_session_completed', {
        module: 'workout',
        day_id: activeDay.id,
        completed_exercises: completedCount,
        total_exercises: totalCount,
        actual_duration_minutes: duration
      });

      notify.success(
        `Workout "${activeDay.focusTitle}" finished! ${duration} mins recorded.`,
        'Workout Completed!'
      );

      const updated: WorkoutDay = {
        ...activeDay,
        isCompletedForDate: true,
        completedAt: new Date().toISOString()
      };
      setActiveDay(updated);
      onDayUpdated(updated);

      window.dispatchEvent(new CustomEvent('lifesync:workout-updated', { detail: { day: updated } }));
      window.dispatchEvent(new CustomEvent('lifesync:health-updated'));
      window.dispatchEvent(new CustomEvent('lifesync:score-updated'));

      setFinishConfirmOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to finalize workout session:', err);
      const errMsg = err?.response?.data?.message || 'Failed to complete workout session.';
      notify.error(errMsg, 'Submission Error');
    } finally {
      setIsFinishingSession(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleAttemptClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isProf ? '0px !important' : '20px',
            bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
            color: 'var(--text-primary)',
            backgroundImage: 'none',
            border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)'),
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }
      }}
    >
      {/* Sticky Header with Prominent Close (X) Button */}
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 2.5 },
          pb: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1.5,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.8, flexWrap: 'wrap', gap: 0.6 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#FF6F26',
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
                  background: isProf ? 'var(--accent-primary)' : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '10px',
                  height: 20,
                  borderRadius: isProf ? '0px !important' : '6px',
                  boxShadow: isProf ? 'none' : '0 2px 6px rgba(255, 111, 38, 0.35)'
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

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              lineHeight: 1.2
            }}
          >
            {activeDay.focusTitle}
          </Typography>

          {!activeDay.isRestDay && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', gap: 0.6 }}>
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
                  fontWeight: 600,
                  fontSize: '11px'
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
                sx={{ bgcolor: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', fontWeight: 600, fontSize: '11px' }}
              />
              <Chip
                label={`${completedCount} of ${totalCount} completed`}
                size="small"
                sx={{
                  bgcolor: isFullyCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  color: isFullyCompleted ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '11px'
                }}
              />
            </Stack>
          )}
        </Box>

        {/* Clearly Visible & Accessible Close Button */}
        <IconButton
          onClick={handleAttemptClose}
          size="medium"
          aria-label="Close workout session"
          sx={{
            flexShrink: 0,
            p: 1,
            borderRadius: isProf ? '0px' : '12px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'rgba(232, 90, 79, 0.12)',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 22 }} />
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
              bgcolor: isProf ? 'var(--card-bg)' : 'rgba(139, 92, 246, 0.04)',
              borderRadius: isProf ? '0px !important' : '16px',
              border: isProf ? '1px solid var(--card-border)' : '1px dashed rgba(139, 92, 246, 0.3)'
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
                borderRadius: isProf ? '0px !important' : '14px',
                bgcolor: isFullyCompleted 
                  ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)') 
                  : (isProf ? 'var(--card-bg)' : (isDark ? 'rgba(255, 111, 38, 0.1)' : 'rgba(255, 111, 38, 0.06)')),
                border: isFullyCompleted 
                  ? '1px solid rgba(16, 185, 129, 0.25)' 
                  : (isProf ? '1px solid var(--card-border)' : '1px solid rgba(255, 111, 38, 0.15)')
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
                  borderRadius: isProf ? '0px' : 4,
                  bgcolor: 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isFullyCompleted ? '#10b981' : '#FF6F26',
                    borderRadius: isProf ? '0px' : 4
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

              return (
                <Box
                  key={ex.id || index}
                  sx={{
                    borderRadius: isProf ? '0px !important' : '16px',
                    border: isExDone ? '1px solid #10b981' : '1px solid var(--card-border)',
                    bgcolor: isExDone
                      ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.02)')
                      : (isProf
                          ? (isDark ? '#26303F' : '#ffffff')
                          : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff')),
                    p: 2.5,
                    transition: 'all 0.2s ease',
                    boxShadow: isProf ? 'none' : '0 4px 16px rgba(0,0,0,0.04)'
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
                        secondaryMuscles={ex.secondaryMuscles}
                        instructions={ex.instructions}
                        description={ex.description}
                        postureTips={ex.postureTips}
                        commonMistakes={ex.commonMistakes}
                        safetyTips={ex.safetyTips}
                        difficultyLevel={ex.difficultyLevel}
                        equipmentType={ex.equipmentType}
                        requiresEquipment={ex.requiresEquipment}
                        defaultSets={ex.sets}
                        defaultReps={ex.reps}
                        defaultRestSeconds={ex.restSeconds}
                        animationUrl={ex.animationUrl}
                        thumbnailUrl={ex.thumbnailUrl}
                        videoUrl={ex.videoUrl}
                        isCustom={ex.isCustom}
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
                        {ex.isCustom && (
                          <Chip
                            label="Custom"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '10px',
                              fontWeight: 700,
                              bgcolor: 'rgba(236, 72, 153, 0.12)',
                              color: '#ec4899',
                              border: '1px solid rgba(236, 72, 153, 0.3)'
                            }}
                          />
                        )}
                        {ex.requiresEquipment && (
                          <Chip
                            icon={<FitnessCenterIcon sx={{ fontSize: '12px !important' }} />}
                            label={ex.equipmentType}
                            size="small"
                            sx={{ height: 20, fontSize: '10px', fontWeight: 600, bgcolor: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)' }}
                          />
                        )}
                      </Stack>

                      {/* Sets, Reps, Rest, Actual Duration Chips */}
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          label={`${ex.sets} Sets`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', fontSize: '11px', borderRadius: isProf ? '0px' : '6px' }}
                        />
                        <Chip
                          label={`${ex.reps} Reps`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', fontSize: '11px', borderRadius: isProf ? '0px' : '6px' }}
                        />
                        <Chip
                          label={`${ex.restSeconds}s Rest`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', fontSize: '11px', borderRadius: isProf ? '0px' : '6px' }}
                        />
                        {isExDone && ex.actualDurationMinutes != null && ex.actualDurationMinutes > 0 && (
                          <Chip
                            icon={<AccessTimeIcon sx={{ fontSize: '12px !important', color: '#059669 !important' }} />}
                            label={`${ex.actualDurationMinutes} mins actual`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              fontSize: '11px',
                              borderRadius: isProf ? '0px' : '6px'
                            }}
                          />
                        )}
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
                        disabled={!isToday || isSubmittingDuration}
                        onClick={() => handleOpenCompleteDialog(ex)}
                        startIcon={
                          isExDone ? (
                            <CheckCircleIcon sx={{ fontSize: '18px !important' }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: '18px !important' }} />
                          )
                        }
                        sx={{
                          borderRadius: isProf ? '0px !important' : '10px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '13px',
                          px: 2.5,
                          py: 1,
                          bgcolor: isExDone ? '#10b981' : 'transparent',
                          borderColor: isExDone ? '#10b981' : 'var(--card-border)',
                          color: isExDone ? '#ffffff' : 'var(--text-primary)',
                          '&:hover': {
                            bgcolor: isExDone ? '#059669' : (isDark ? 'rgba(255, 111, 38, 0.12)' : 'rgba(255, 111, 38, 0.08)')
                          }
                        }}
                      >
                        {isExDone ? `Completed (${ex.actualDurationMinutes || 0}m)` : 'Mark Complete'}
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* Complete Exercise Confirmation Dialog */}
      <Dialog
        open={Boolean(completingExercise)}
        onClose={() => !isSubmittingDuration && setCompletingExercise(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: isProf ? '0px !important' : '18px',
              p: 1,
              bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
              backgroundImage: 'none',
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
              boxShadow: 'var(--shadow-elevation, 0 10px 30px rgba(0,0,0,0.15))'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '19px', color: 'var(--text-primary)', pb: 0.5 }}>
          Complete Exercise
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {completingExercise && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                  Exercise: {completingExercise.exerciseName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5, fontSize: '13px' }}>
                  Scheduled duration: ~{getExerciseScheduledMinutes(completingExercise)} mins
                </Typography>
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="actual-time-input"
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 1, display: 'block' }}
                >
                  Actual time taken (minutes) *
                </Typography>
                <TextField
                  id="actual-time-input"
                  type="number"
                  fullWidth
                  autoFocus
                  placeholder="e.g. 8"
                  value={actualMinutesInput}
                  onChange={(e) => setActualMinutesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmCompletion();
                    }
                  }}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  disabled={isSubmittingDuration}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: isProf ? '0px !important' : '10px'
                    }
                  }}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'space-between' }}>
          {completingExercise?.isCompleted ? (
            <Button
              variant="text"
              color="error"
              size="small"
              onClick={handleUndoExercise}
              disabled={isSubmittingDuration}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
            >
              Undo Completion
            </Button>
          ) : (
            <Box />
          )}

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => setCompletingExercise(null)}
              disabled={isSubmittingDuration}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                borderColor: 'var(--card-border)'
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmCompletion}
              disabled={isSubmittingDuration}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'var(--accent-primary, #FF6F26)',
                '&:hover': {
                  bgcolor: 'var(--accent-secondary, #FF5722)'
                }
              }}
            >
              {isSubmittingDuration ? 'Saving...' : 'Mark Complete'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Sticky Bottom Actions Bar */}
      <DialogActions
        sx={{
          p: { xs: 2, sm: 2.5 },
          px: { xs: 2.5, sm: 3 },
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        {activeDay.isRestDay ? (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                borderRadius: isProf ? 0 : '12px',
                textTransform: 'none',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                borderColor: 'var(--card-border)',
                px: 3,
                py: 0.8
              }}
            >
              Close
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                {isFullyCompleted ? 'Session Complete 🎉' : `${completedCount} of ${totalCount} Exercises Done (${progressPercent}%)`}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block' }}>
                {isFullyCompleted
                  ? 'All exercises completed. Great job on finishing your workout!'
                  : isToday
                  ? 'Mark exercises as complete or finish your session when done.'
                  : 'Viewing scheduled workout details.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleAttemptClose}
                sx={{
                  flex: { xs: 1, sm: 'none' },
                  borderRadius: isProf ? 0 : '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  px: 2.2,
                  py: 0.9,
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--card-border)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  '&:hover': {
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--text-primary)'
                  }
                }}
              >
                {isFullyCompleted ? 'Close' : 'Exit'}
              </Button>

              {isToday && (
                <Button
                  variant="contained"
                  onClick={() => setFinishConfirmOpen(true)}
                  disabled={isSubmittingDuration || isFinishingSession || isFullyCompleted}
                  startIcon={<CheckCircleIcon sx={{ fontSize: '18px !important' }} />}
                  sx={{
                    flex: { xs: 1.5, sm: 'none' },
                    borderRadius: isProf ? 0 : '12px',
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    px: 2.8,
                    py: 0.9,
                    bgcolor: isFullyCompleted ? '#10B981' : 'var(--accent-primary)',
                    color: '#ffffff',
                    boxShadow: isFullyCompleted ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 4px 14px rgba(255, 111, 38, 0.35)',
                    '&:hover': {
                      bgcolor: isFullyCompleted ? '#059669' : 'var(--accent-secondary)'
                    }
                  }}
                >
                  {isFullyCompleted ? 'Completed' : 'Finish Workout'}
                </Button>
              )}
            </Stack>
          </>
        )}
      </DialogActions>

      {/* Exit Confirmation Dialog */}
      <Dialog
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: isProf ? 0 : '18px',
              p: 1,
              bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', pb: 0.5 }}>
          Exit Workout Session?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You have completed <strong>{completedCount} of {totalCount}</strong> exercises. Completed exercises and actual durations are already saved.
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 1, lineHeight: 1.5 }}>
            Do you want to continue working out or exit this session?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setExitConfirmOpen(false);
              onClose();
            }}
            sx={{
              borderRadius: isProf ? 0 : '10px',
              textTransform: 'none',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              borderColor: 'var(--card-border)'
            }}
          >
            Exit Workout
          </Button>
          <Button
            variant="contained"
            onClick={() => setExitConfirmOpen(false)}
            sx={{
              borderRadius: isProf ? 0 : '10px',
              textTransform: 'none',
              fontWeight: 800,
              bgcolor: 'var(--accent-primary)',
              color: '#ffffff',
              '&:hover': { bgcolor: 'var(--accent-secondary)' }
            }}
          >
            Continue Workout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finish Workout Confirmation Dialog */}
      <Dialog
        open={finishConfirmOpen}
        onClose={() => !isFinishingSession && setFinishConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: isProf ? 0 : '18px',
              p: 1,
              bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', pb: 0.5 }}>
          Finish Workout Session?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.5, mb: 1.8 }}>
            {completedCount === totalCount
              ? `You've completed all ${totalCount} exercises! Ready to finish and log this workout?`
              : `You have completed ${completedCount} of ${totalCount} exercises. Ready to finalize and complete this session?`}
          </Typography>

          <Box
            sx={{
              p: 1.8,
              borderRadius: isProf ? 0 : '14px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
              border: '1px solid var(--card-border)'
            }}
          >
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650 }}>
                Workout:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeDay.focusTitle}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650 }}>
                Exercises Completed:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#10B981' }}>
                {completedCount} / {totalCount}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650 }}>
                Duration Logged:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                {activeDay.actualDurationMinutes && activeDay.actualDurationMinutes > 0
                  ? `${activeDay.actualDurationMinutes} mins`
                  : `${activeDay.targetDurationMinutes || 25} mins planned`}
              </Typography>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setFinishConfirmOpen(false)}
            disabled={isFinishingSession}
            sx={{
              borderRadius: isProf ? 0 : '10px',
              textTransform: 'none',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              borderColor: 'var(--card-border)'
            }}
          >
            Keep Working Out
          </Button>
          <Button
            variant="contained"
            onClick={handleFinishSession}
            disabled={isFinishingSession}
            sx={{
              borderRadius: isProf ? 0 : '10px',
              textTransform: 'none',
              fontWeight: 800,
              bgcolor: 'var(--accent-primary)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(255, 111, 38, 0.35)',
              '&:hover': { bgcolor: 'var(--accent-secondary)' }
            }}
          >
            {isFinishingSession ? 'Submitting...' : 'Yes, Finish Workout'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
