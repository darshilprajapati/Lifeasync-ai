import React, { useState, useEffect, useCallback } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import { TiltCard } from '../components/modern3d/TiltCard';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { 
  Box as MuiBox, 
  Typography as MuiTypography, 
  Button as MuiButton, 
  IconButton as MuiIconButton, 
  Grid as MuiGrid, 
  Alert as MuiAlert, 
  Stack as MuiStack, 
  LinearProgress as MuiLinearProgress,
  TextField as MuiTextField,
  FormControl as MuiFormControl,
  InputLabel as MuiInputLabel,
  Select as MuiSelect,
  MenuItem as MuiMenuItem,
  Slider as MuiSlider,
  ToggleButton as MuiToggleButton,
  ToggleButtonGroup as MuiToggleButtonGroup,
  Tooltip as MuiTooltip
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { useThemeSystem } from '../context/ThemeContext';
import { WorkoutPlannerDashboard } from '../features/workouts/WorkoutPlannerDashboard';
import { HealthSettingsModal, type HealthTargets } from '../features/health/HealthSettingsModal';
import { HealthActivityHistoryModal, type HealthLogItem } from '../features/health/HealthActivityHistoryModal';

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const rawDate = new Date(dateStr);
      if (!isNaN(rawDate.getTime())) {
        return new Date(y, m, d, rawDate.getHours(), rawDate.getMinutes(), rawDate.getSeconds());
      }
      return new Date(y, m, d);
    }
  }
  return new Date(dateStr);
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const DEFAULT_TARGETS: HealthTargets = {
  dailyWaterGoal: 2000,
  dailySleepGoal: 8,
  dailyStepsGoal: 10000,
  dailyCalorieGoal: 2000,
  dailyWorkoutGoal: 30
};

const Health: React.FC = () => {
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [logs, setLogs] = useState<HealthLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'workouts' | 'metrics'>('workouts');

  // Configurable targets state
  const [targets, setTargets] = useState<HealthTargets>(DEFAULT_TARGETS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Today's Totals
  const [todaysWater, setTodaysWater] = useState(0);
  const [todaysSleep, setTodaysSleep] = useState(0);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [todaysCalories, setTodaysCalories] = useState(0);
  const [todaysWorkout, setTodaysWorkout] = useState(0);

  // Form Fields
  const [logType, setLogType] = useState<'Water' | 'Sleep' | 'Steps' | 'Calories' | 'Workout'>('Water');
  const [logValue, setLogValue] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Forecast Fields
  const [activeTab, setActiveTab] = useState<'log' | 'forecast'>('log');
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

  const showTemporaryError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      setError((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const fetchTargets = async () => {
    try {
      const res = await apiClient.get('/api/health/targets');
      if (res.data.isSuccess && res.data.data) {
        setTargets(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load configurable targets:', err);
    }
  };

  const fetchHealthLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/health');
      if (res.data.isSuccess) {
        const allLogs = res.data.data as HealthLogItem[];
        setLogs(allLogs);

        const today = new Date();

        const waterSum = allLogs
          .filter((l) => l.logType === 'Water' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, current) => sum + current.logValue, 0);
        setTodaysWater(waterSum);

        const workoutSum = allLogs
          .filter((l) => l.logType === 'Workout' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, current) => sum + current.logValue, 0);
        setTodaysWorkout(workoutSum);

        const sleepSum = allLogs
          .filter((l) => l.logType === 'Sleep' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, current) => sum + current.logValue, 0);
        setTodaysSleep(sleepSum);

        const stepsSum = allLogs
          .filter((l) => l.logType === 'Steps' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, current) => sum + current.logValue, 0);
        setTodaysSteps(stepsSum);

        const caloriesSum = allLogs
          .filter((l) => l.logType === 'Calories' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, current) => sum + current.logValue, 0);
        setTodaysCalories(caloriesSum);
      }
    } catch (err: any) {
      showTemporaryError(err.response?.data?.message || err.message || 'Failed to load health records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
    fetchHealthLogs();
    const handleWorkoutEvent = () => {
      fetchHealthLogs();
    };
    window.addEventListener('lifesync:workout-updated', handleWorkoutEvent);
    return () => {
      window.removeEventListener('lifesync:workout-updated', handleWorkoutEvent);
    };
  }, [fetchHealthLogs]);

  const todaysLogs = logs.filter((l) => isSameDay(parseDateSafe(l.logDate), new Date()));

  useEffect(() => {
    if (activeTab !== 'forecast') return;

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
        const errorMsg = err.response?.data?.message || err.message || 'Failed to generate forecast.';
        setForecastError(errorMsg);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [fcSleep, fcWater, fcWorkout, fcSteps, fcTasks, activeTab]);

  const handleQuickAdd = async (type: string, value: number, details: string) => {
    setError(null);

    // Guard rails for single day maximums
    if (type === 'Water' && todaysWater + value > 10000) {
      const msg = `Daily water limit exceeded. Maximum 10,000 ml per day (currently at ${todaysWater} ml).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (type === 'Sleep' && todaysSleep + value > 24) {
      const msg = `Daily sleep limit exceeded. Maximum 24 hours per day (currently at ${todaysSleep} hours).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (type === 'Steps' && todaysSteps + value > 100000) {
      const msg = `Daily steps limit exceeded. Maximum 100,000 steps per day (currently at ${todaysSteps.toLocaleString()} steps).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (type === 'Calories' && todaysCalories + value > 10000) {
      const msg = `Daily calories limit exceeded. Maximum 10,000 kcal per day (currently at ${todaysCalories} kcal).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (type === 'Workout' && todaysWorkout + value > 360) {
      const msg = `Daily workout duration limit exceeded. Maximum 360 minutes per day (currently at ${todaysWorkout} mins).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }

    try {
      const res = await apiClient.post('/api/health', {
        logType: type,
        logValue: value,
        details: details,
        logDate: new Date().toISOString()
      });

      if (res.data.isSuccess) {
        trackAction('health_log_created', { module: 'health', action: 'create_log', item_type: type.toLowerCase() });
        await fetchHealthLogs();
        notify.success(`+${value} ${getUnit(type)} added to today's ${type}!`, 'Log Updated');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Failed to log ${type}.`;
      showTemporaryError(errMsg);
      notify.error(errMsg, 'Quick Log Failed');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(logValue);
    if (isNaN(val) || val <= 0) {
      showTemporaryError('Please enter a valid positive number.');
      notify.warning('Please enter a valid positive number.', 'Invalid Input');
      return;
    }

    if (logType === 'Water' && todaysWater + val > 10000) {
      const msg = `Daily water limit exceeded. Maximum 10,000 ml per day (currently at ${todaysWater} ml).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (logType === 'Sleep' && todaysSleep + val > 24) {
      const msg = `Daily sleep limit exceeded. Maximum 24 hours per day (currently at ${todaysSleep} hours).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (logType === 'Steps' && todaysSteps + val > 100000) {
      const msg = `Daily steps limit exceeded. Maximum 100,000 steps per day (currently at ${todaysSteps.toLocaleString()} steps).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (logType === 'Calories' && todaysCalories + val > 10000) {
      const msg = `Daily calories limit exceeded. Maximum 10,000 kcal per day (currently at ${todaysCalories} kcal).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }
    if (logType === 'Workout' && todaysWorkout + val > 360) {
      const msg = `Daily workout limit exceeded. Maximum 360 minutes per day (currently at ${todaysWorkout} mins).`;
      showTemporaryError(msg);
      notify.warning(msg, 'Daily Limit Reached');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/health', {
        logType,
        logValue: val,
        details: logDetails || `Manual ${logType} entry`,
        logDate: new Date().toISOString()
      });

      if (res.data.isSuccess) {
        trackAction('health_log_created', { module: 'health', action: 'create_log', item_type: logType.toLowerCase() });
        await fetchHealthLogs();
        setLogValue('');
        setLogDetails('');
        notify.success(`${logType} logged successfully!`, 'Health Record Saved');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Failed to save ${logType} log.`;
      showTemporaryError(errMsg);
      notify.error(errMsg, 'Save Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/health/${id}`);
      if (res.data.isSuccess) {
        trackAction('health_log_deleted', { module: 'health', action: 'delete_log' });
        await fetchHealthLogs();
        window.dispatchEvent(new CustomEvent('lifesync:workout-updated'));
        notify.info('Health log removed.', 'Record Deleted');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to delete health log.';
      showTemporaryError(errMsg);
      notify.error(errMsg, 'Delete Failed');
    }
  };

  const getUnit = (type: string) => {
    switch (type) {
      case 'Workout': return 'mins';
      case 'Sleep': return 'hours';
      case 'Steps': return 'steps';
      case 'Calories': return 'kcal';
      case 'Water': return 'ml';
      default: return '';
    }
  };

  const getLogTypeIcon = (type: string, size: 'small' | 'large' = 'large') => {
    const fs = size === 'large' ? 22 : 17;
    switch (type) {
      case 'Water': return <LocalDrinkIcon sx={{ color: '#2196F3', fontSize: fs }} />;
      case 'Workout': return <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: fs }} />;
      case 'Sleep': return <BedtimeIcon sx={{ color: '#9C27B0', fontSize: fs }} />;
      case 'Steps': return <DirectionsWalkIcon sx={{ color: '#4CAF50', fontSize: fs }} />;
      case 'Calories': return <RestaurantIcon sx={{ color: '#FF9800', fontSize: fs }} />;
      default: return <FitnessCenterIcon sx={{ fontSize: fs }} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'Water': return '#2196F3';
      case 'Workout': return 'var(--accent-primary)';
      case 'Sleep': return '#9C27B0';
      case 'Steps': return '#4CAF50';
      case 'Calories': return '#FF9800';
      default: return '#6D6D6D';
    }
  };

  // Progress Percentages based on user-configured targets
  const waterProgress = Math.min(100, (todaysWater / (targets.dailyWaterGoal || 2000)) * 100);
  const sleepProgress = Math.min(100, (todaysSleep / (targets.dailySleepGoal || 8)) * 100);
  const stepsProgress = Math.min(100, (todaysSteps / (targets.dailyStepsGoal || 10000)) * 100);
  const caloriesProgress = Math.min(100, (todaysCalories / (targets.dailyCalorieGoal || 2000)) * 100);
  const workoutProgress = Math.min(100, (todaysWorkout / (targets.dailyWorkoutGoal || 30)) * 100);

  return (
    <PageWrapper>
      <MuiBox 
        sx={{ 
          p: { xs: 2, sm: 2.5, md: 3 }, 
          height: { xs: 'auto', md: '100%' }, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: { xs: 'auto', md: 'hidden' },
          boxSizing: 'border-box'
        }}
      >
        {/* ========================================================
            ROW 1: UNIFIED HEADER ROW
            ======================================================== */}
        <MuiStack 
          direction="row" 
          sx={{ 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 0.8, 
            flexWrap: 'wrap', 
            gap: 1.5,
            flexShrink: 0
          }}
        >
          <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <MuiBox 
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
              <FitnessCenterIcon sx={{ fontSize: 26 }} />
            </MuiBox>
            <MuiBox>
              <MuiTypography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Health & Wellness
              </MuiTypography>
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', display: { xs: 'none', sm: 'block' } }}>
                Track hydration, sleep, steps, and calories or plan science-backed periodized AI workouts inside a single, unified health space.
              </MuiTypography>
            </MuiBox>
          </MuiStack>

          <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<TuneIcon sx={{ fontSize: 16 }} />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: isProf ? 'var(--card-border)' : 'rgba(255, 111, 38, 0.3)',
                color: 'var(--text-primary)',
                bgcolor: isProf ? 'var(--card-bg)' : undefined,
                px: 1.5,
                py: 0.6,
                '&:hover': {
                  borderColor: 'var(--accent-primary)',
                  bgcolor: 'rgba(255, 111, 38, 0.08)'
                }
              }}
            >
              Health Settings
            </MuiButton>

            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
              onClick={() => setHistoryModalOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: isProf ? 'var(--card-border)' : 'rgba(0,0,0,0.12)',
                color: 'var(--text-primary)',
                bgcolor: isProf ? 'var(--card-bg)' : undefined,
                px: 1.5,
                py: 0.6,
                '&:hover': {
                  bgcolor: isProf ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              Activity History
            </MuiButton>

            <ReportExporter module="Health" />
          </MuiStack>
        </MuiStack>

        {/* ========================================================
            ROW 2: UNIFIED NAVIGATION SEGMENTED TOGGLE
            ======================================================== */}
        <MuiBox sx={{ mb: 2, display: 'flex', width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
          <MuiToggleButtonGroup
            value={mainTab}
            exclusive
            onChange={(_, val) => {
              if (val) {
                setMainTab(val);
                if (val === 'metrics') {
                  fetchHealthLogs();
                }
              }
            }}
            aria-label="Health navigation view selection"
            sx={{
              display: 'inline-flex',
              flexDirection: { xs: 'column', sm: 'row' },
              width: { xs: '100%', sm: 'auto' },
              bgcolor: isProf ? 'var(--card-bg)' : (isDark ? 'rgba(26, 29, 45, 0.92)' : '#ffffff'),
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 111, 38, 0.18)'),
              borderRadius: isProf ? '0px' : '12px',
              p: '4px',
              gap: { xs: '4px', sm: '6px' },
              boxShadow: isProf ? 'none' : (isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(255, 111, 38, 0.08)'),
              '& .MuiToggleButtonGroup-grouped': {
                border: 'none !important',
                borderRadius: isProf ? '0px !important' : '9px !important'
              }
            }}
          >
            <MuiToggleButton
              value="workouts"
              aria-label="AI Weekly Workout Planner"
              sx={{
                flex: { xs: 1, sm: 'initial' },
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 38,
                px: 2.2,
                py: 0.6,
                fontSize: '13px',
                fontWeight: 650,
                letterSpacing: '0.2px',
                textTransform: 'none',
                gap: 1,
                color: 'var(--text-secondary, #6b7280)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isProf ? 'var(--hover-bg, rgba(0,0,0,0.04))' : 'rgba(255, 111, 38, 0.08)',
                  color: 'var(--accent-primary, #FF6F26)'
                },
                '&.Mui-selected': {
                  background: isProf 
                    ? 'var(--accent-primary, #FF6F26) !important'
                    : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%) !important',
                  color: '#ffffff !important',
                  fontWeight: 700,
                  boxShadow: isProf ? 'none' : '0 4px 12px rgba(255, 111, 38, 0.35)'
                }
              }}
            >
              <FitnessCenterIcon sx={{ fontSize: 17 }} />
              AI Weekly Workout Planner 🏋️
            </MuiToggleButton>

            <MuiToggleButton
              value="metrics"
              aria-label="Overview & Daily Logs"
              sx={{
                flex: { xs: 1, sm: 'initial' },
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 38,
                px: 2.2,
                py: 0.6,
                fontSize: '13px',
                fontWeight: 650,
                letterSpacing: '0.2px',
                textTransform: 'none',
                gap: 1,
                color: 'var(--text-secondary, #6b7280)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isProf ? 'var(--hover-bg, rgba(0,0,0,0.04))' : 'rgba(255, 111, 38, 0.08)',
                  color: 'var(--accent-primary, #FF6F26)'
                },
                '&.Mui-selected': {
                  background: isProf 
                    ? 'var(--accent-primary, #FF6F26) !important'
                    : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%) !important',
                  color: '#ffffff !important',
                  fontWeight: 700,
                  boxShadow: isProf ? 'none' : '0 4px 12px rgba(255, 111, 38, 0.35)'
                }
              }}
            >
              <DirectionsWalkIcon sx={{ fontSize: 17 }} />
              Overview & Daily Logs
            </MuiToggleButton>
          </MuiToggleButtonGroup>
        </MuiBox>

        {error && (
          <MuiAlert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: '10px', flexShrink: 0 }}>
            {error}
          </MuiAlert>
        )}

        {/* ========================================================
            ROW 3: COMPACT OVERVIEW ROW (5 Metrics Cards, Modern 3D)
            Always visible in both views as per spec!
            ======================================================== */}
        <MuiBox
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(5, 1fr)'
            },
            gap: 1.5,
            mb: 2.5,
            flexShrink: 0
          }}
        >
          {/* Card 1: Water Intake */}
          <TiltCard
            maxTilt={3}
            sx={{
              p: 1.5,
              borderLeft: '4px solid #2196F3',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <MuiBox>
              <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                <LocalDrinkIcon sx={{ color: '#2196F3', fontSize: 18 }} />
                <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px' }}>
                  Water Intake
                </MuiTypography>
              </MuiStack>
              <MuiTypography variant="h6" sx={{ fontWeight: 800, color: '#2196F3', lineHeight: 1.1 }}>
                {todaysWater}{' '}
                <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {targets.dailyWaterGoal} ml
                </MuiTypography>
              </MuiTypography>
              <MuiLinearProgress
                variant="determinate"
                value={waterProgress}
                sx={{
                  height: 5,
                  borderRadius: isProf ? 0 : 3,
                  my: 1,
                  bgcolor: 'rgba(33, 150, 243, 0.12)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#2196F3', borderRadius: isProf ? 0 : 3 }
                }}
              />
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {waterProgress.toFixed(0)}% daily goal
              </MuiTypography>
            </MuiBox>

            <MuiStack direction="row" spacing={0.5} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.5 }}>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 250, 'Cup of water')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+250</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 500, 'Bottle of water')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+500</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 750, 'Large bottle')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+750</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 1000, 'One Liter')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+1k</MuiButton>
            </MuiStack>
          </TiltCard>

          {/* Card 2: Sleep Duration */}
          <TiltCard
            maxTilt={3}
            sx={{
              p: 1.5,
              borderLeft: '4px solid #9C27B0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <MuiBox>
              <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                <BedtimeIcon sx={{ color: '#9C27B0', fontSize: 18 }} />
                <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px' }}>
                  Sleep Duration
                </MuiTypography>
              </MuiStack>
              <MuiTypography variant="h6" sx={{ fontWeight: 800, color: '#9C27B0', lineHeight: 1.1 }}>
                {todaysSleep}{' '}
                <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {targets.dailySleepGoal} hours
                </MuiTypography>
              </MuiTypography>
              <MuiLinearProgress
                variant="determinate"
                value={sleepProgress}
                sx={{
                  height: 5,
                  borderRadius: isProf ? 0 : 3,
                  my: 1,
                  bgcolor: 'rgba(156, 39, 176, 0.12)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#9C27B0', borderRadius: isProf ? 0 : 3 }
                }}
              />
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {sleepProgress.toFixed(0)}% daily goal
              </MuiTypography>
            </MuiBox>

            <MuiStack direction="row" spacing={0.5} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.5 }}>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 1, 'Quick nap')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+1h</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 2, 'Rest update')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+2h</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 6, 'Short sleep')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+6h</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 8, 'Full night sleep')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+8h</MuiButton>
            </MuiStack>
          </TiltCard>

          {/* Card 3: Steps Walked */}
          <TiltCard
            maxTilt={3}
            sx={{
              p: 1.5,
              borderLeft: '4px solid #4CAF50',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <MuiBox>
              <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                <DirectionsWalkIcon sx={{ color: '#4CAF50', fontSize: 18 }} />
                <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px' }}>
                  Steps Walked
                </MuiTypography>
              </MuiStack>
              <MuiTypography variant="h6" sx={{ fontWeight: 800, color: '#4CAF50', lineHeight: 1.1 }}>
                {todaysSteps.toLocaleString()}{' '}
                <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {targets.dailyStepsGoal.toLocaleString()} steps
                </MuiTypography>
              </MuiTypography>
              <MuiLinearProgress
                variant="determinate"
                value={stepsProgress}
                sx={{
                  height: 5,
                  borderRadius: isProf ? 0 : 3,
                  my: 1,
                  bgcolor: 'rgba(76, 175, 80, 0.12)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50', borderRadius: isProf ? 0 : 3 }
                }}
              />
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {stepsProgress.toFixed(0)}% daily goal
              </MuiTypography>
            </MuiBox>

            <MuiStack direction="row" spacing={0.5} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.5 }}>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 1000, 'Walk update')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+1k</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 2000, 'Walk update')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+2k</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 5000, 'Jog/Run update')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+5k</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 10000, 'Completed daily steps')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+10k</MuiButton>
            </MuiStack>
          </TiltCard>

          {/* Card 4: Calories Intake */}
          <TiltCard
            maxTilt={3}
            sx={{
              p: 1.5,
              borderLeft: '4px solid #FF9800',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <MuiBox>
              <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                <RestaurantIcon sx={{ color: '#FF9800', fontSize: 18 }} />
                <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px' }}>
                  Calories Intake
                </MuiTypography>
              </MuiStack>
              <MuiTypography variant="h6" sx={{ fontWeight: 800, color: '#FF9800', lineHeight: 1.1 }}>
                {todaysCalories}{' '}
                <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {targets.dailyCalorieGoal} kcal
                </MuiTypography>
              </MuiTypography>
              <MuiLinearProgress
                variant="determinate"
                value={caloriesProgress}
                sx={{
                  height: 5,
                  borderRadius: isProf ? 0 : 3,
                  my: 1,
                  bgcolor: 'rgba(255, 152, 0, 0.12)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#FF9800', borderRadius: isProf ? 0 : 3 }
                }}
              />
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {caloriesProgress.toFixed(0)}% daily limit
              </MuiTypography>
            </MuiBox>

            <MuiStack direction="row" spacing={0.5} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.5 }}>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 250, 'Light snack')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+250</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 500, 'Regular meal')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+500</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 750, 'Large meal')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+750</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 1000, 'Heavy food log')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+1k</MuiButton>
            </MuiStack>
          </TiltCard>

          {/* Card 5: Workout Duration */}
          <TiltCard
            maxTilt={3}
            sx={{
              p: 1.5,
              borderLeft: '4px solid var(--accent-primary)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <MuiBox>
              <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
                <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px' }}>
                  Workout Duration
                </MuiTypography>
              </MuiStack>
              <MuiTypography variant="h6" sx={{ fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1.1 }}>
                {todaysWorkout}{' '}
                <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {targets.dailyWorkoutGoal} mins
                </MuiTypography>
              </MuiTypography>
              <MuiLinearProgress
                variant="determinate"
                value={workoutProgress}
                sx={{
                  height: 5,
                  borderRadius: isProf ? 0 : 3,
                  my: 1,
                  bgcolor: 'rgba(255, 111, 38, 0.12)',
                  '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-primary)', borderRadius: isProf ? 0 : 3 }
                }}
              />
              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {workoutProgress.toFixed(0)}% daily goal
              </MuiTypography>
            </MuiBox>

            <MuiStack direction="row" spacing={0.5} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.5 }}>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 15, 'HIIT Cardio')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+15</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 30, 'Gym routine')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+30</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 45, 'Weight lifting')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+45</MuiButton>
              <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 60, 'Long exercise burn')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '5px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+60</MuiButton>
            </MuiStack>
          </TiltCard>
        </MuiBox>

        {/* ========================================================
            ROW 4: MAIN CONTENT REGION WITH INTERNAL SCROLLING
            ======================================================== */}
        <MuiBox 
          sx={{ 
            flex: 1, 
            minHeight: 0, 
            overflowY: 'auto', 
            pr: { xs: 0, md: 0.5 },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {mainTab === 'workouts' ? (
            <WorkoutPlannerDashboard onWorkoutChanged={fetchHealthLogs} />
          ) : (
            <MuiGrid container spacing={2.5} sx={{ alignItems: 'stretch', flex: 1, minHeight: 0 }}>
              {/* Left Column: Manual Form & Predict AI */}
              <MuiGrid size={{ xs: 12, md: 5.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                <TiltCard maxTilt={2.5} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Tabs */}
                  <MuiStack direction="row" spacing={2} sx={{ mb: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <MuiButton 
                      onClick={() => setActiveTab('log')}
                      sx={{ 
                        color: activeTab === 'log' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'log' ? 700 : 500,
                        borderBottom: activeTab === 'log' ? '2.5px solid var(--accent-primary)' : 'none',
                        borderRadius: 0,
                        textTransform: 'none',
                        pb: 1,
                        minWidth: 0,
                        px: 1
                      }}
                    >
                      Manual Add Log
                    </MuiButton>
                    <MuiButton 
                      onClick={() => setActiveTab('forecast')}
                      sx={{ 
                        color: activeTab === 'forecast' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'forecast' ? 700 : 500,
                        borderBottom: activeTab === 'forecast' ? '2.5px solid var(--accent-primary)' : 'none',
                        borderRadius: 0,
                        textTransform: 'none',
                        pb: 1,
                        minWidth: 0,
                        px: 1
                      }}
                    >
                      Predict AI 🔮
                    </MuiButton>
                  </MuiStack>

                  {activeTab === 'log' ? (
                    <>
                      <MuiTypography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 2.5 }}>
                        Log custom amounts for Water, Sleep, Steps, Calories, or Workout. Daily limits apply.
                      </MuiTypography>

                      <form
                        onSubmit={handleManualSubmit}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          flex: 1,
                          width: '100%',
                          justifyContent: 'space-between'
                        }}
                      >
                        <MuiBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <MuiGrid container spacing={2}>
                            <MuiGrid size={{ xs: 12, sm: 6 }}>
                              <MuiFormControl fullWidth size="small">
                                <MuiInputLabel id="health-category-select-label">Category</MuiInputLabel>
                                <MuiSelect
                                  labelId="health-category-select-label"
                                  value={logType}
                                  label="Category"
                                  onChange={(e) => setLogType(e.target.value as any)}
                                >
                                  <MuiMenuItem value="Water">Water (ml)</MuiMenuItem>
                                  <MuiMenuItem value="Sleep">Sleep (hours)</MuiMenuItem>
                                  <MuiMenuItem value="Steps">Steps (count)</MuiMenuItem>
                                  <MuiMenuItem value="Calories">Calories (kcal)</MuiMenuItem>
                                  <MuiMenuItem value="Workout">Workout (mins)</MuiMenuItem>
                                </MuiSelect>
                              </MuiFormControl>
                            </MuiGrid>
                            <MuiGrid size={{ xs: 12, sm: 6 }}>
                              <MuiTextField
                                label={`Value (${getUnit(logType)})`}
                                type="number"
                                required
                                fullWidth
                                size="small"
                                value={logValue}
                                onChange={(e) => setLogValue(e.target.value)}
                                slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
                              />
                            </MuiGrid>
                          </MuiGrid>

                          <MuiTextField
                            label="Log details / description"
                            placeholder={`e.g. ${logType === 'Sleep' ? 'Slept like a baby' : logType === 'Steps' ? 'Afternoon run' : logType === 'Calories' ? 'Lunch meal' : 'Water glass'}`}
                            required
                            fullWidth
                            size="small"
                            value={logDetails}
                            onChange={(e) => setLogDetails(e.target.value)}
                          />
                        </MuiBox>

                        <MuiButton
                          type="submit"
                          variant="contained"
                          disabled={submitting}
                          fullWidth
                          sx={{
                            mt: 2.5,
                            py: 1.2,
                            bgcolor: 'var(--accent-primary)',
                            color: '#ffffff',
                            borderRadius: isProf ? 0 : '10px',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            textTransform: 'none',
                            boxShadow: isProf ? 'none' : '0 4px 14px rgba(255, 111, 38, 0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: 'var(--accent-secondary)' }
                          }}
                        >
                          {submitting ? 'Saving Entry...' : `Save ${logType} Log`}
                        </MuiButton>
                      </form>
                    </>
                  ) : (
                    <MuiStack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1, minHeight: 0, mt: 1 }}>
                      {/* Left: Sliders */}
                      <MuiBox sx={{ flex: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <MuiGrid container spacing={1.5}>
                          {/* Sleep Slider */}
                          <MuiGrid size={{ xs: 6 }}>
                            <MuiBox sx={{ p: 1.2, borderRadius: isProf ? 0 : '8px', bgcolor: 'rgba(156, 39, 176, 0.03)', border: '1px solid rgba(156, 39, 176, 0.12)' }}>
                              <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)' }}>Sleep</MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#9C27B0' }}>{fcSleep}h</MuiTypography>
                              </MuiStack>
                              <MuiSlider
                                value={fcSleep}
                                min={0}
                                max={12}
                                step={0.5}
                                onChange={(_, val) => setFcSleep(val as number)}
                                sx={{ color: '#9C27B0', height: 3, py: 0.2 }}
                              />
                            </MuiBox>
                          </MuiGrid>

                          {/* Water Slider */}
                          <MuiGrid size={{ xs: 6 }}>
                            <MuiBox sx={{ p: 1.2, borderRadius: isProf ? 0 : '8px', bgcolor: 'rgba(33, 150, 243, 0.03)', border: '1px solid rgba(33, 150, 243, 0.12)' }}>
                              <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)' }}>Water</MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#2196F3' }}>{fcWater}ml</MuiTypography>
                              </MuiStack>
                              <MuiSlider
                                value={fcWater}
                                min={0}
                                max={4000}
                                step={100}
                                onChange={(_, val) => setFcWater(val as number)}
                                sx={{ color: '#2196F3', height: 3, py: 0.2 }}
                              />
                            </MuiBox>
                          </MuiGrid>

                          {/* Workout Slider */}
                          <MuiGrid size={{ xs: 6 }}>
                            <MuiBox sx={{ p: 1.2, borderRadius: isProf ? 0 : '8px', bgcolor: 'rgba(255, 111, 38, 0.03)', border: '1px solid rgba(255, 111, 38, 0.12)' }}>
                              <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)' }}>Workout</MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: 'var(--accent-primary)' }}>{fcWorkout}m</MuiTypography>
                              </MuiStack>
                              <MuiSlider
                                value={fcWorkout}
                                min={0}
                                max={120}
                                step={5}
                                onChange={(_, val) => setFcWorkout(val as number)}
                                sx={{ color: 'var(--accent-primary)', height: 3, py: 0.2 }}
                              />
                            </MuiBox>
                          </MuiGrid>

                          {/* Steps Slider */}
                          <MuiGrid size={{ xs: 6 }}>
                            <MuiBox sx={{ p: 1.2, borderRadius: isProf ? 0 : '8px', bgcolor: 'rgba(76, 175, 80, 0.03)', border: '1px solid rgba(76, 175, 80, 0.12)' }}>
                              <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)' }}>Steps</MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#4CAF50' }}>{fcSteps.toLocaleString()}</MuiTypography>
                              </MuiStack>
                              <MuiSlider
                                value={fcSteps}
                                min={0}
                                max={20000}
                                step={500}
                                onChange={(_, val) => setFcSteps(val as number)}
                                sx={{ color: '#4CAF50', height: 3, py: 0.2 }}
                              />
                            </MuiBox>
                          </MuiGrid>

                          {/* Tasks Slider */}
                          <MuiGrid size={{ xs: 12 }}>
                            <MuiBox sx={{ p: 1.2, borderRadius: isProf ? 0 : '8px', bgcolor: 'rgba(255, 152, 0, 0.03)', border: '1px solid rgba(255, 152, 0, 0.12)' }}>
                              <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)' }}>Pending Tasks</MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#FF9800' }}>{fcTasks} tasks</MuiTypography>
                              </MuiStack>
                              <MuiSlider
                                value={fcTasks}
                                min={0}
                                max={10}
                                step={1}
                                onChange={(_, val) => setFcTasks(val as number)}
                                sx={{ color: '#FF9800', height: 3, py: 0.2 }}
                              />
                            </MuiBox>
                          </MuiGrid>
                        </MuiGrid>
                      </MuiBox>

                      {/* Right: Results Card */}
                      <MuiBox sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {forecastResult ? (
                          <MuiBox 
                            sx={{ 
                              p: 2, 
                              background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(33, 150, 243, 0.05) 100%)', 
                              border: '1.5px solid rgba(156, 39, 176, 0.25)', 
                              borderRadius: isProf ? 0 : '12px',
                              boxShadow: isProf ? 'none' : '0 4px 12px rgba(156, 39, 176, 0.06)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.2
                            }}
                          >
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <MuiStack spacing={0.2}>
                                <MuiTypography variant="caption" sx={{ fontWeight: 800, color: '#9C27B0', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.5px' }}>Predicted Life Score</MuiTypography>
                                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Compiled Wellness Outlook</MuiTypography>
                              </MuiStack>
                              <MuiBox 
                                sx={{ 
                                  px: 1.2, 
                                  py: 0.3, 
                                  borderRadius: isProf ? 0 : '16px', 
                                  bgcolor: forecastResult.forecastedLifeScore >= 85 ? 'rgba(76, 175, 80, 0.15)' : forecastResult.forecastedLifeScore >= 70 ? 'rgba(255, 152, 0, 0.15)' : 'rgba(232, 90, 79, 0.15)',
                                  border: forecastResult.forecastedLifeScore >= 85 ? '1px solid #4CAF50' : forecastResult.forecastedLifeScore >= 70 ? '1px solid #FF9800' : '1px solid #E85A4F',
                                  display: 'inline-flex',
                                  alignItems: 'baseline'
                                }}
                              >
                                <MuiTypography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 800, 
                                    color: forecastResult.forecastedLifeScore >= 85 ? '#4CAF50' : forecastResult.forecastedLifeScore >= 70 ? '#E65100' : '#E85A4F', 
                                    mr: 0.4,
                                    fontSize: '14px'
                                  }}
                                >
                                  {forecastResult.forecastedLifeScore}
                                </MuiTypography>
                                <MuiTypography variant="caption" sx={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                  / 100
                                </MuiTypography>
                              </MuiBox>
                            </MuiStack>
                            
                            <MuiBox sx={{ bgcolor: 'var(--card-bg)', p: 1.2, borderRadius: isProf ? 0 : '8px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              <MuiTypography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.4 }}>
                                {forecastResult.healthRecommendation}
                              </MuiTypography>
                            </MuiBox>
                          </MuiBox>
                        ) : forecastError ? (
                          <MuiBox sx={{ p: 2, border: '1px solid rgba(232, 90, 79, 0.3)', borderRadius: isProf ? 0 : '10px', bgcolor: 'rgba(232, 90, 79, 0.04)' }}>
                            <MuiTypography variant="caption" sx={{ color: '#E85A4F', fontWeight: 700, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>Forecast Failure</MuiTypography>
                            <MuiTypography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: '11px' }}>{forecastError}</MuiTypography>
                          </MuiBox>
                        ) : (
                          <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3, border: '1px dashed rgba(0,0,0,0.1)', borderRadius: isProf ? 0 : '10px' }}>
                            <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Loading Wellness Outlook...</MuiTypography>
                          </MuiBox>
                        )}
                      </MuiBox>
                    </MuiStack>
                  )}
                </TiltCard>
              </MuiGrid>

              {/* Right Column: Today's Health Activity Logs */}
              <MuiGrid size={{ xs: 12, md: 6.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                <TiltCard maxTilt={2.5} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <MuiStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <MuiTypography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      Today's Health Activity Logs
                    </MuiTypography>
                    <MuiButton
                      size="small"
                      variant="text"
                      startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setHistoryModalOpen(true)}
                      sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 650, color: 'var(--accent-primary)' }}
                    >
                      View All History
                    </MuiButton>
                  </MuiStack>

                  {loading ? (
                    <LogoLoader />
                  ) : todaysLogs.length === 0 ? (
                    <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', py: 6 }}>
                      <FitnessCenterIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1.5 }} />
                      <MuiTypography variant="body2" sx={{ fontWeight: 600 }}>No logs registered today.</MuiTypography>
                      <MuiTypography variant="caption">Use the log controls above or quick buttons to record metrics!</MuiTypography>
                    </MuiBox>
                  ) : (
                    <MuiStack spacing={1} sx={{ overflowY: 'auto', flex: 1, pr: 0.5, minHeight: '180px', maxHeight: '420px' }}>
                      {todaysLogs.map((l) => (
                        <MuiBox
                          key={l.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.2,
                            borderRadius: isProf ? 0 : '10px',
                            borderLeft: `4px solid ${getLogColor(l.logType)}`,
                            bgcolor: isProf ? 'var(--bg-secondary)' : isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                            border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(0,0,0,0.04)'
                          }}
                        >
                          <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <MuiBox sx={{ bgcolor: `${getLogColor(l.logType)}15`, p: 0.8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getLogTypeIcon(l.logType, 'small')}
                            </MuiBox>
                            <MuiBox sx={{ minWidth: 0 }}>
                              <MuiTypography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {l.logType}: {l.logValue} {getUnit(l.logType)}
                              </MuiTypography>
                              <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.details} • {parseDateSafe(l.logDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </MuiTypography>
                            </MuiBox>
                          </MuiStack>
                          <MuiTooltip title="Delete record">
                            <MuiIconButton onClick={() => handleDeleteLog(l.id)} size="small" sx={{ color: '#E85A4F', p: 0.6 }}>
                              <DeleteIcon fontSize="small" />
                            </MuiIconButton>
                          </MuiTooltip>
                        </MuiBox>
                      ))}
                    </MuiStack>
                  )}
                </TiltCard>
              </MuiGrid>
            </MuiGrid>
          )}
        </MuiBox>

        {/* Configurable Health Targets Modal */}
        <HealthSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          targets={targets}
          onTargetsUpdated={(newT) => {
            setTargets(newT);
            fetchHealthLogs();
          }}
          onOpenWorkoutGenerator={() => {
            setMainTab('workouts');
          }}
        />

        {/* Extended Health Activity History & Filter Drawer/Modal */}
        <HealthActivityHistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          logs={logs}
          loading={loading}
          onDeleteLog={handleDeleteLog}
        />
      </MuiBox>
    </PageWrapper>
  );
};

export default Health;
