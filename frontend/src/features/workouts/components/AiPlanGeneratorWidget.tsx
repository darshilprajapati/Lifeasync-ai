import React, { useState } from 'react';
import {
  Card,
  CardContent,
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
  Divider
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { workoutService } from '../services/workoutService';
import type { AiWorkoutPlanResponse, UserWorkoutPlan } from '../types/workout';

const GOALS = ['Stay Fit', 'Build Muscle', 'Fat Loss', 'Endurance'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const FOCUS_AREAS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
const EQUIPMENT_OPTIONS = [
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Bands',
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
  const [goal, setGoal] = useState<string>('Stay Fit');
  const [level, setLevel] = useState<string>('Beginner');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [duration, setDuration] = useState<number>(30);
  const [equipmentMode, setEquipmentMode] = useState<'without' | 'with'>('without');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Dumbbells']);
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['Chest', 'Core']);

  const [loading, setLoading] = useState<boolean>(false);
  const [aiPreview, setAiPreview] = useState<AiWorkoutPlanResponse | null>(null);
  const [applying, setApplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEquipmentToggle = (item: string) => {
    setAvailableEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleFocusToggle = (area: string) => {
    setSelectedFocus((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setAiPreview(null);
    try {
      const response = await workoutService.generateAiPlan({
        goal,
        fitnessLevel: level,
        daysPerWeek,
        preferredDurationMinutes: duration,
        hasEquipment: equipmentMode === 'with',
        availableEquipment: equipmentMode === 'with' ? availableEquipment : [],
        focusAreas: selectedFocus
      });
      setAiPreview(response);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate AI workout plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!aiPreview) return;
    setApplying(true);
    setError(null);
    try {
      const createdPlan = await workoutService.createOrUpdatePlan({
        title: aiPreview.title,
        goal: aiPreview.goal,
        fitnessLevel: aiPreview.fitnessLevel,
        daysPerWeek: aiPreview.daysPerWeek,
        days: aiPreview.suggestedDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          focusTitle: d.focusTitle,
          isRestDay: d.isRestDay,
          targetDurationMinutes: d.targetDurationMinutes,
          restDayNotes: d.restDayNotes,
          exercises: d.exercises.map((ex, idx) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            orderIndex: idx
          }))
        }))
      });

      onPlanApplied(createdPlan);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to apply workout plan.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: '16px',
        bgcolor: 'var(--bg-card, #ffffff)',
        boxShadow: 'var(--shadow-soft, 0 4px 16px rgba(0,0,0,0.06))',
        border: '1px solid rgba(0,0,0,0.08)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <AutoAwesomeIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            AI Workout Plan Generator
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 3 }}>
          Dual-tier periodization engine crafts customized weekly splits based on muscle recovery windows and kinesiology rules.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Goal & Level Row */}
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

          {/* Days Per Week Slider */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Training Days per Week
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {daysPerWeek} Days
              </Typography>
            </Stack>
            <Slider
              value={daysPerWeek}
              min={3}
              max={6}
              step={1}
              marks
              onChange={(_, val) => setDaysPerWeek(val as number)}
              sx={{ color: 'var(--accent-primary)' }}
            />
          </Box>

          {/* Target Duration Slider */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Preferred Duration per Session
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {duration} Minutes
              </Typography>
            </Stack>
            <Slider
              value={duration}
              min={20}
              max={75}
              step={5}
              onChange={(_, val) => setDuration(val as number)}
              sx={{ color: 'var(--accent-primary)' }}
            />
          </Box>

          {/* Equipment Mode Switcher */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', mb: 1 }}>
              Equipment Mode
            </Typography>
            <ToggleButtonGroup
              fullWidth
              value={equipmentMode}
              exclusive
              onChange={(_, val) => val && setEquipmentMode(val)}
              size="small"
            >
              <ToggleButton
                value="without"
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  gap: 0.8,
                  '&.Mui-selected': { bgcolor: 'rgba(16, 185, 129, 0.15) !important', color: '#059669 !important' }
                }}
              >
                <SelfImprovementIcon sx={{ fontSize: 16 }} />
                Without Equipment (Bodyweight)
              </ToggleButton>
              <ToggleButton
                value="with"
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  gap: 0.8,
                  '&.Mui-selected': { bgcolor: 'rgba(99, 102, 241, 0.15) !important', color: 'var(--accent-primary) !important' }
                }}
              >
                <FitnessCenterIcon sx={{ fontSize: 16 }} />
                With Equipment
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Available Equipment Chips */}
          {equipmentMode === 'with' && (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.04)', borderRadius: '10px' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', mb: 1 }}>
                Select Available Equipment:
              </Typography>
              <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                {EQUIPMENT_OPTIONS.map((item) => {
                  const sel = availableEquipment.includes(item);
                  return (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      onClick={() => handleEquipmentToggle(item)}
                      color={sel ? 'primary' : 'default'}
                      variant={sel ? 'filled' : 'outlined'}
                      sx={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Focus Areas Chips */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', mb: 1 }}>
              Target Focus Areas
            </Typography>
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
              {FOCUS_AREAS.map((area) => {
                const sel = selectedFocus.includes(area);
                return (
                  <Chip
                    key={area}
                    label={area}
                    size="small"
                    onClick={() => handleFocusToggle(area)}
                    color={sel ? 'primary' : 'default'}
                    variant={sel ? 'filled' : 'outlined'}
                    sx={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  />
                );
              })}
            </Stack>
          </Box>

          {/* Generate Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{
              py: 1.2,
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'var(--accent-primary)',
              '&:hover': { bgcolor: 'var(--accent-hover, #4f46e5)' }
            }}
          >
            {loading ? 'Synthesizing Periodized Routine...' : 'Generate AI Workout Plan'}
          </Button>

          {/* Generated Plan Preview & Apply Section */}
          {aiPreview && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: '12px',
                bgcolor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {aiPreview.splitDescription}
                </Typography>
                <Chip
                  label={aiPreview.source === 'Deterministic' ? 'Deterministic Kinesiology Engine' : 'AI Model'}
                  size="small"
                  sx={{
                    fontSize: '10px',
                    fontWeight: 700,
                    bgcolor: aiPreview.source === 'Deterministic' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: aiPreview.source === 'Deterministic' ? 'var(--accent-primary)' : '#059669',
                    height: 22
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
                {aiPreview.aiReasoning}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {/* Day breakdown list */}
              <Stack spacing={1} sx={{ mb: 2.5 }}>
                {aiPreview.suggestedDays.map((d) => (
                  <Stack key={d.dayOfWeek} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.dayName}: {d.focusTitle}
                    </Typography>
                    <Typography variant="caption" sx={{ color: d.isRestDay ? '#8B5CF6' : 'var(--text-secondary)' }}>
                      {d.isRestDay ? 'Rest Day' : `${d.exercises.length} exercises · ${d.targetDurationMinutes}m`}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Button
                fullWidth
                variant="contained"
                onClick={handleApplyPlan}
                disabled={applying}
                startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{
                  bgcolor: '#10b981',
                  borderRadius: '10px',
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                {applying ? 'Applying Routine...' : 'Apply to My Weekly Routine'}
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
