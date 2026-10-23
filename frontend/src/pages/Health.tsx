import React, { useState, useEffect, useCallback } from 'react';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageWrapper from '../components/PageWrapper';
import ReportExporter from '../components/ReportExporter';
import { TiltCard } from '../components/modern3d/TiltCard';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { 
  Box as MuiBox, 
  Typography as MuiTypography, 
  Button as MuiButton, 
  Alert as MuiAlert, 
  Stack as MuiStack, 
  LinearProgress as MuiLinearProgress
} from '@mui/material';
import { useNotification } from '../context/NotificationContext';
import { useThemeSystem } from '../context/ThemeContext';
import { WorkoutPlannerDashboard } from '../features/workouts/WorkoutPlannerDashboard';
import { HealthSettingsModal, type HealthTargets } from '../features/health/HealthSettingsModal';
import { HealthActivityHistoryModal, type HealthLogItem } from '../features/health/HealthActivityHistoryModal';
import { AddHealthLogModal } from '../features/health/AddHealthLogModal';
import { PredictAiModal } from '../features/health/PredictAiModal';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { ResetLayoutButton } from '../components/resizable/ResetLayoutButton';

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
  const { designSystem } = useThemeSystem();
  const isProf = designSystem === 'professional';

  const [logs, setLogs] = useState<HealthLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurable targets state
  const [targets, setTargets] = useState<HealthTargets>(DEFAULT_TARGETS);

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [predictAiOpen, setPredictAiOpen] = useState(false);
  const [workoutGeneratorOpen, setWorkoutGeneratorOpen] = useState(false);

  // Today's Totals
  const [todaysWater, setTodaysWater] = useState(0);
  const [todaysSleep, setTodaysSleep] = useState(0);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [todaysCalories, setTodaysCalories] = useState(0);
  const [todaysWorkout, setTodaysWorkout] = useState(0);

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
      console.error('Failed to load targets:', err);
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
      const msg = `Daily workout limit exceeded. Maximum 360 minutes per day (currently at ${todaysWorkout} mins).`;
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
        const unit = type === 'Water' ? 'ml' : type === 'Sleep' ? 'hours' : type === 'Steps' ? 'steps' : type === 'Calories' ? 'kcal' : 'mins';
        notify.success(`+${value} ${unit} added to today's ${type}!`, 'Log Updated');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Failed to log ${type}.`;
      showTemporaryError(errMsg);
      notify.error(errMsg, 'Quick Log Failed');
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
            ROW 1: UNIFIED HEADER ROW WITH CLEAR ACCESSIBLE ACTIONS
            ======================================================== */}
        <MuiStack 
          direction="row" 
          sx={{ 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 1.5, 
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
                Track hydration, sleep, steps, and nutrition or plan science-backed periodized AI workouts inside a single, unified health workspace.
              </MuiTypography>
            </MuiBox>
          </MuiStack>

          {/* Header Action Buttons */}
          <MuiStack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.8 }}>
            <MuiButton
              size="small"
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: '15px !important' }} />}
              onClick={() => setAddLogOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '9px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 700,
                bgcolor: 'var(--accent-primary)',
                color: '#ffffff',
                px: 1.5,
                py: 0.6,
                boxShadow: isProf ? 'none' : '0 2px 8px rgba(255, 111, 38, 0.3)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' }
              }}
            >
              Add Health Log
            </MuiButton>

            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: '15px !important', color: '#9C27B0' }} />}
              onClick={() => setPredictAiOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '9px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: 'rgba(156, 39, 176, 0.35)',
                color: '#9C27B0',
                px: 1.4,
                py: 0.6,
                '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.08)', borderColor: '#9C27B0' }
              }}
            >
              Predict AI
            </MuiButton>

            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<FitnessCenterIcon sx={{ fontSize: '15px !important', color: 'var(--accent-primary)' }} />}
              onClick={() => setWorkoutGeneratorOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '9px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: 'rgba(255, 111, 38, 0.35)',
                color: 'var(--accent-primary)',
                px: 1.4,
                py: 0.6,
                '&:hover': { bgcolor: 'rgba(255, 111, 38, 0.08)', borderColor: 'var(--accent-primary)' }
              }}
            >
              Generate Plan
            </MuiButton>

            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<HistoryIcon sx={{ fontSize: '15px !important' }} />}
              onClick={() => setHistoryModalOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '9px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: isProf ? 'var(--card-border)' : 'rgba(0,0,0,0.12)',
                color: 'var(--text-primary)',
                px: 1.4,
                py: 0.6,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
              }}
            >
              Health Log
            </MuiButton>

            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<TuneIcon sx={{ fontSize: '15px !important' }} />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                borderRadius: isProf ? '0px !important' : '9px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 650,
                borderColor: isProf ? 'var(--card-border)' : 'rgba(0,0,0,0.12)',
                color: 'var(--text-primary)',
                px: 1.4,
                py: 0.6,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
              }}
            >
              Health Settings
            </MuiButton>

            <ReportExporter module="Health" />

            <ResetLayoutButton pageId="health" pageName="Health" />
          </MuiStack>
        </MuiStack>

        {error && (
          <MuiAlert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: '10px', flexShrink: 0 }}>
            {error}
          </MuiAlert>
        )}

        {/* ========================================================
            ROW 2: COMPACT 5-METRIC OVERVIEW ROW (Modern 3D, Resizable)
            Always visible in the unified workspace
            ======================================================== */}
        <ResizablePanel
          pageId="health"
          componentId="health-overview-metrics-row"
          defaultHeight={130}
          minHeight={110}
          maxHeight={220}
          sx={{ mb: 2, flexShrink: 0 }}
        >
          <MuiBox
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)'
              },
              gap: 1.5,
              height: '100%'
            }}
          >
            {/* Card 1: Water Intake */}
            <TiltCard
              maxTilt={2.5}
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
                <MuiStack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                  <LocalDrinkIcon sx={{ color: '#2196F3', fontSize: 16 }} />
                  <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10.5px' }}>
                    Water Intake
                  </MuiTypography>
                </MuiStack>
                <MuiTypography variant="subtitle1" sx={{ fontWeight: 800, color: '#2196F3', lineHeight: 1.1 }}>
                  {todaysWater}{' '}
                  <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px' }}>
                    / {targets.dailyWaterGoal} ml
                  </MuiTypography>
                </MuiTypography>
                <MuiLinearProgress
                  variant="determinate"
                  value={waterProgress}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? 0 : 3,
                    my: 0.8,
                    bgcolor: 'rgba(33, 150, 243, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#2196F3', borderRadius: isProf ? 0 : 3 }
                  }}
                />
                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {waterProgress.toFixed(0)}% daily goal
                </MuiTypography>
              </MuiBox>

              <MuiStack direction="row" spacing={0.5} sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.4 }}>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 250, 'Cup of water')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+250</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 500, 'Bottle of water')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+500</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 750, 'Large bottle')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+750</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Water', 1000, 'One Liter')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(33, 150, 243, 0.4)', color: '#2196F3' }}>+1k</MuiButton>
              </MuiStack>
            </TiltCard>

            {/* Card 2: Sleep Duration */}
            <TiltCard
              maxTilt={2.5}
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
                <MuiStack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                  <BedtimeIcon sx={{ color: '#9C27B0', fontSize: 16 }} />
                  <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10.5px' }}>
                    Sleep Duration
                  </MuiTypography>
                </MuiStack>
                <MuiTypography variant="subtitle1" sx={{ fontWeight: 800, color: '#9C27B0', lineHeight: 1.1 }}>
                  {todaysSleep}{' '}
                  <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px' }}>
                    / {targets.dailySleepGoal} hours
                  </MuiTypography>
                </MuiTypography>
                <MuiLinearProgress
                  variant="determinate"
                  value={sleepProgress}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? 0 : 3,
                    my: 0.8,
                    bgcolor: 'rgba(156, 39, 176, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#9C27B0', borderRadius: isProf ? 0 : 3 }
                  }}
                />
                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {sleepProgress.toFixed(0)}% daily goal
                </MuiTypography>
              </MuiBox>

              <MuiStack direction="row" spacing={0.5} sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.4 }}>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 1, 'Quick nap')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+1h</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 2, 'Rest update')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+2h</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 6, 'Short sleep')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+6h</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Sleep', 8, 'Full night sleep')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(156, 39, 176, 0.4)', color: '#9C27B0' }}>+8h</MuiButton>
              </MuiStack>
            </TiltCard>

            {/* Card 3: Steps Walked */}
            <TiltCard
              maxTilt={2.5}
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
                <MuiStack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                  <DirectionsWalkIcon sx={{ color: '#4CAF50', fontSize: 16 }} />
                  <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10.5px' }}>
                    Steps Walked
                  </MuiTypography>
                </MuiStack>
                <MuiTypography variant="subtitle1" sx={{ fontWeight: 800, color: '#4CAF50', lineHeight: 1.1 }}>
                  {todaysSteps.toLocaleString()}{' '}
                  <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px' }}>
                    / {targets.dailyStepsGoal.toLocaleString()}
                  </MuiTypography>
                </MuiTypography>
                <MuiLinearProgress
                  variant="determinate"
                  value={stepsProgress}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? 0 : 3,
                    my: 0.8,
                    bgcolor: 'rgba(76, 175, 80, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50', borderRadius: isProf ? 0 : 3 }
                  }}
                />
                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {stepsProgress.toFixed(0)}% daily goal
                </MuiTypography>
              </MuiBox>

              <MuiStack direction="row" spacing={0.5} sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.4 }}>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 1000, 'Walk')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+1k</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 2000, 'Walk')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+2k</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 5000, 'Jog/Run')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+5k</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Steps', 10000, 'Daily steps')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(76, 175, 80, 0.4)', color: '#4CAF50' }}>+10k</MuiButton>
              </MuiStack>
            </TiltCard>

            {/* Card 4: Calories Intake */}
            <TiltCard
              maxTilt={2.5}
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
                <MuiStack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                  <RestaurantIcon sx={{ color: '#FF9800', fontSize: 16 }} />
                  <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10.5px' }}>
                    Calories Intake
                  </MuiTypography>
                </MuiStack>
                <MuiTypography variant="subtitle1" sx={{ fontWeight: 800, color: '#FF9800', lineHeight: 1.1 }}>
                  {todaysCalories}{' '}
                  <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px' }}>
                    / {targets.dailyCalorieGoal} kcal
                  </MuiTypography>
                </MuiTypography>
                <MuiLinearProgress
                  variant="determinate"
                  value={caloriesProgress}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? 0 : 3,
                    my: 0.8,
                    bgcolor: 'rgba(255, 152, 0, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#FF9800', borderRadius: isProf ? 0 : 3 }
                  }}
                />
                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {caloriesProgress.toFixed(0)}% daily limit
                </MuiTypography>
              </MuiBox>

              <MuiStack direction="row" spacing={0.5} sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.4 }}>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 250, 'Light snack')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+250</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 500, 'Regular meal')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+500</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 750, 'Large meal')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+750</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Calories', 1000, 'Heavy food')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 152, 0, 0.4)', color: '#FF9800' }}>+1k</MuiButton>
              </MuiStack>
            </TiltCard>

            {/* Card 5: Workout Duration */}
            <TiltCard
              maxTilt={2.5}
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
                <MuiStack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                  <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: 16 }} />
                  <MuiTypography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '10.5px' }}>
                    Workout Duration
                  </MuiTypography>
                </MuiStack>
                <MuiTypography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1.1 }}>
                  {todaysWorkout}{' '}
                  <MuiTypography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '11px' }}>
                    / {targets.dailyWorkoutGoal} mins
                  </MuiTypography>
                </MuiTypography>
                <MuiLinearProgress
                  variant="determinate"
                  value={workoutProgress}
                  sx={{
                    height: 5,
                    borderRadius: isProf ? 0 : 3,
                    my: 0.8,
                    bgcolor: 'rgba(255, 111, 38, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-primary)', borderRadius: isProf ? 0 : 3 }
                  }}
                />
                <MuiTypography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {workoutProgress.toFixed(0)}% daily goal
                </MuiTypography>
              </MuiBox>

              <MuiStack direction="row" spacing={0.5} sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.4 }}>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 15, 'Cardio')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+15</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 30, 'Gym routine')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+30</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 45, 'Weight lifting')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+45</MuiButton>
                <MuiButton size="small" variant="outlined" onClick={() => handleQuickAdd('Workout', 60, 'Full exercise burn')} sx={{ minWidth: 0, py: '1px', px: '5px', fontSize: '9px', textTransform: 'none', borderRadius: isProf ? 0 : '4px', borderColor: 'rgba(255, 111, 38, 0.4)', color: 'var(--accent-primary)' }}>+60</MuiButton>
              </MuiStack>
            </TiltCard>
          </MuiBox>
        </ResizablePanel>

        {/* ========================================================
            ROW 3: COHESIVE MAIN WORKSPACE (Weekly Workout Planner, Focus & Tips)
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
          <WorkoutPlannerDashboard 
            onWorkoutChanged={fetchHealthLogs}
            openAiGeneratorExternal={workoutGeneratorOpen}
            onCloseAiGeneratorExternal={() => setWorkoutGeneratorOpen(false)}
          />
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
            setWorkoutGeneratorOpen(true);
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

        {/* Add Health Log Quick Modal */}
        <AddHealthLogModal
          open={addLogOpen}
          onClose={() => setAddLogOpen(false)}
          onLogAdded={fetchHealthLogs}
          currentTotals={{
            water: todaysWater,
            sleep: todaysSleep,
            steps: todaysSteps,
            calories: todaysCalories,
            workout: todaysWorkout
          }}
        />

        {/* Predict AI Simulation Modal */}
        <PredictAiModal
          open={predictAiOpen}
          onClose={() => setPredictAiOpen(false)}
        />
      </MuiBox>
    </PageWrapper>
  );
};

export default Health;
