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
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import type { WorkoutDay, Exercise, WorkoutDayExercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { useNotification } from '../../../context/NotificationContext';

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
  const { notify } = useNotification();
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
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Customize {day.dayName} Routine
        </DialogTitle>

        <DialogContent dividers>
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
                <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>
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
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Exercises ({exercises.length})
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddPicker}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)'
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
                      borderRadius: '12px',
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
                          p: 1.5,
                          borderRadius: '12px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          bgcolor: 'var(--bg-card, #ffffff)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 1.5
                        }}
                      >
                        {/* Name & Target */}
                        <Box sx={{ minWidth: 160 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '13px' }}>
                            {index + 1}. {ex.exerciseName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            {ex.category} · {ex.targetMuscles}
                          </Typography>
                        </Box>

                        {/* Sets, Reps, Rest inputs */}
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <TextField
                            size="small"
                            label="Sets"
                            type="number"
                            value={ex.sets}
                            onChange={(e) => handleParamChange(index, 'sets', parseInt(e.target.value) || 1)}
                            sx={{ width: 70 }}
                          />
                          <TextField
                            size="small"
                            label="Reps"
                            type="number"
                            value={ex.reps}
                            onChange={(e) => handleParamChange(index, 'reps', parseInt(e.target.value) || 1)}
                            sx={{ width: 75 }}
                          />
                          <TextField
                            size="small"
                            label="Rest (s)"
                            type="number"
                            value={ex.restSeconds}
                            onChange={(e) => handleParamChange(index, 'restSeconds', parseInt(e.target.value) || 15)}
                            sx={{ width: 85 }}
                          />
                        </Stack>

                        {/* Actions: Replace, Move, Delete */}
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Tooltip title="Replace with another exercise">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenReplacePicker(index)}
                              sx={{ p: 0.5, color: 'var(--accent-primary)' }}
                            >
                              <SwapHorizIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            disabled={index === 0}
                            onClick={() => handleMoveUp(index)}
                            sx={{ p: 0.5 }}
                          >
                            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={index === exercises.length - 1}
                            onClick={() => handleMoveDown(index)}
                            sx={{ p: 0.5 }}
                          >
                            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(index)}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving && <CircularProgress size={16} color="inherit" />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              bgcolor: 'var(--accent-primary)',
              '&:hover': { bgcolor: 'var(--accent-hover, #4f46e5)' }
            }}
          >
            {saving ? 'Saving...' : 'Save Routine'}
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
