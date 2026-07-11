import React, { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

// Let's import core Material UI components directly to avoid namespace clashes
import { 
  Box as MuiBox, 
  Typography as MuiTypography, 
  Card as MuiCard, 
  CardContent as MuiCardContent, 
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
  Slider as MuiSlider
} from '@mui/material';

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
    return new Date(dateStr + 'Z');
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

interface HealthLog {
  id: number;
  logType: string; // 'Water', 'Workout', 'Sleep', 'Steps', 'Calories'
  logValue: number; 
  details?: string;
  logDate: string;
}

const Health: React.FC = () => {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Targets
  const waterTarget = 2000;    // 2000 ml
  const sleepTarget = 8;       // 8 hours
  const stepsTarget = 10000;   // 10000 steps
  const caloriesTarget = 2000; // 2000 kcal

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

  const showTemporaryError = (msg: string) => {
    setError(msg);
    setTimeout(() => {
      setError((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const fetchHealthLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/health');
      if (res.data.isSuccess) {
        const allLogs = res.data.data as HealthLog[];
        setLogs(allLogs);

        const today = new Date();

        // Calculate today's metrics
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
  };

  useEffect(() => {
    fetchHealthLogs();
  }, []);

  useEffect(() => {
    if (activeTab !== 'forecast') return;

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await apiClient.post('/api/health/forecast', {
          waterIntake: fcWater,
          sleepHours: fcSleep,
          workoutMinutes: fcWorkout,
          stepsCount: fcSteps,
          pendingTasks: fcTasks
        });
        if (res.data.isSuccess) {
          setForecastResult(res.data.data);
        }
      } catch (err: any) {
        // Silent fallback
      }
    }, 200); // 200ms debounce

    return () => clearTimeout(delayDebounce);
  }, [fcSleep, fcWater, fcWorkout, fcSteps, fcTasks, activeTab]);

  const handleQuickAdd = async (type: string, value: number, details: string) => {
    setError(null);

    // Validate daily limits
    if (type === 'Water' && todaysWater + value > 10000) {
      showTemporaryError(`Daily water intake limit exceeded. You cannot log more than 10,000 ml per day (currently at ${todaysWater} ml).`);
      return;
    }
    if (type === 'Sleep' && todaysSleep + value > 24) {
      showTemporaryError(`Daily sleep duration limit exceeded. You cannot log more than 24 hours per day (currently at ${todaysSleep} hours).`);
      return;
    }
    if (type === 'Steps' && todaysSteps + value > 100000) {
      showTemporaryError(`Daily steps limit exceeded. You cannot log more than 100,000 steps per day (currently at ${todaysSteps} steps).`);
      return;
    }
    if (type === 'Calories' && todaysCalories + value > 10000) {
      showTemporaryError(`Daily calories limit exceeded. You cannot log more than 10,000 kcal per day (currently at ${todaysCalories} kcal).`);
      return;
    }
    if (type === 'Workout' && todaysWorkout + value > 360) {
      showTemporaryError(`Daily workout duration limit exceeded. You cannot log more than 360 minutes per day (currently at ${todaysWorkout} mins).`);
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
        await fetchHealthLogs();
      }
    } catch (err: any) {
      showTemporaryError(err.response?.data?.message || `Failed to log ${type}.`);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(logValue);
    if (isNaN(val) || val <= 0) {
      showTemporaryError('Please enter a valid positive number.');
      return;
    }

    // Validate daily limits
    if (logType === 'Water' && todaysWater + val > 10000) {
      showTemporaryError(`Daily water intake limit exceeded. You cannot log more than 10,000 ml per day (currently at ${todaysWater} ml).`);
      return;
    }
    if (logType === 'Sleep' && todaysSleep + val > 24) {
      showTemporaryError(`Daily sleep duration limit exceeded. You cannot log more than 24 hours per day (currently at ${todaysSleep} hours).`);
      return;
    }
    if (logType === 'Steps' && todaysSteps + val > 100000) {
      showTemporaryError(`Daily steps limit exceeded. You cannot log more than 100,000 steps per day (currently at ${todaysSteps} steps).`);
      return;
    }
    if (logType === 'Calories' && todaysCalories + val > 10000) {
      showTemporaryError(`Daily calories limit exceeded. You cannot log more than 10,000 kcal per day (currently at ${todaysCalories} kcal).`);
      return;
    }
    if (logType === 'Workout' && todaysWorkout + val > 360) {
      showTemporaryError(`Daily workout duration limit exceeded. You cannot log more than 360 minutes per day (currently at ${todaysWorkout} mins).`);
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
        await fetchHealthLogs();
        setLogValue('');
        setLogDetails('');
      }
    } catch (err: any) {
      showTemporaryError(err.response?.data?.message || `Failed to save ${logType} log.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/health/${id}`);
      if (res.data.isSuccess) {
        await fetchHealthLogs();
      }
    } catch (err: any) {
      showTemporaryError(err.response?.data?.message || 'Failed to delete health log.');
    }
  };

  const getUnit = (type: string) => {
    switch (type) {
      case 'Workout': return 'minutes';
      case 'Sleep': return 'hours';
      case 'Steps': return 'steps';
      case 'Calories': return 'kcal';
      default: return '';
    }
  };

  const getLogTypeIcon = (type: string, size: 'small' | 'large' = 'large') => {
    const fs = size === 'large' ? 24 : 18;
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

  // Progress Percentages
  const waterProgress = Math.min(100, (todaysWater / waterTarget) * 100);
  const sleepProgress = Math.min(100, (todaysSleep / sleepTarget) * 100);
  const stepsProgress = Math.min(100, (todaysSteps / stepsTarget) * 100);
  const caloriesProgress = Math.min(100, (todaysCalories / caloriesTarget) * 100);
  const workoutProgress = Math.min(100, (todaysWorkout / 30) * 100);

  return (
    <PageWrapper>
      <MuiBox sx={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <MuiStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <MuiStack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <MuiTypography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Health & Wellness
            </MuiTypography>
          </MuiStack>
          <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ThemeToggle />
            <ReportExporter module="Health" />
          </MuiStack>
        </MuiStack>
        <MuiTypography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Track hydration levels, sleep hours, step counts, calorie intakes, and cardio workouts inside a single, premium health space.
        </MuiTypography>

        {error && (
          <MuiAlert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </MuiAlert>
        )}

        {/* 5 Health Metrics Dashboard Row */}
        <MuiGrid container spacing={2.5} sx={{ mb: 4, alignItems: 'stretch' }}>
          {/* Hydration progress card */}
          <MuiGrid size={{ xs: 12, sm: 6, md: 2.4 }} sx={{ display: 'flex' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '4px solid #2196F3', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: '16px !important' }}>
                <MuiBox>
                  <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <LocalDrinkIcon sx={{ color: '#2196F3' }} />
                    <MuiTypography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Water Intake</MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="h5" sx={{ fontWeight: 700, color: '#2196F3' }}>
                    {todaysWater} <MuiTypography component="span" variant="caption" sx={{ color: '#8D8D8D' }}>/ {waterTarget} ml</MuiTypography>
                  </MuiTypography>
                  <MuiLinearProgress variant="determinate" value={waterProgress} sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: '#E3F2FD', '& .MuiLinearProgress-bar': { bgcolor: '#2196F3' } }} />
                  <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>{waterProgress.toFixed(0)}% daily goal</MuiTypography>
                </MuiBox>
                
                <MuiStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8, mt: 2 }}>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 250, 'Cup of water')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#2196F3', color: '#2196F3', '&:hover': { bgcolor: '#E3F2FD' } }}>+250</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 500, 'Bottle of water')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#2196F3', color: '#2196F3', '&:hover': { bgcolor: '#E3F2FD' } }}>+500</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 750, 'Large bottle')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#2196F3', color: '#2196F3', '&:hover': { bgcolor: '#E3F2FD' } }}>+750</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 1000, 'One Liter')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#2196F3', color: '#2196F3', '&:hover': { bgcolor: '#E3F2FD' } }}>+1k</MuiButton>
                </MuiStack>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>

          {/* Sleep progress card */}
          <MuiGrid size={{ xs: 12, sm: 6, md: 2.4 }} sx={{ display: 'flex' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '4px solid #9C27B0', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: '16px !important' }}>
                <MuiBox>
                  <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <BedtimeIcon sx={{ color: '#9C27B0' }} />
                    <MuiTypography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Sleep Duration</MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="h5" sx={{ fontWeight: 700, color: '#9C27B0' }}>
                    {todaysSleep} <MuiTypography component="span" variant="caption" sx={{ color: '#8D8D8D' }}>/ {sleepTarget} hours</MuiTypography>
                  </MuiTypography>
                  <MuiLinearProgress variant="determinate" value={sleepProgress} sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: '#F3E5F5', '& .MuiLinearProgress-bar': { bgcolor: '#9C27B0' } }} />
                  <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>{sleepProgress.toFixed(0)}% daily goal</MuiTypography>
                </MuiBox>

                <MuiStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8, mt: 2 }}>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 1, 'Quick nap')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#9C27B0', color: '#9C27B0', '&:hover': { bgcolor: '#F3E5F5' } }}>+1h</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 2, 'Rest update')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#9C27B0', color: '#9C27B0', '&:hover': { bgcolor: '#F3E5F5' } }}>+2h</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 6, 'Short sleep')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#9C27B0', color: '#9C27B0', '&:hover': { bgcolor: '#F3E5F5' } }}>+6h</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 8, 'Full night sleep')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#9C27B0', color: '#9C27B0', '&:hover': { bgcolor: '#F3E5F5' } }}>+8h</MuiButton>
                </MuiStack>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>

          {/* Steps progress card */}
          <MuiGrid size={{ xs: 12, sm: 6, md: 2.4 }} sx={{ display: 'flex' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '4px solid #4CAF50', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: '16px !important' }}>
                <MuiBox>
                  <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <DirectionsWalkIcon sx={{ color: '#4CAF50' }} />
                    <MuiTypography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Steps Walked</MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                    {todaysSteps.toLocaleString()} <MuiTypography component="span" variant="caption" sx={{ color: '#8D8D8D' }}>/ {stepsTarget} steps</MuiTypography>
                  </MuiTypography>
                  <MuiLinearProgress variant="determinate" value={stepsProgress} sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50' } }} />
                  <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>{stepsProgress.toFixed(0)}% daily goal</MuiTypography>
                </MuiBox>

                <MuiStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8, mt: 2 }}>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 1000, 'Walk update')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#4CAF50', color: '#4CAF50', '&:hover': { bgcolor: '#E8F5E9' } }}>+1k</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 2000, 'Walk update')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#4CAF50', color: '#4CAF50', '&:hover': { bgcolor: '#E8F5E9' } }}>+2k</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 5000, 'Jog/Run update')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#4CAF50', color: '#4CAF50', '&:hover': { bgcolor: '#E8F5E9' } }}>+5k</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 10000, 'Completed daily steps')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#4CAF50', color: '#4CAF50', '&:hover': { bgcolor: '#E8F5E9' } }}>+10k</MuiButton>
                </MuiStack>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>

          {/* Calories progress card */}
          <MuiGrid size={{ xs: 12, sm: 6, md: 2.4 }} sx={{ display: 'flex' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '4px solid #FF9800', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: '16px !important' }}>
                <MuiBox>
                  <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <RestaurantIcon sx={{ color: '#FF9800' }} />
                    <MuiTypography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Calories Intake</MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                    {todaysCalories} <MuiTypography component="span" variant="caption" sx={{ color: '#8D8D8D' }}>/ {caloriesTarget} kcal</MuiTypography>
                  </MuiTypography>
                  <MuiLinearProgress variant="determinate" value={caloriesProgress} sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: '#FFF3E0', '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />
                  <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>{caloriesProgress.toFixed(0)}% daily limit</MuiTypography>
                </MuiBox>

                <MuiStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8, mt: 2 }}>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 250, 'Light snack')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#FF9800', color: '#FF9800', '&:hover': { bgcolor: '#FFF3E0' } }}>+250</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 500, 'Regular meal')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#FF9800', color: '#FF9800', '&:hover': { bgcolor: '#FFF3E0' } }}>+500</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 750, 'Large meal')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#FF9800', color: '#FF9800', '&:hover': { bgcolor: '#FFF3E0' } }}>+750</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 1000, 'Heavy food log')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: '#FF9800', color: '#FF9800', '&:hover': { bgcolor: '#FFF3E0' } }}>+1k</MuiButton>
                </MuiStack>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>

          {/* Workout progress card */}
          <MuiGrid size={{ xs: 12, sm: 6, md: 2.4 }} sx={{ display: 'flex' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '4px solid var(--accent-primary)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: '16px !important' }}>
                <MuiBox>
                  <MuiStack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                    <FitnessCenterIcon sx={{ color: 'var(--accent-primary)' }} />
                    <MuiTypography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Workout Duration</MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="h5" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {todaysWorkout} <MuiTypography component="span" variant="caption" sx={{ color: '#8D8D8D' }}>/ 30 mins</MuiTypography>
                  </MuiTypography>
                  <MuiLinearProgress variant="determinate" value={workoutProgress} sx={{ height: 6, borderRadius: 3, my: 1.5, bgcolor: '#FFEBEE', '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-primary)' } }} />
                  <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>{workoutProgress.toFixed(0)}% daily goal</MuiTypography>
                </MuiBox>

                <MuiStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8, mt: 2 }}>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 15, 'HIIT Cardio')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', '&:hover': { bgcolor: '#FFEBEE' } }}>+15</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 30, 'Gym routine')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', '&:hover': { bgcolor: '#FFEBEE' } }}>+30</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 45, 'Weight lifting')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', '&:hover': { bgcolor: '#FFEBEE' } }}>+45</MuiButton>
                  <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 60, 'Long exercise burn')} sx={{ minWidth: 0, py: '2px', px: '6px', fontSize: '9px', textTransform: 'none', borderRadius: '6px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', '&:hover': { bgcolor: '#FFEBEE' } }}>+60</MuiButton>
                </MuiStack>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>
        </MuiGrid>

        {/* Split Bottom Section - Left Side: Manual Form, Right Side: Activity Logs */}
        <MuiGrid container spacing={3} sx={{ flex: 1, minHeight: 0, overflow: 'hidden', mb: 1 }}>
          {/* Left Column: Manual Form */}
          <MuiGrid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MuiCardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                {/* Tabs */}
                <MuiStack direction="row" spacing={2} sx={{ mb: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <MuiButton 
                    onClick={() => setActiveTab('log')}
                    sx={{ 
                      color: activeTab === 'log' ? 'var(--accent-primary)' : '#8D8D8D',
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
                      color: activeTab === 'forecast' ? 'var(--accent-primary)' : '#8D8D8D',
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
                    <MuiTypography variant="body2" sx={{ color: '#8D8D8D', mb: 2.5 }}>
                      Log custom amounts for Water, Sleep, Steps, Calories, or Workout. Daily limits apply.
                    </MuiTypography>

                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                      <MuiGrid container spacing={2}>
                        <MuiGrid size={{ xs: 12, sm: 6 }}>
                          <MuiFormControl fullWidth size="small">
                            <MuiInputLabel>Category</MuiInputLabel>
                            <MuiSelect
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

                      <MuiBox sx={{ flex: 1 }} />

                      <MuiButton
                        type="submit"
                        variant="contained"
                        disabled={submitting}
                        fullWidth
                        sx={{
                          bgcolor: 'var(--accent-primary)',
                          color: 'white',
                          py: 1.1,
                          borderRadius: '10px',
                          fontWeight: 600,
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: 'var(--accent-secondary)' }
                        }}
                      >
                        {submitting ? 'Saving Entry...' : `Save ${logType} Log`}
                      </MuiButton>
                    </form>
                  </>
                ) : (
                  <MuiStack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ flex: 1, minHeight: 0, mt: 1 }}>
                    {/* Left: Sliders */}
                    <MuiBox sx={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <MuiGrid container spacing={2}>
                        {/* Sleep Slider */}
                        <MuiGrid size={{ xs: 6 }}>
                          <MuiBox sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(156, 39, 176, 0.02)', border: '1px solid rgba(156, 39, 176, 0.08)' }}>
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#4A4A4A' }}>Sleep</MuiTypography>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#9C27B0' }}>{fcSleep}h</MuiTypography>
                            </MuiStack>
                            <MuiSlider
                              value={fcSleep}
                              min={0}
                              max={12}
                              step={0.5}
                              onChange={(_, val) => setFcSleep(val as number)}
                              sx={{ color: '#9C27B0', height: 3, py: 0.2, '& .MuiSlider-thumb': { width: 8, height: 8, backgroundColor: '#fff', border: '2px solid #9C27B0' } }}
                            />
                          </MuiBox>
                        </MuiGrid>

                        {/* Water Slider */}
                        <MuiGrid size={{ xs: 6 }}>
                          <MuiBox sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(33, 150, 243, 0.02)', border: '1px solid rgba(33, 150, 243, 0.08)' }}>
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#4A4A4A' }}>Water</MuiTypography>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#2196F3' }}>{fcWater}ml</MuiTypography>
                            </MuiStack>
                            <MuiSlider
                              value={fcWater}
                              min={0}
                              max={4000}
                              step={100}
                              onChange={(_, val) => setFcWater(val as number)}
                              sx={{ color: '#2196F3', height: 3, py: 0.2, '& .MuiSlider-thumb': { width: 8, height: 8, backgroundColor: '#fff', border: '2px solid #2196F3' } }}
                            />
                          </MuiBox>
                        </MuiGrid>

                        {/* Workout Slider */}
                        <MuiGrid size={{ xs: 6 }}>
                          <MuiBox sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(232, 90, 79, 0.02)', border: '1px solid rgba(232, 90, 79, 0.08)' }}>
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#4A4A4A' }}>Workout</MuiTypography>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: 'var(--accent-primary)' }}>{fcWorkout}m</MuiTypography>
                            </MuiStack>
                            <MuiSlider
                              value={fcWorkout}
                              min={0}
                              max={120}
                              step={5}
                              onChange={(_, val) => setFcWorkout(val as number)}
                              sx={{ color: 'var(--accent-primary)', height: 3, py: 0.2, '& .MuiSlider-thumb': { width: 8, height: 8, backgroundColor: '#fff', border: '2px solid var(--accent-primary)' } }}
                            />
                          </MuiBox>
                        </MuiGrid>

                        {/* Steps Slider */}
                        <MuiGrid size={{ xs: 6 }}>
                          <MuiBox sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(76, 175, 80, 0.02)', border: '1px solid rgba(76, 175, 80, 0.08)' }}>
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#4A4A4A' }}>Steps</MuiTypography>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#4CAF50' }}>{fcSteps.toLocaleString()}</MuiTypography>
                            </MuiStack>
                            <MuiSlider
                              value={fcSteps}
                              min={0}
                              max={20000}
                              step={500}
                              onChange={(_, val) => setFcSteps(val as number)}
                              sx={{ color: '#4CAF50', height: 3, py: 0.2, '& .MuiSlider-thumb': { width: 8, height: 8, backgroundColor: '#fff', border: '2px solid #4CAF50' } }}
                            />
                          </MuiBox>
                        </MuiGrid>

                        {/* Tasks Slider */}
                        <MuiGrid size={{ xs: 12 }}>
                          <MuiBox sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(255, 152, 0, 0.02)', border: '1px solid rgba(255, 152, 0, 0.08)' }}>
                            <MuiStack direction="row" sx={{ justifyContent: 'space-between', mb: 0.1, alignItems: 'center' }}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 700, fontSize: '11px', color: '#4A4A4A' }}>Pending Tasks</MuiTypography>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, fontSize: '11px', color: '#FF9800' }}>{fcTasks} tasks</MuiTypography>
                            </MuiStack>
                            <MuiSlider
                              value={fcTasks}
                              min={0}
                              max={10}
                              step={1}
                              onChange={(_, val) => setFcTasks(val as number)}
                              sx={{ color: '#FF9800', height: 3, py: 0.2, '& .MuiSlider-thumb': { width: 8, height: 8, backgroundColor: '#fff', border: '2px solid #FF9800' } }}
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
                            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.04) 0%, rgba(33, 150, 243, 0.04) 100%)', 
                            border: '1.5px solid rgba(156, 39, 176, 0.25)', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(156, 39, 176, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5
                          }}
                        >
                          <MuiStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <MuiStack spacing={0.2}>
                              <MuiTypography variant="caption" sx={{ fontWeight: 800, color: '#9C27B0', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Predicted score</MuiTypography>
                              <MuiTypography variant="caption" sx={{ color: '#8D8D8D', fontSize: '10px' }}>Compiled Wellness Outlook</MuiTypography>
                            </MuiStack>
                            <MuiBox 
                              sx={{ 
                                px: 1.5, 
                                py: 0.4, 
                                borderRadius: '20px', 
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
                                  fontSize: '15px'
                                }}
                              >
                                {forecastResult.forecastedLifeScore}
                              </MuiTypography>
                              <MuiTypography 
                                variant="caption" 
                                sx={{ 
                                  color: forecastResult.forecastedLifeScore >= 85 ? '#2E7D32' : forecastResult.forecastedLifeScore >= 70 ? '#EF6C00' : '#C62828',
                                  fontSize: '10px' 
                                }}
                              >
                                / 100
                              </MuiTypography>
                            </MuiBox>
                          </MuiStack>
                          
                          <MuiBox sx={{ bgcolor: 'var(--card-bg)', p: 1.2, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                            <MuiTypography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: '11.5px', lineHeight: 1.4 }}>
                              {forecastResult.healthRecommendation}
                            </MuiTypography>
                          </MuiBox>

                          <MuiTypography 
                            variant="caption" 
                            sx={{ 
                              color: '#8D8D8D', 
                              display: 'block', 
                              fontSize: '10px', 
                              borderTop: '1px dashed rgba(156, 39, 176, 0.2)', 
                              pt: 0.8, 
                              mt: 0.2
                            }}
                          >
                            ✨ Forecast derived from historical health logs
                          </MuiTypography>
                        </MuiBox>
                      ) : (
                        <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, border: '1px dashed rgba(0,0,0,0.1)', borderRadius: '12px', height: '100px' }}>
                          <MuiTypography variant="caption" sx={{ color: '#8D8D8D' }}>Loading Wellness Outlook...</MuiTypography>
                        </MuiBox>
                      )}
                    </MuiBox>
                  </MuiStack>
                )}
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>

          {/* Right Column: Activity Logs List */}
          <MuiGrid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <MuiCard sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <MuiCardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 3, overflow: 'hidden' }}>
                <MuiTypography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-primary)', flexShrink: 0 }}>
                  Today's Health Activity Logs
                </MuiTypography>

                {loading ? (
                  <LogoLoader />
                ) : logs.length === 0 ? (
                  <MuiBox sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D' }}>
                    <FitnessCenterIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <MuiTypography variant="body1">No logs registered today. Use the log controls above to record health metrics!</MuiTypography>
                  </MuiBox>
                ) : (
                  <MuiStack spacing={1} sx={{ overflowY: 'auto', flex: 1, pr: 1 }}>
                    {logs.map((l) => (
                      <MuiCard
                        key={l.id}
                        sx={{
                          flexShrink: 0,
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          borderLeft: `5px solid ${getLogColor(l.logType)}`,
                          bgcolor: 'var(--card-bg)',
                        }}
                      >
                        <MuiCardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '10px !important' }}>
                          <MuiStack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <MuiBox sx={{ bgcolor: `${getLogColor(l.logType)}12`, p: 1, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getLogTypeIcon(l.logType, 'small')}
                            </MuiBox>
                            <MuiBox>
                              <MuiTypography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {l.logType}: {l.logValue} {getUnit(l.logType) || 'ml'}
                              </MuiTypography>
                              <MuiTypography variant="caption" sx={{ color: '#8D8D8D', display: 'block', mt: 0.1 }}>
                                {l.details} • {parseDateSafe(l.logDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </MuiTypography>
                            </MuiBox>
                          </MuiStack>
                          <MuiIconButton onClick={() => handleDeleteLog(l.id)} size="small" sx={{ color: '#E85A4F', p: 0.5 }}>
                            <DeleteIcon fontSize="small" />
                          </MuiIconButton>
                        </MuiCardContent>
                      </MuiCard>
                    ))}
                  </MuiStack>
                )}
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>
        </MuiGrid>
      </MuiBox>
    </PageWrapper>
  );
};

export default Health;

