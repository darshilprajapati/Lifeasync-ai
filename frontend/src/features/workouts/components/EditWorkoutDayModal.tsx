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
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import type { WorkoutDay, Exercise, WorkoutDayExercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseLibrarySection } from './ExerciseLibrarySection';

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
  const [focusTitle, setFocusTitle] = useState('');
  const [isRestDay, setIsRestDay] = useState(false);
  const [targetDuration, setTargetDuration] = useState(30);
  const [restNotes, setRestNotes] = useState('');
  const [exercises, setExercises] = useState<WorkoutDayExercise[]>([]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (day) {
      setFocusTitle(day.focusTitle || '');
      setIsRestDay(day.isRestDay || false);
      setTargetDuration(day.targetDurationMinutes || 30);
      setRestNotes(day.restDayNotes || '');
      setExercises([...(day.exercises || [])]);
      setShowAddPicker(false);
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

  const handleAddExerciseFromPicker = (ex: Exercise) => {
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
    setShowAddPicker(false);
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
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update day routine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {isRestDay ? 'Scheduled Rest & Recovery Day' : 'Active Training Day'}
              </Typography>
            }
          />

          {/* Focus Title */}
          <TextField
            fullWidth
            size="small"
            label="Focus Title"
            value={focusTitle}
            onChange={(e) => setFocusTitle(e.target.value)}
            placeholder={isRestDay ? 'e.g. Active Recovery & Mobility' : 'e.g. Chest & Triceps Hypertrophy'}
          />

          {isRestDay ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              label="Rest Day Recommendations / Notes"
              value={restNotes}
              onChange={(e) => setRestNotes(e.target.value)}
              placeholder="e.g. Foam rolling, 3 liters of water, 8+ hours of sleep"
            />
          ) : (
            <>
              {/* Target Duration Slider */}
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Target Session Duration
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {targetDuration} Minutes
                  </Typography>
                </Stack>
                <Slider
                  value={targetDuration}
                  min={15}
                  max={90}
                  step={5}
                  onChange={(_, val) => setTargetDuration(val as number)}
                  sx={{ color: 'var(--accent-primary)' }}
                />
              </Box>

              <Divider />

              {/* Exercises Management Header */}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Exercises in this Session ({exercises.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowAddPicker(!showAddPicker)}
                  startIcon={<AddIcon />}
                  sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '12px' }}
                >
                  {showAddPicker ? 'Close Library' : '+ Add Exercise'}
                </Button>
              </Stack>

              {/* Exercise Library Sub-picker */}
              {showAddPicker && (
                <Box sx={{ p: 2, bgcolor: 'rgba(99, 102, 241, 0.03)', borderRadius: '12px', border: '1px dashed var(--accent-primary)' }}>
                  <ExerciseLibrarySection
                    onSelectExercise={handleAddExerciseFromPicker}
                    actionLabel="Add to this Day"
                  />
                </Box>
              )}

              {/* Exercises List */}
              {exercises.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic', py: 2 }}>
                  No exercises in this session. Click "+ Add Exercise" to add from the library.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {exercises.map((ex, index) => (
                    <Box
                      key={`${ex.exerciseId}-${index}`}
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

                      {/* Reorder and Delete Actions */}
                      <Stack direction="row" spacing={0.5}>
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
  );
};
