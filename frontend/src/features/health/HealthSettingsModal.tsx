import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  TextField,
  Button,
  Box,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import apiClient from '../../api/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { useThemeSystem } from '../../context/ThemeContext';

export interface HealthTargets {
  dailyWaterGoal: number;
  dailySleepGoal: number;
  dailyStepsGoal: number;
  dailyCalorieGoal: number;
  dailyWorkoutGoal: number;
}

interface HealthSettingsModalProps {
  open: boolean;
  onClose: () => void;
  targets: HealthTargets;
  onTargetsUpdated: (newTargets: HealthTargets) => void;
  onOpenWorkoutGenerator?: () => void;
}

export const HealthSettingsModal: React.FC<HealthSettingsModalProps> = ({
  open,
  onClose,
  targets,
  onTargetsUpdated,
  onOpenWorkoutGenerator
}) => {
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [waterGoal, setWaterGoal] = useState<string>('2000');
  const [sleepGoal, setSleepGoal] = useState<string>('8');
  const [stepsGoal, setStepsGoal] = useState<string>('10000');
  const [calorieGoal, setCalorieGoal] = useState<string>('2000');
  const [workoutGoal, setWorkoutGoal] = useState<string>('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targets) {
      setWaterGoal(targets.dailyWaterGoal.toString());
      setSleepGoal(targets.dailySleepGoal.toString());
      setStepsGoal(targets.dailyStepsGoal.toString());
      setCalorieGoal(targets.dailyCalorieGoal.toString());
      setWorkoutGoal(targets.dailyWorkoutGoal.toString());
    }
  }, [targets, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const water = parseInt(waterGoal, 10);
    const sleep = parseFloat(sleepGoal);
    const steps = parseInt(stepsGoal, 10);
    const calories = parseInt(calorieGoal, 10);
    const workout = parseInt(workoutGoal, 10);

    if (isNaN(water) || water < 250 || water > 10000) {
      setError('Daily water goal must be between 250 ml and 10,000 ml.');
      return;
    }
    if (isNaN(sleep) || sleep < 1 || sleep > 24) {
      setError('Daily sleep goal must be between 1 and 24 hours.');
      return;
    }
    if (isNaN(steps) || steps < 500 || steps > 100000) {
      setError('Daily steps goal must be between 500 and 100,000 steps.');
      return;
    }
    if (isNaN(calories) || calories < 500 || calories > 10000) {
      setError('Daily calorie target must be between 500 and 10,000 kcal.');
      return;
    }
    if (isNaN(workout) || workout < 5 || workout > 360) {
      setError('Daily workout goal must be between 5 and 360 minutes.');
      return;
    }

    setSaving(true);
    try {
      const payload: HealthTargets = {
        dailyWaterGoal: water,
        dailySleepGoal: sleep,
        dailyStepsGoal: steps,
        dailyCalorieGoal: calories,
        dailyWorkoutGoal: workout
      };

      const res = await apiClient.put('/api/health/targets', payload);
      if (res.data.isSuccess) {
        notify.success('Health & wellness goals updated successfully!', 'Targets Saved');
        onTargetsUpdated(res.data.data || payload);
        onClose();
      } else {
        setError(res.data.message || 'Failed to update health targets.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save health targets.';
      setError(msg);
      notify.error(msg, 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isProf ? '0px' : '20px',
            bgcolor: 'var(--card-bg)',
            border: isProf
              ? '1px solid var(--card-border)'
              : isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 111, 38, 0.2)',
            boxShadow: isProf ? 'none' : '0 16px 40px rgba(0, 0, 0, 0.25)',
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: isProf ? '0px' : '10px',
              bgcolor: 'rgba(255, 111, 38, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TuneIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Health Goals & Target Settings
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Configure your personal daily targets for hydration, sleep, activity, and nutrition.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: '10px !important' }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: isProf ? '0px' : '10px' }}>
            {error}
          </Alert>
        )}

        <form id="health-targets-form" onSubmit={handleSubmit}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 1.5 }}>
            Daily Health Targets
          </Typography>

          <Stack spacing={2}>
            {/* Water Goal */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
                <LocalDrinkIcon sx={{ fontSize: 20 }} />
              </Box>
              <TextField
                label="Daily Water Goal (ml)"
                type="number"
                fullWidth
                size="small"
                value={waterGoal}
                onChange={(e) => setWaterGoal(e.target.value)}
                helperText="Sensible range: 250 – 10,000 ml (Default: 2000 ml)"
                slotProps={{ htmlInput: { min: 250, max: 10000, step: 50 } }}
              />
            </Stack>

            {/* Sleep Goal */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(156, 39, 176, 0.1)', color: '#9C27B0' }}>
                <BedtimeIcon sx={{ fontSize: 20 }} />
              </Box>
              <TextField
                label="Daily Sleep Goal (hours)"
                type="number"
                fullWidth
                size="small"
                value={sleepGoal}
                onChange={(e) => setSleepGoal(e.target.value)}
                helperText="Sensible range: 1 – 24 hours (Default: 8 hours)"
                slotProps={{ htmlInput: { min: 1, max: 24, step: 0.5 } }}
              />
            </Stack>

            {/* Steps Goal */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
                <DirectionsWalkIcon sx={{ fontSize: 20 }} />
              </Box>
              <TextField
                label="Daily Steps Goal (steps)"
                type="number"
                fullWidth
                size="small"
                value={stepsGoal}
                onChange={(e) => setStepsGoal(e.target.value)}
                helperText="Sensible range: 500 – 100,000 steps (Default: 10,000 steps)"
                slotProps={{ htmlInput: { min: 500, max: 100000, step: 500 } }}
              />
            </Stack>

            {/* Calories Goal */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
                <RestaurantIcon sx={{ fontSize: 20 }} />
              </Box>
              <TextField
                label="Daily Calorie Target (kcal)"
                type="number"
                fullWidth
                size="small"
                value={calorieGoal}
                onChange={(e) => setCalorieGoal(e.target.value)}
                helperText="Sensible range: 500 – 10,000 kcal (Default: 2000 kcal)"
                slotProps={{ htmlInput: { min: 500, max: 10000, step: 50 } }}
              />
            </Stack>

            {/* Workout Goal */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(255, 111, 38, 0.1)', color: 'var(--accent-primary)' }}>
                <FitnessCenterIcon sx={{ fontSize: 20 }} />
              </Box>
              <TextField
                label="Daily Workout Duration Goal (minutes)"
                type="number"
                fullWidth
                size="small"
                value={workoutGoal}
                onChange={(e) => setWorkoutGoal(e.target.value)}
                helperText="Sensible range: 5 – 360 minutes (Default: 30 mins)"
                slotProps={{ htmlInput: { min: 5, max: 360, step: 5 } }}
              />
            </Stack>
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Dynamic Workout Plan Settings Quick Link */}
          <Box
            sx={{
              p: 2,
              borderRadius: isProf ? '0px' : '12px',
              bgcolor: isProf ? 'var(--bg-secondary)' : 'rgba(255, 111, 38, 0.05)',
              border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(255, 111, 38, 0.2)'
            }}
          >
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Dynamic AI Workout Preferences
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Customize workout days/week, fitness goals, experience level, equipment, and focus areas.
                </Typography>
              </Box>
              {onOpenWorkoutGenerator && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    onClose();
                    onOpenWorkoutGenerator();
                  }}
                  sx={{
                    borderRadius: isProf ? '0px' : '8px',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Configure AI Plan
                </Button>
              )}
            </Stack>
          </Box>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="health-targets-form"
          variant="contained"
          disabled={saving}
          sx={{
            borderRadius: isProf ? '0px' : '10px',
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: 'var(--accent-primary)',
            color: '#fff',
            px: 3,
            '&:hover': { bgcolor: 'var(--accent-secondary)' }
          }}
        >
          {saving ? 'Saving...' : 'Save Targets'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
