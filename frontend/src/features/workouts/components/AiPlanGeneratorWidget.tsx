import React, { useState } from 'react';
import {
  Typography,
  Box,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PieChartIcon from '@mui/icons-material/PieChart';
import { workoutService } from '../services/workoutService';
import type { UserWorkoutPlan, WorkoutDay, Exercise } from '../types/workout';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { trackAction } from '../../../utils/analytics';

const GOALS = ['Stay Fit', 'Build Muscle', 'Fat Loss', 'Endurance'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const FOCUS_AREAS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio'];
const EQUIPMENT_OPTIONS = [
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Band',
  'Pull Up Bar',
  'Bench',
  'Yoga Mat'
];

interface AiPlanGeneratorWidgetProps {
  onPlanApplied: (newPlan: UserWorkoutPlan) => void;
  onClose?: () => void;
}

export const AiPlanGeneratorWidget: React.FC<AiPlanGeneratorWidgetProps> = ({
  onPlanApplied,
  onClose
}) => {
  // Step 1: Config states
  const [goal, setGoal] = useState<string>('Stay Fit');
  const [level, setLevel] = useState<string>('Beginner');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [duration, setDuration] = useState<number>(30);
  const [workoutMode, setWorkoutMode] = useState<'Without Equipment' | 'With Equipment' | 'Hybrid'>('Without Equipment');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Dumbbells']);
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['All']);

  // Step 2: Review / Customization states
  const [viewStep, setViewStep] = useState<'config' | 'review'>('config');
  const [editableDays, setEditableDays] = useState<WorkoutDay[]>([]);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [splitDescription, setSplitDescription] = useState<string>('');
  const [aiReasoning, setAiReasoning] = useState<string>('');

  // Exercise library modal state
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null);
  const [replacingExerciseIndex, setReplacingExerciseIndex] = useState<number | null>(null);
  const [libraryActionType, setLibraryActionType] = useState<'add' | 'replace'>('add');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEquipmentToggle = (item: string) => {
    setAvailableEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleFocusToggle = (area: string) => {
    if (area === 'All') {
      setSelectedFocus(['All']);
      return;
    }

    let updated = selectedFocus.filter((f) => f !== 'All');
    if (updated.includes(area)) {
      updated = updated.filter((f) => f !== area);
      if (updated.length === 0) updated = ['All'];
    } else {
      updated.push(area);
    }
    setSelectedFocus(updated);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workoutService.generateAiPlan({
        goal,
        fitnessLevel: level,
        daysPerWeek,
        preferredDurationMinutes: duration,
        workoutMode,
        hasEquipment: workoutMode !== 'Without Equipment',
        availableEquipment: workoutMode !== 'Without Equipment' ? availableEquipment : [],
        focusAreas: selectedFocus
      });

      setPlanTitle(response.title);
      setSplitDescription(response.splitDescription);
      setAiReasoning(response.aiReasoning);
      setEditableDays(response.suggestedDays || []);
      setViewStep('review');

      trackAction('ai_workout_generated', {
        module: 'workout',
        goal,
        days: daysPerWeek,
        duration,
        mode: workoutMode
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate AI workout plan.');
    } finally {
      setLoading(false);
    }
  };

  // Exercise customization handlers inside Review mode
  const handleOpenAddExercise = (dayIdx: number) => {
    setTargetDayIndex(dayIdx);
    setReplacingExerciseIndex(null);
    setLibraryActionType('add');
    setLibraryOpen(true);
  };

  const handleOpenReplaceExercise = (dayIdx: number, exIdx: number) => {
    setTargetDayIndex(dayIdx);
    setReplacingExerciseIndex(exIdx);
    setLibraryActionType('replace');
    setLibraryOpen(true);
  };

  const handleSelectExercise = (ex: Exercise) => {
    if (targetDayIndex === null) return;

    const daysCopy = [...editableDays];
    const targetDay = { ...daysCopy[targetDayIndex] };
    const exercisesCopy = [...(targetDay.exercises || [])];

    if (libraryActionType === 'replace' && replacingExerciseIndex !== null) {
      const prev = exercisesCopy[replacingExerciseIndex];
      exercisesCopy[replacingExerciseIndex] = {
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
    } else {
      exercisesCopy.push({
        id: 0,
        workoutDayId: targetDay.id,
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        targetMuscles: ex.targetMuscles,
        requiresEquipment: ex.requiresEquipment,
        equipmentType: ex.equipmentType,
        sets: ex.defaultSets || 3,
        reps: ex.defaultReps || 12,
        restSeconds: ex.defaultRestSeconds || 60,
        orderIndex: exercisesCopy.length,
        estimatedMetValue: ex.estimatedMetValue || 5.0,
        instructions: ex.instructions
      });
    }

    targetDay.exercises = exercisesCopy;

    // Recalculate duration
    const estDuration = Math.max(
      1,
      Math.round(exercisesCopy.reduce((sum, e) => sum + (e.sets * (e.reps * 3 + e.restSeconds) + 30) / 60, 0))
    );
    targetDay.targetDurationMinutes = estDuration;

    daysCopy[targetDayIndex] = targetDay;
    setEditableDays(daysCopy);
    setLibraryOpen(false);
  };

  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    const daysCopy = [...editableDays];
    const targetDay = { ...daysCopy[dayIdx] };
    targetDay.exercises = targetDay.exercises.filter((_, i) => i !== exIdx);

    const estDuration = Math.max(
      1,
      Math.round(targetDay.exercises.reduce((sum, e) => sum + (e.sets * (e.reps * 3 + e.restSeconds) + 30) / 60, 0))
    );
    targetDay.targetDurationMinutes = targetDay.exercises.length > 0 ? estDuration : 0;

    daysCopy[dayIdx] = targetDay;
    setEditableDays(daysCopy);
  };

  const handleParamChange = (
    dayIdx: number,
    exIdx: number,
    field: 'sets' | 'reps' | 'restSeconds',
    val: number
  ) => {
    const daysCopy = [...editableDays];
    const targetDay = { ...daysCopy[dayIdx] };
    const exercisesCopy = [...targetDay.exercises];
    exercisesCopy[exIdx] = { ...exercisesCopy[exIdx], [field]: Math.max(1, val) };
    targetDay.exercises = exercisesCopy;

    const estDuration = Math.max(
      1,
      Math.round(exercisesCopy.reduce((sum, e) => sum + (e.sets * (e.reps * 3 + e.restSeconds) + 30) / 60, 0))
    );
    targetDay.targetDurationMinutes = estDuration;

    daysCopy[dayIdx] = targetDay;
    setEditableDays(daysCopy);
  };

  const handleSaveFinalizedPlan = async () => {
    setSaving(true);
    setError(null);
    try {
      const createdPlan = await workoutService.createOrUpdatePlan({
        title: planTitle,
        goal,
        fitnessLevel: level,
        daysPerWeek,
        days: editableDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          focusTitle: d.focusTitle,
          isRestDay: d.isRestDay,
          targetDurationMinutes: d.targetDurationMinutes,
          restDayNotes: d.restDayNotes,
          exercises: (d.exercises || []).map((ex, idx) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            orderIndex: idx
          }))
        }))
      });

      onPlanApplied(createdPlan);
      trackAction('ai_workout_finalized_and_saved', {
        module: 'workout',
        plan_title: planTitle,
        days_count: daysPerWeek
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save customized workout plan.');
    } finally {
      setSaving(false);
    }
  };

  // Compute updated muscle balance for review
  const getMuscleDistribution = () => {
    const counts: Record<string, number> = {};
    editableDays
      .filter((d) => !d.isRestDay)
      .flatMap((d) => d.exercises || [])
      .forEach((ex) => {
        const cat = ex.category || 'Other';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    return counts;
  };

  const muscleCounts = getMuscleDistribution();
  const totalExercises = Object.values(muscleCounts).reduce((a, b) => a + b, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {/* ==================== STEP 1: CONFIGURATION FORM ==================== */}
      {viewStep === 'config' && (
        <Stack spacing={2.5}>
          {/* Goal & Level */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Primary Goal</InputLabel>
              <Select value={goal} label="Primary Goal" onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Fitness Level</InputLabel>
              <Select value={level} label="Fitness Level" onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Training Days: 1 to 7 */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                Training Frequency: {daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'} / week
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                {7 - daysPerWeek} recovery {7 - daysPerWeek === 1 ? 'day' : 'days'}
              </Typography>
            </Stack>
            <Slider
              value={daysPerWeek}
              onChange={(_, val) => setDaysPerWeek(val as number)}
              min={1}
              max={7}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ color: 'var(--accent-primary)' }}
            />
          </Box>

          {/* Workout Duration: 1 to 120 minutes */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                Target Session Duration: {duration} minutes
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                Volume will automatically calibrate
              </Typography>
            </Stack>
            <Slider
              value={duration}
              onChange={(_, val) => setDuration(val as number)}
              min={1}
              max={120}
              step={5}
              valueLabelDisplay="auto"
              sx={{ color: 'var(--accent-primary)' }}
            />
          </Box>

          {/* Equipment Mode: Without Equipment, With Equipment, Hybrid */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'block', mb: 1 }}>
              Equipment & Workout Mode
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={workoutMode}
              onChange={(_, val) => val && setWorkoutMode(val)}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  py: 1
                }
              }}
            >
              <ToggleButton value="Without Equipment">Without Equipment (Bodyweight)</ToggleButton>
              <ToggleButton value="With Equipment">With Equipment</ToggleButton>
              <ToggleButton value="Hybrid">Hybrid Mode</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Available Equipment picker if not bodyweight-only */}
          {workoutMode !== 'Without Equipment' && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'block', mb: 1 }}>
                Select Available Equipment
              </Typography>
              <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                {EQUIPMENT_OPTIONS.map((item) => {
                  const selected = availableEquipment.includes(item);
                  return (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      clickable
                      onClick={() => handleEquipmentToggle(item)}
                      color={selected ? 'primary' : 'default'}
                      variant={selected ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Target Focus Areas */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'block', mb: 1 }}>
              Target Focus Areas
            </Typography>
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
              {FOCUS_AREAS.map((area) => {
                const selected = selectedFocus.includes(area);
                return (
                  <Chip
                    key={area}
                    label={area}
                    size="small"
                    clickable
                    onClick={() => handleFocusToggle(area)}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600 }}
                  />
                );
              })}
            </Stack>
          </Box>

          {/* Actions: Cancel & Generate */}
          <Stack direction="row" spacing={1.5}>
            {onClose && (
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  py: 1.2,
                  px: 3,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  borderColor: 'rgba(0,0,0,0.15)'
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              fullWidth
              onClick={handleGenerate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                py: 1.2,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '14px',
                bgcolor: 'var(--accent-primary)',
                '&:hover': { bgcolor: 'var(--accent-hover, #4f46e5)' }
              }}
            >
              {loading ? 'Analyzing kinesiology & generating...' : 'Generate AI Workout Plan'}
            </Button>
          </Stack>
        </Stack>
      )}

      {/* ==================== STEP 2: REVIEW & CUSTOMIZE VIEW ==================== */}
      {viewStep === 'review' && (
        <Stack spacing={2.5}>
          {/* Top Bar: Back & Title */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setViewStep('config')}
              sx={{ textTransform: 'none', color: 'var(--text-secondary)', fontWeight: 600 }}
            >
              Reconfigure
            </Button>

            <Chip
              label={`${daysPerWeek} Training Days · ${duration} Mins`}
              size="small"
              sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}
            />
          </Stack>

          {/* Plan Header Info */}
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {planTitle}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', mt: 0.3 }}>
              {splitDescription}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '12px', mt: 0.8 }}>
              {aiReasoning}
            </Typography>
          </Box>

          {/* Target Muscle Distribution Summary */}
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'var(--bg-card, #ffffff)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <PieChartIcon sx={{ fontSize: 18, color: 'var(--accent-primary)' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Planned Muscle Distribution ({totalExercises} total movements)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.6 }}>
              {Object.entries(muscleCounts).map(([cat, count]) => {
                const pct = totalExercises > 0 ? Math.round((count / totalExercises) * 100) : 0;
                return (
                  <Chip
                    key={cat}
                    label={`${cat}: ${pct}% (${count})`}
                    size="small"
                    sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
                  />
                );
              })}
            </Stack>
          </Box>

          {/* 7-Day Accordion Customizer */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Weekly Schedule & Exercise Customization
          </Typography>

          <Stack spacing={1.5}>
            {editableDays.map((day, dayIdx) => (
              <Accordion
                key={day.dayOfWeek}
                defaultExpanded={!day.isRestDay}
                sx={{
                  borderRadius: '12px !important',
                  border: day.isRestDay ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(0,0,0,0.08)',
                  boxShadow: 'none',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%', pr: 2 }}>
                    <Chip
                      label={day.dayName}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '11px',
                        bgcolor: day.isRestDay ? 'rgba(139, 92, 246, 0.1)' : 'var(--accent-primary)',
                        color: day.isRestDay ? '#8b5cf6' : '#ffffff'
                      }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                      {day.focusTitle}
                    </Typography>
                    {!day.isRestDay ? (
                      <Chip
                        icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                        label={`${day.targetDurationMinutes} min`}
                        size="small"
                        sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                        Rest Day
                      </Typography>
                    )}
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                  <Divider sx={{ mb: 2 }} />

                  {day.isRestDay ? (
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {day.restDayNotes || 'Active rest, hydration, and joint mobility.'}
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {day.exercises.map((ex, exIdx) => (
                        <Box
                          key={ex.id || `${ex.exerciseId}-${exIdx}`}
                          sx={{
                            p: 1.5,
                            borderRadius: '10px',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: 1.5
                          }}
                        >
                          <Box sx={{ minWidth: 160 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '13px' }}>
                              {exIdx + 1}. {ex.exerciseName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {ex.category} · {ex.requiresEquipment ? ex.equipmentType : 'Bodyweight'}
                            </Typography>
                          </Box>

                          {/* Sets, Reps, Rest */}
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <TextField
                              size="small"
                              label="Sets"
                              type="number"
                              value={ex.sets}
                              onChange={(e) => handleParamChange(dayIdx, exIdx, 'sets', parseInt(e.target.value) || 1)}
                              sx={{ width: 65 }}
                            />
                            <TextField
                              size="small"
                              label="Reps"
                              type="number"
                              value={ex.reps}
                              onChange={(e) => handleParamChange(dayIdx, exIdx, 'reps', parseInt(e.target.value) || 1)}
                              sx={{ width: 70 }}
                            />
                            <TextField
                              size="small"
                              label="Rest(s)"
                              type="number"
                              value={ex.restSeconds}
                              onChange={(e) => handleParamChange(dayIdx, exIdx, 'restSeconds', parseInt(e.target.value) || 15)}
                              sx={{ width: 75 }}
                            />
                          </Stack>

                          {/* Actions: Replace & Delete */}
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Replace with another exercise">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenReplaceExercise(dayIdx, exIdx)}
                                sx={{ color: 'var(--accent-primary)', p: 0.5 }}
                              >
                                <SwapHorizIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveExercise(dayIdx, exIdx)}
                              sx={{ p: 0.5 }}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Stack>
                        </Box>
                      ))}

                      {/* Add Exercise to Day */}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAddExercise(dayIdx)}
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '12px',
                          mt: 1,
                          alignSelf: 'flex-start'
                        }}
                      >
                        Add Exercise to {day.dayName}
                      </Button>
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>

          {/* Finalize & Save Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSaveFinalizedPlan}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            sx={{
              py: 1.4,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '15px',
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' }
            }}
          >
            {saving ? 'Saving finalized routine...' : 'Confirm & Save Weekly Routine'}
          </Button>
        </Stack>
      )}

      {/* Focused Exercise Library Modal for Add & Replace */}
      <ExerciseLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectExercise={handleSelectExercise}
        actionType={libraryActionType}
        replacingExerciseName={
          targetDayIndex !== null &&
          replacingExerciseIndex !== null &&
          editableDays[targetDayIndex]?.exercises?.[replacingExerciseIndex]?.exerciseName
            ? editableDays[targetDayIndex].exercises[replacingExerciseIndex].exerciseName
            : undefined
        }
      />
    </Box>
  );
};
