import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Button,
  Box,
  Grid,
  Slider,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import apiClient from '../../api/apiClient';
import { useThemeSystem } from '../../context/ThemeContext';
import { trackAction } from '../../utils/analytics';

interface PredictAiModalProps {
  open: boolean;
  onClose: () => void;
}

export const PredictAiModal: React.FC<PredictAiModalProps> = ({ open, onClose }) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [fcSleep, setFcSleep] = useState<number>(7);
  const [fcWater, setFcWater] = useState<number>(2000);
  const [fcSteps, setFcSteps] = useState<number>(8000);
  const [fcWorkout, setFcWorkout] = useState<number>(30);
  const [fcTasks, setFcTasks] = useState<number>(2);

  const [forecastResult, setForecastResult] = useState<{
    forecastedLifeScore: number;
    modelAccuracy: string;
    healthRecommendation: string;
  } | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        setForecastError(null);
        const res = await apiClient.post('/api/health/forecast', {
          waterIntake: fcWater,
          sleepHours: fcSleep,
          workoutMinutes: fcWorkout,
          stepsCount: fcSteps,
          pendingTasks: fcTasks
        });
        if (res.data.isSuccess) {
          setForecastResult(res.data.data);
          trackAction('wellness_forecast_generated', { module: 'health', action: 'generate_forecast' });
        } else {
          setForecastError(res.data.message || 'Failed to generate forecast.');
        }
      } catch (err: any) {
        setForecastError(err.response?.data?.message || err.message || 'Failed to generate forecast.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [fcSleep, fcWater, fcWorkout, fcSteps, fcTasks, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isProf ? '0px' : '20px',
            bgcolor: isProf
              ? 'var(--card-bg)'
              : isDark
              ? 'rgba(26, 29, 45, 0.96)'
              : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: isProf ? 'none' : 'blur(16px)',
            border: isProf
              ? '1px solid var(--card-border)'
              : isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 111, 38, 0.2)',
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
              borderRadius: isProf ? 0 : '10px',
              bgcolor: 'rgba(156, 39, 176, 0.12)',
              color: '#9C27B0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Predict AI Wellness Simulation
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Simulate daily habits to forecast Life Score impact and receive science-backed recovery recommendations.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: '10px !important' }}>
        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
          {/* Sliders Column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'var(--text-primary)' }}>
              Habit Calibration Parameters
            </Typography>
            <Stack spacing={2}>
              {/* Sleep */}
              <Box sx={{ p: 1.5, borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(156, 39, 176, 0.04)', border: '1px solid rgba(156, 39, 176, 0.15)' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Planned Sleep</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#9C27B0' }}>{fcSleep} hours</Typography>
                </Stack>
                <Slider
                  value={fcSleep}
                  min={0}
                  max={12}
                  step={0.5}
                  onChange={(_, val) => setFcSleep(val as number)}
                  sx={{ color: '#9C27B0', height: 4 }}
                />
              </Box>

              {/* Water */}
              <Box sx={{ p: 1.5, borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(33, 150, 243, 0.04)', border: '1px solid rgba(33, 150, 243, 0.15)' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Water Intake</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#2196F3' }}>{fcWater} ml</Typography>
                </Stack>
                <Slider
                  value={fcWater}
                  min={0}
                  max={4000}
                  step={100}
                  onChange={(_, val) => setFcWater(val as number)}
                  sx={{ color: '#2196F3', height: 4 }}
                />
              </Box>

              {/* Workout */}
              <Box sx={{ p: 1.5, borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(255, 111, 38, 0.04)', border: '1px solid rgba(255, 111, 38, 0.15)' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Workout Duration</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{fcWorkout} mins</Typography>
                </Stack>
                <Slider
                  value={fcWorkout}
                  min={0}
                  max={120}
                  step={5}
                  onChange={(_, val) => setFcWorkout(val as number)}
                  sx={{ color: 'var(--accent-primary)', height: 4 }}
                />
              </Box>

              {/* Steps */}
              <Box sx={{ p: 1.5, borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(76, 175, 80, 0.04)', border: '1px solid rgba(76, 175, 80, 0.15)' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Target Steps</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#4CAF50' }}>{fcSteps.toLocaleString()} steps</Typography>
                </Stack>
                <Slider
                  value={fcSteps}
                  min={0}
                  max={20000}
                  step={500}
                  onChange={(_, val) => setFcSteps(val as number)}
                  sx={{ color: '#4CAF50', height: 4 }}
                />
              </Box>

              {/* Tasks */}
              <Box sx={{ p: 1.5, borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(255, 152, 0, 0.04)', border: '1px solid rgba(255, 152, 0, 0.15)' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Remaining Tasks Today</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#FF9800' }}>{fcTasks} tasks</Typography>
                </Stack>
                <Slider
                  value={fcTasks}
                  min={0}
                  max={10}
                  step={1}
                  onChange={(_, val) => setFcTasks(val as number)}
                  sx={{ color: '#FF9800', height: 4 }}
                />
              </Box>
            </Stack>
          </Grid>

          {/* Results Column */}
          <Grid size={{ xs: 12, md: 5 }}>
            {forecastResult ? (
              <Box
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.06) 0%, rgba(33, 150, 243, 0.06) 100%)',
                  border: '1.5px solid rgba(156, 39, 176, 0.25)',
                  borderRadius: isProf ? 0 : '16px',
                  boxShadow: isProf ? 'none' : '0 6px 20px rgba(156, 39, 176, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#9C27B0', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                      Predicted Life Score
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Confidence: {forecastResult.modelAccuracy || '94.2%'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: isProf ? 0 : '20px',
                      bgcolor:
                        forecastResult.forecastedLifeScore >= 85
                          ? 'rgba(76, 175, 80, 0.15)'
                          : forecastResult.forecastedLifeScore >= 70
                          ? 'rgba(255, 152, 0, 0.15)'
                          : 'rgba(232, 90, 79, 0.15)',
                      border:
                        forecastResult.forecastedLifeScore >= 85
                          ? '1px solid #4CAF50'
                          : forecastResult.forecastedLifeScore >= 70
                          ? '1px solid #FF9800'
                          : '1px solid #E85A4F',
                      display: 'inline-flex',
                      alignItems: 'baseline'
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 900,
                        color:
                          forecastResult.forecastedLifeScore >= 85
                            ? '#4CAF50'
                            : forecastResult.forecastedLifeScore >= 70
                            ? '#E65100'
                            : '#E85A4F',
                        mr: 0.4
                      }}
                    >
                      {forecastResult.forecastedLifeScore}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      / 100
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ bgcolor: 'var(--card-bg)', p: 2, borderRadius: isProf ? 0 : '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', mb: 0.5 }}>
                    Recommendation:
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.5 }}>
                    {forecastResult.healthRecommendation}
                  </Typography>
                </Box>

                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', textAlign: 'center' }}>
                  ✨ Derived deterministically from habit correlations & LifeScore algorithm
                </Typography>
              </Box>
            ) : forecastError ? (
              <Alert severity="error" sx={{ borderRadius: isProf ? 0 : '10px' }}>
                {forecastError}
              </Alert>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Typography variant="body2">{loading ? 'Calculating simulation...' : 'Calibrate sliders to simulate'}</Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          Close Simulation
        </Button>
      </DialogActions>
    </Dialog>
  );
};
