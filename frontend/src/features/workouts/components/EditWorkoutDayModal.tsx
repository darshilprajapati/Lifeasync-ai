import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Slider,
  Typography,
  Box,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { WorkoutDay, Exercise, WorkoutDayExercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { useNotification } from '../../../context/NotificationContext';
import { useThemeSystem } from '../../../context/ThemeContext';

interface EditWorkoutDayModalProps {
  open: boolean;
  day: WorkoutDay | null;
  onClose: () => void;
  onSaveSuccess: (updatedDay: WorkoutDay) => void;
}

export const EditWorkoutDayModal: React.FC<EditWorkoutDayModalProps> = ({
  open,
  day,
  onClose,
  onSaveSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const [focusTitle, setFocusTitle] = useState('');
  const [isRestDay, setIsRestDay] = useState(false);
  const [targetDuration, setTargetDuration] = useState(30);
  const [restNotes, setRestNotes] = useState('');
  const [exercises, setExercises] = useState<WorkoutDayExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library picker modal state
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [libraryActionType, setLibraryActionType] = useState<'add' | 'replace'>('add');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (day) {
      setFocusTitle(day.focusTitle || '');
      setIsRestDay(day.isRestDay || false);
      setTargetDuration(day.targetDurationMinutes || 30);
      setRestNotes(day.restDayNotes || '');
      setExercises([...(day.exercises || [])]);
      setError(null);
    }
  }, [day, open]);

  if (!day) return null;

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...exercises];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setExercises(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    const newItems = [...exercises];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setExercises(newItems);
  };

  const handleRemove = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleParamChange = (
    index: number,
    field: 'sets' | 'reps' | 'restSeconds',
    value: number
  ) => {
    const newItems = [...exercises];
    newItems[index] = { ...newItems[index], [field]: Math.max(1, value) };
    setExercises(newItems);
  };

  const handleOpenAddPicker = () => {
    setLibraryActionType('add');
    setReplacingIndex(null);
    setLibraryModalOpen(true);
  };

  const handleOpenReplacePicker = (index: number) => {
    setLibraryActionType('replace');
    setReplacingIndex(index);
    setLibraryModalOpen(true);
  };

  const handleSelectExercise = (ex: Exercise) => {
    if (libraryActionType === 'replace' && replacingIndex !== null) {
      const updated = [...exercises];
      const prev = updated[replacingIndex];
      updated[replacingIndex] = {
        ...prev,
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        targetMuscles: ex.targetMuscles,
        requiresEquipment: ex.requiresEquipment,
        equipmentType: ex.equipmentType,
        sets: prev?.sets || ex.defaultSets,
        reps: prev?.reps || ex.defaultReps,
        restSeconds: prev?.restSeconds || ex.defaultRestSeconds,
        instructions: ex.instructions
      };
      setExercises(updated);
    } else {
      const newItem: WorkoutDayExercise = {
        id: 0,
        workoutDayId: day.id,
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        targetMuscles: ex.targetMuscles,
        requiresEquipment: ex.requiresEquipment,
        equipmentType: ex.equipmentType,
        sets: ex.defaultSets || 3,
        reps: ex.defaultReps || 12,
        restSeconds: ex.defaultRestSeconds || 60,
        orderIndex: exercises.length,
        estimatedMetValue: ex.estimatedMetValue || 5.0,
        instructions: ex.instructions
      };
      setExercises([...exercises, newItem]);
    }
    setLibraryModalOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updatedDay = await workoutService.updateDay(day.id, {
        dayOfWeek: day.dayOfWeek,
        focusTitle: focusTitle.trim() || (isRestDay ? 'Rest Day' : 'Workout Session'),
        isRestDay,
        targetDurationMinutes: isRestDay ? 0 : targetDuration,
        restDayNotes: isRestDay ? restNotes.trim() : undefined,
        exercises: isRestDay
          ? []
          : exercises.map((ex, idx) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              orderIndex: idx
            }))
      });

      onSaveSuccess(updatedDay);
      notify.success(`Updated routine for ${focusTitle || 'workout day'}!`, 'Workout Day Saved');
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Failed to update day routine.';
      setError(errMsg);
      notify.error(errMsg, 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{
          paper: {
            sx: isMobile
              ? {
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  m: 0,
                  width: '100%',
                  maxWidth: '100% !important',
                  maxHeight: '92vh',
                  borderRadius: isProf ? '0px !important' : '24px 24px 0 0 !important',
                  bgcolor: isProf
                    ? (isDark ? '#1F2732 !important' : '#ffffff')
                    : (isDark ? '#1A1D2D !important' : '#ffffff'),
                  color: 'var(--text-primary)',
                  border: isProf
                    ? '1px solid var(--card-border)'
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)'),
                  borderBottom: 'none',
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }
              : {
                  borderRadius: isProf ? '0px !important' : '16px',
                  bgcolor: isProf
                    ? (isDark ? '#1F2732 !important' : '#ffffff')
                    : (isDark ? '#1A1D2D !important' : '#ffffff'),
                  color: 'var(--text-primary)',
                  border: isProf
                    ? '1px solid var(--card-border)'
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)'),
                  p: 1
                }
          }
        }}
      >
        {isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.2, pb: 0.2 }}>
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: '2px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.18)'
              }}
            />
          </Box>
        )}

        <DialogTitle
          sx={{
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: { xs: 1.2, sm: 1.8 },
            px: { xs: 2, sm: 3 },
            color: 'var(--text-primary)',
            borderBottom: isMobile ? '1px solid var(--card-border)' : 'none'
          }}
        >
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '17px', sm: '20px' }, lineHeight: 1.2 }}>
              Customize {day.dayName} Routine
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11.5px', fontWeight: 600 }}>
              Adjust focus, workout duration, and exercise parameters
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close editor"
            size="small"
            sx={{
              width: 38,
              height: 38,
              minWidth: 38,
              minHeight: 38,
              color: 'var(--text-secondary)',
              borderRadius: isProf ? '0px' : '10px',
              '&:hover': { color: 'var(--text-primary)', bgcolor: 'rgba(0,0,0,0.06)' }
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: { xs: 2, sm: 3 },
            flex: 1,
            overflowY: 'auto',
            bgcolor: 'inherit'
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Rest Day Switch */}
            <FormControlLabel
              control={
                <Switch
                  checked={isRestDay}
                  onChange={(e) => setIsRestDay(e.target.checked)}
                  color="secondary"
                />
              }
              label={
                <Typography sx={{ fontWeight: 650, fontSize: '14px' }}>
                  Schedule as Rest & Recovery Day
                </Typography>
              }
            />

            {isRestDay ? (
              <TextField
                fullWidth
                size="small"
                label="Rest Day Recommendations / Notes"
                placeholder="e.g. Foam rolling, 20-min casual walk, hydration, posture alignment..."
                value={restNotes}
                onChange={(e) => setRestNotes(e.target.value)}
                multiline
                rows={3}
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="Day Focus / Workout Title"
                  placeholder="e.g. Upper Body Strength, HIIT & Core..."
                  value={focusTitle}
                  onChange={(e) => setFocusTitle(e.target.value)}
                />

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Target Session Duration: {targetDuration} minutes
                  </Typography>
                  <Slider
                    value={targetDuration}
                    onChange={(_, val) => setTargetDuration(val as number)}
                    min={10}
                    max={120}
                    step={5}
                    valueLabelDisplay="auto"
                    sx={{ color: 'var(--accent-primary)', mt: 1 }}
                  />
                </Box>

                {/* Exercises Section Header */}
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 1,
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '14px' }}>
                    Exercises ({exercises.length})
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddPicker}
                    sx={{
                      borderRadius: isProf ? '0px' : '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      minHeight: 36,
                      px: 1.5,
                      '&:hover': {
                        borderColor: 'var(--accent-primary)',
                        bgcolor: 'rgba(255, 111, 38, 0.08)'
                      }
                    }}
                  >
                    Add Exercise from Library
                  </Button>
                </Stack>

                {/* Exercise List */}
                {exercises.length === 0 ? (
                  <Box
                    sx={{
                      p: 3,
                      border: '1px dashed rgba(0,0,0,0.15)',
                      borderRadius: isProf ? '0px' : '12px',
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      No exercises in this workout yet. Click "Add Exercise from Library" to pick exercises.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {exercises.map((ex, index) => (
                      <Box
                        key={ex.id || `${ex.exerciseId}-${index}`}
                        sx={{
                          p: 1.6,
                          borderRadius: isProf ? '0px !important' : '14px',
                          border: '1px solid var(--card-border)',
                          bgcolor: isProf 
                            ? (isDark ? '#26303F' : '#ffffff') 
                            : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'),
                          color: 'var(--text-primary)',
                          boxShadow: isProf ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.2
                        }}
                      >
                        {/* Top row: Name & Target + Actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 800,
                                fontSize: '13.5px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {index + 1}. {ex.exerciseName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                display: 'block',
                                mt: 0.2
                              }}
                            >
                              {ex.category} · {ex.targetMuscles}
                            </Typography>
                          </Box>

                          {/* Actions: Replace, Move, Delete */}
                          <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0 }}>
                            <Tooltip title="Replace with another exercise">
                              <IconButton
                                size="small"
                                aria-label="Replace exercise"
                                onClick={() => handleOpenReplacePicker(index)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  minWidth: 32,
                                  minHeight: 32,
                                  color: 'var(--accent-primary)',
                                  bgcolor: 'rgba(255, 115, 56, 0.08)',
                                  borderRadius: '8px'
                                }}
                              >
                                <SwapHorizIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Move Up">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index === 0}
                                  aria-label="Move exercise up"
                                  onClick={() => handleMoveUp(index)}
                                  sx={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '8px' }}
                                >
                                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move Down">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index === exercises.length - 1}
                                  aria-label="Move exercise down"
                                  onClick={() => handleMoveDown(index)}
                                  sx={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '8px' }}
                                >
                                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remove Exercise">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label="Remove exercise"
                                onClick={() => handleRemove(index)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  minWidth: 32,
                                  minHeight: 32,
                                  borderRadius: '8px',
                                  bgcolor: 'rgba(239, 68, 68, 0.08)'
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        {/* Bottom row: Sets, Reps, Rest inputs */}
                        <Stack
                          direction="row"
                          spacing={1.2}
                          sx={{
                            width: '100%',
                            pt: 0.4
                          }}
                        >
                          <TextField
                            size="small"
                            label="Sets"
                            type="number"
                            value={ex.sets}
                            onChange={(e) => handleParamChange(index, 'sets', parseInt(e.target.value) || 1)}
                            sx={{ flex: 1, minWidth: 0 }}
                            slotProps={{
                              htmlInput: {
                                min: 1,
                                max: 20
                              }
                            }}
                          />
                          <TextField
                            size="small"
                            label="Reps"
                            type="number"
                            value={ex.reps}
                            onChange={(e) => handleParamChange(index, 'reps', parseInt(e.target.value) || 1)}
                            sx={{ flex: 1, minWidth: 0 }}
                            slotProps={{
                              htmlInput: {
                                min: 1,
                                max: 100
                              }
                            }}
                          />
                          <TextField
                            size="small"
                            label="Rest (s)"
                            type="number"
                            value={ex.restSeconds}
                            onChange={(e) => handleParamChange(index, 'restSeconds', parseInt(e.target.value) || 15)}
                            sx={{ flex: 1.2, minWidth: 0 }}
                            slotProps={{
                              htmlInput: {
                                min: 5,
                                max: 300,
                                step: 5
                              }
                            }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            p: { xs: 1.5, sm: 2 },
            px: { xs: 2, sm: 3 },
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            bgcolor: isProf
              ? (isDark ? '#1F2732' : '#ffffff')
              : (isDark ? '#1A1D2D' : '#ffffff'),
            borderTop: '1px solid var(--card-border)',
            pb: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : undefined,
            gap: 1
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              textTransform: 'none',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              minHeight: 44,
              flex: isMobile ? 1 : 'none',
              borderRadius: isProf ? '0px !important' : '10px'
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '14px',
              minHeight: 44,
              flex: isMobile ? 2 : 'none',
              borderRadius: isProf ? '0px !important' : '10px',
              bgcolor: 'var(--accent-primary)',
              boxShadow: '0 4px 14px rgba(255, 111, 38, 0.35)',
              '&:hover': { bgcolor: 'var(--accent-hover, #FF5722)' }
            }}
          >
            {saving ? 'Saving Routine...' : 'Save Routine'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Focused Exercise Library Modal for Add / Replace */}
      <ExerciseLibraryModal
        open={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onSelectExercise={handleSelectExercise}
        actionType={libraryActionType}
        replacingExerciseName={
          replacingIndex !== null && exercises[replacingIndex]
            ? exercises[replacingIndex].exerciseName
            : undefined
        }
      />
    </>
  );
};
