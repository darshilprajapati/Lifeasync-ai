import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  CardContent,
  Button,
  Stack,
  Alert,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  IconButton
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import { motion } from 'framer-motion';
import { cardVariants, containerVariants } from '../animations';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useThemeSystem } from '../context/ThemeContext';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import LifeScoreCompetitionCard from '../components/LifeScoreCompetitionCard';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { ResetLayoutButton } from '../components/resizable/ResetLayoutButton';
import { formatINR } from '../utils/formatters';

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

interface PlannerEvent {
  id: number;
  isCompleted: boolean;
  startTime: string;
  endTime: string;
  completedAt?: string;
  missedDeadlinePenalized?: boolean;
}

interface HealthLog {
  id: number;
  logType: string;
  logValue: number;
  logDate: string;
}

interface HistoricalScore {
  date: string;
  score: number;
  penaltyPoints: number;
  missedDeadlinesCount: number;
  totalTasks: number;
  completedTasks: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todaysWater, setTodaysWater] = useState(0);
  const [todaysSleep, setTodaysSleep] = useState(0);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [todaysCalories, setTodaysCalories] = useState(0);
  const [todaysWorkout, setTodaysWorkout] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  // Life Score & Penalty State
  const [lifeScore, setLifeScore] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [missedDeadlinesCount, setMissedDeadlinesCount] = useState(0);
  const [penaltyNotice, setPenaltyNotice] = useState<string | null>(null);
  const [historicalScores, setHistoricalScores] = useState<HistoricalScore[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();

      // Trigger parallel API loading including backend LifeScore calculations
      const [finRes, healthRes, plannerRes, scoreRes, historyRes] = await Promise.all([
        apiClient.get('/api/finance/summary').catch(() => null),
        apiClient.get('/api/health').catch(() => null),
        apiClient.get('/api/planner').catch(() => null),
        apiClient.get('/api/lifescore/today').catch(() => null),
        apiClient.get('/api/lifescore/history?days=7').catch(() => null),
      ]);

      // 1. Finance
      let currentBalance = 0;
      if (finRes && finRes.data.isSuccess) {
        currentBalance = finRes.data.data.balance;
        setBalance(currentBalance);
      }

      // 2. Health & Wellness Metrics
      let waterSum = 0;
      let sleepSum = 0;
      let stepsSum = 0;
      let caloriesSum = 0;
      let workoutSum = 0;
      if (healthRes && healthRes.data.isSuccess) {
        const logs = healthRes.data.data as HealthLog[];
        waterSum = logs
          .filter((l) => l.logType === 'Water' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, curr) => sum + curr.logValue, 0);
        setTodaysWater(waterSum);

        sleepSum = logs
          .filter((l) => l.logType === 'Sleep' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, curr) => sum + curr.logValue, 0);
        setTodaysSleep(sleepSum);

        stepsSum = logs
          .filter((l) => l.logType === 'Steps' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, curr) => sum + curr.logValue, 0);
        setTodaysSteps(stepsSum);

        caloriesSum = logs
          .filter((l) => l.logType === 'Calories' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, curr) => sum + curr.logValue, 0);
        setTodaysCalories(caloriesSum);

        workoutSum = logs
          .filter((l) => l.logType === 'Workout' && isSameDay(parseDateSafe(l.logDate), today))
          .reduce((sum, curr) => sum + curr.logValue, 0);
        setTodaysWorkout(workoutSum);
      }

      // 3. Planner
      let completedCount = 0;
      let totalCount = 0;
      let missedCount = 0;
      if (plannerRes && plannerRes.data.isSuccess) {
        const events = plannerRes.data.data as PlannerEvent[];
        const todayTasks = events.filter((e) => isSameDay(parseDateSafe(e.endTime || e.startTime), today));
        totalCount = todayTasks.length;
        completedCount = todayTasks.filter((e) => e.isCompleted).length;
        missedCount = todayTasks.filter((e) => {
          if (e.missedDeadlinePenalized) return true;
          if (new Date() > new Date(e.endTime)) {
            return !e.isCompleted || (e.completedAt && new Date(e.completedAt) > new Date(e.endTime));
          }
          return false;
        }).length;

        setCompletedTasks(completedCount);
        setTotalTasks(totalCount);
      }

      // 4. Insights
      // Insights can be retrieved on AI Insights module

      // 5. Life Score Calculation (Server authority first, client fallback)
      if (scoreRes && scoreRes.data.isSuccess && scoreRes.data.data) {
        const data = scoreRes.data.data;
        setLifeScore(data.finalScore);
        setPenaltyPoints(data.penaltyPoints);
        setMissedDeadlinesCount(data.missedDeadlinesCount);
        setPenaltyNotice(data.penaltyNotice);
      } else {
        // Deterministic client fallback strictly adhering to the same rules
        let score = 0;
        const hasWater = waterSum > 0;
        const hasSleep = sleepSum > 0;
        const hasSteps = stepsSum > 0;
        const hasCalories = caloriesSum > 0;
        const hasWorkout = workoutSum > 0;

        if (totalCount > 0 || hasWater || hasSleep || hasSteps || hasCalories || hasWorkout) {
          score += 5;
        }

        if (totalCount > 0) {
          score += (completedCount / totalCount) * 15;
        }

        score += Math.min(30, (waterSum / 2000) * 30);
        score += Math.min(15, (workoutSum / 30) * 15);
        score += Math.min(10, (sleepSum / 8) * 10);
        score += Math.min(10, (stepsSum / 10000) * 10);
        score += caloriesSum > 0 ? 10 : 0;

        if (currentBalance > 0) {
          score += 5;
        } else if (currentBalance < 0) {
          score -= 5;
        }

        const positive = Math.max(0, Math.min(100, score));
        const penalty = missedCount * 2;
        const finalCalculated = Math.max(0, positive - penalty);

        setLifeScore(finalCalculated);
        setPenaltyPoints(penalty);
        setMissedDeadlinesCount(missedCount);
        if (penalty > 0) {
          setPenaltyNotice(`A missed deadline resulted in a permanent -${penalty} pt deduction for today.`);
        } else {
          setPenaltyNotice(null);
        }
      }

      // 6. Historical Scores
      if (historyRes && historyRes.data.isSuccess && historyRes.data.data) {
        setHistoricalScores(historyRes.data.data);
      }
      setSelectedDate(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSync = () => {
      fetchDashboardData();
    };

    window.addEventListener('lifesync:score-updated', handleSync);
    window.addEventListener('lifesync:finance-updated', handleSync);
    window.addEventListener('lifesync:health-updated', handleSync);
    window.addEventListener('lifesync:task-updated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('lifesync:score-updated', handleSync);
      window.removeEventListener('lifesync:finance-updated', handleSync);
      window.removeEventListener('lifesync:health-updated', handleSync);
      window.removeEventListener('lifesync:task-updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleSelectHistoryDate = async (dateStr: string) => {
    try {
      setLoading(true);
      setSelectedDate(dateStr);
      const res = await apiClient.get(`/api/lifescore?date=${dateStr}`);
      if (res.data.isSuccess && res.data.data) {
        const d = res.data.data;
        setLifeScore(d.finalScore);
        setPenaltyPoints(d.penaltyPoints);
        setMissedDeadlinesCount(d.missedDeadlinesCount);
        setPenaltyNotice(d.penaltyNotice);
      }
    } catch (err) {
      console.error('Failed to load historical score for date:', err);
    } finally {
      setLoading(false);
    }
  };

  // Greeting helper based on time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good Morning';
    if (hr >= 12 && hr < 17) return 'Good Afternoon';
    if (hr >= 17 && hr < 22) return 'Good Evening';
    return 'Good Night';
  };

  const renderLifeScoreFeedback = () => {
    const isWaterGoalMet = todaysWater >= 2000;
    const isTasksGoalMet = totalTasks > 0 ? completedTasks === totalTasks : true;
    const hasPositiveBalance = balance > 0;

    interface BoostItem {
      label: string;
      current: string;
      remainingPoints: number;
      icon: React.ReactNode;
    }

    const boosts: BoostItem[] = [];

    const waterRem = 30 - Math.min(30, (todaysWater / 2000) * 30);
    if (waterRem > 0) {
      boosts.push({
        label: 'Water Intake',
        current: `${todaysWater}/2000 ml`,
        remainingPoints: waterRem,
        icon: <LocalDrinkIcon sx={{ color: '#00BCD4', fontSize: '16px' }} />
      });
    }

    const sleepRem = 10 - Math.min(10, (todaysSleep / 8) * 10);
    if (sleepRem > 0) {
      boosts.push({
        label: 'Sleep Duration',
        current: `${todaysSleep}/8 hours`,
        remainingPoints: sleepRem,
        icon: <HealthAndSafetyIcon sx={{ color: '#9C27B0', fontSize: '16px' }} />
      });
    }

    const stepsRem = 10 - Math.min(10, (todaysSteps / 10000) * 10);
    if (stepsRem > 0) {
      boosts.push({
        label: 'Steps Walked',
        current: `${todaysSteps.toLocaleString()}/10000 steps`,
        remainingPoints: stepsRem,
        icon: <HealthAndSafetyIcon sx={{ color: '#4CAF50', fontSize: '16px' }} />
      });
    }

    const caloriesRem = todaysCalories > 0 ? 0 : 10;
    if (caloriesRem > 0) {
      boosts.push({
        label: 'Calories Intake',
        current: `${todaysCalories}/2000 kcal`,
        remainingPoints: caloriesRem,
        icon: <HealthAndSafetyIcon sx={{ color: '#FF9800', fontSize: '16px' }} />
      });
    }

    const workoutRem = 15 - Math.min(15, (todaysWorkout / 30) * 15);
    if (workoutRem > 0) {
      boosts.push({
        label: 'Workout Session',
        current: `${todaysWorkout}/30 mins`,
        remainingPoints: workoutRem,
        icon: <HealthAndSafetyIcon sx={{ color: 'var(--accent-primary)', fontSize: '16px' }} />
      });
    }

    const tasksRem = totalTasks === 0 ? 15 : (15 - (completedTasks / totalTasks) * 15);
    if (tasksRem > 0) {
      boosts.push({
        label: 'Planner Tasks',
        current: totalTasks === 0 ? 'No tasks today' : `${completedTasks}/${totalTasks} completed`,
        remainingPoints: tasksRem,
        icon: <EventAvailableIcon sx={{ color: '#2196F3', fontSize: '16px' }} />
      });
    }

    const financeRem = hasPositiveBalance ? 0 : 5;
    if (financeRem > 0) {
      boosts.push({
        label: 'Finance Balance',
        current: `Net balance: ${formatINR(balance)}`,
        remainingPoints: financeRem,
        icon: <AccountBalanceWalletIcon sx={{ color: balance >= 0 ? '#4CAF50' : '#E85A4F', fontSize: '16px' }} />
      });
    }

    const heading = lifeScore >= 90
      ? 'Exceptional routine! Maintain this streak!'
      : (isWaterGoalMet && isTasksGoalMet && lifeScore > 0)
      ? 'Core goals achieved! Exceptional routine today.'
      : lifeScore >= 60
      ? 'Healthy momentum. Keep pushing forward!'
      : 'A fresh day starts at zero. Log your habits to build your score.';

    return (
      <Stack spacing={1.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
          {heading}
        </Typography>

        {/* Permanent Missed-Deadline Penalty Notice */}
        {penaltyPoints > 0 && (
          <Alert
            severity="error"
            icon={<WarningAmberIcon />}
            sx={{
              borderRadius: '12px',
              fontSize: '12.5px',
              border: '1px solid #fecaca',
              bgcolor: 'rgba(239, 68, 68, 0.05)',
              color: '#991b1b',
              mb: 1
            }}
          >
            <strong>Missed Deadline Penalty (−{penaltyPoints} pts):</strong>{' '}
            {penaltyNotice || `Deducted for ${missedDeadlinesCount} missed task deadline(s). This deduction is permanent for today's score. Focus on your remaining tasks to build consistency for tomorrow!`}
          </Alert>
        )}

        {boosts.length > 0 && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, mb: 1, display: 'block' }}>
              Potential Points to Elevate Today's Score:
            </Typography>
            <Stack spacing={1} sx={{ overflowY: 'auto', maxHeight: '140px', pr: 0.5 }}>
              {boosts.map((boost, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.2,
                    borderRadius: isProf ? '0px !important' : '10px',
                    bgcolor: isProf ? 'var(--card-bg)' : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-secondary)'),
                    border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(255, 111, 38, 0.12)'
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {boost.icon}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                        {boost.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        {boost.current}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '11px' }}>
                    +{boost.remainingPoints.toFixed(1)} pts
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* 7-Day Historical Scores Pill Selector */}
        {historicalScores.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <HistoryIcon sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.5 }} />
                  7-Day Score History
                </Typography>
                {historicalScores.length < 7 && (
                  <Chip
                    size="small"
                    label={`${historicalScores.length}/7 Unlocked`}
                    sx={{
                      height: '18px',
                      fontSize: '10px',
                      fontWeight: 700,
                      bgcolor: 'rgba(255, 99, 71, 0.12)',
                      color: 'var(--accent-primary)',
                      borderRadius: isProf ? '0px !important' : '6px'
                    }}
                  />
                )}
              </Stack>
              {selectedDate && (
                <Button size="small" onClick={fetchDashboardData} sx={{ fontSize: '11px', textTransform: 'none', py: 0, borderRadius: isProf ? '0px !important' : '6px' }}>
                  Back to Today
                </Button>
              )}
            </Stack>

            {historicalScores.length <= 1 && (
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', mb: 1, fontStyle: 'italic' }}>
                Score history unlocks day-by-day as you build consistency. Complete habits to unlock Day 2 tomorrow!
              </Typography>
            )}

            <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', pb: 0.5 }}>
              {/* Unlocked Days */}
              {historicalScores.map((h) => {
                const isSelected = selectedDate === h.date || (!selectedDate && h.date === new Date().toISOString().split('T')[0]);
                const isToday = h.date === new Date().toISOString().split('T')[0];
                const dayLabel = h.date.slice(5); // e.g. "10-14"

                return (
                  <Tooltip key={h.date} title={`${h.date}: Score ${Math.round(h.score)}/100 ${h.penaltyPoints > 0 ? `(-${h.penaltyPoints} penalty)` : ''}`} arrow>
                    <Chip
                      size="small"
                      label={`${dayLabel}: ${Math.round(h.score)}${isToday ? ' (Today)' : ''}`}
                      color={isSelected ? 'primary' : h.penaltyPoints > 0 ? 'error' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => handleSelectHistoryDate(h.date)}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: '24px',
                        borderRadius: isProf ? '0px !important' : '8px',
                        borderWidth: isSelected ? 2 : 1
                      }}
                    />
                  </Tooltip>
                );
              })}

              {/* Locked Future Days for New Users */}
              {Array.from({ length: Math.max(0, 7 - historicalScores.length) }).map((_, idx) => {
                const dayNum = historicalScores.length + idx + 1;
                return (
                  <Tooltip key={`locked-${idx}`} title={`Day ${dayNum} unlocks automatically as you continue tracking habits daily`} arrow>
                    <Chip
                      size="small"
                      icon={<LockIcon sx={{ fontSize: '11px !important', color: 'var(--text-secondary)' }} />}
                      label={`Day ${dayNum}`}
                      variant="outlined"
                      disabled
                      sx={{
                        opacity: 0.45,
                        fontSize: '10.5px',
                        height: '24px',
                        borderRadius: isProf ? '0px !important' : '8px',
                        borderStyle: 'dashed',
                        borderColor: 'rgba(150, 150, 150, 0.3)',
                        cursor: 'not-allowed',
                        '& .MuiChip-label': { color: 'var(--text-secondary)' }
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', sm: '20px', md: '24px' }, height: '100%', overflowY: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: { xs: 2.5, md: 4 }, gap: 1.5 }}
        >
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
              {getGreeting()}, {user?.fullName || 'User'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              {selectedDate ? `Reviewing historical performance for ${selectedDate}.` : 'Here is your daily habit intelligence and Life Score for today.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ResetLayoutButton pageId="dashboard" pageName="Dashboard" />
            <IconSlideButton
              variant="outlined"
              onClick={fetchDashboardData}
              startIcon={<RefreshIcon />}
              sx={{
                borderRadius: isProf ? '0px !important' : '12px',
                borderColor: isProf ? 'var(--card-border)' : 'rgba(232, 90, 79, 0.4)',
                color: 'var(--accent-primary)',
                fontWeight: 650,
                px: 2,
                py: 0.8,
                fontSize: { xs: '12px', sm: '14px' },
                bgcolor: 'var(--card-bg)',
                '&:hover': {
                  bgcolor: isProf ? 'var(--hover-bg, rgba(0,0,0,0.04))' : 'rgba(232, 90, 79, 0.08)',
                  borderColor: 'var(--accent-primary)'
                }
              }}
            >
              Refresh
            </IconSlideButton>
            <ReportExporter module="All" buttonVariant="contained" buttonColor="primary" />
          </Stack>
        </Stack>

        {loading ? (
          <LogoLoader />
        ) : isMobile ? (
          /* Mobile View matching Reference Image 2 */
          <Stack spacing={2} sx={{ pb: 3 }}>
            {/* 1. Neon Circular Ring Life Score Card */}
            <TiltCard
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: isProf ? 0 : '24px',
                background: isProf
                  ? 'var(--card-bg)'
                  : isDark
                  ? 'radial-gradient(circle at 50% 40%, rgba(255, 99, 71, 0.15) 0%, rgba(20, 16, 28, 0.9) 70%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(255, 120, 100, 0.15) 0%, rgba(255, 255, 255, 0.95) 75%)',
                boxShadow: isProf ? 'none' : isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 10px 30px rgba(232, 90, 79, 0.12)'
              }}
            >
              {/* Circular SVG Gauge */}
              <Box sx={{ position: 'relative', width: 170, height: 170, my: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="scoreNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFA07A" />
                      <stop offset="50%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#E85A4F" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <circle
                    cx="85"
                    cy="85"
                    r="68"
                    stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress Arc */}
                  <circle
                    cx="85"
                    cy="85"
                    r="68"
                    stroke="url(#scoreNeonGrad)"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={2 * Math.PI * 68 - (Math.min(100, Math.max(0, lifeScore)) / 100) * (2 * Math.PI * 68)}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      transition: 'stroke-dashoffset 1s ease-in-out',
                      filter: isProf ? 'none' : 'drop-shadow(0 0 6px rgba(255, 107, 107, 0.6))'
                    }}
                  />
                </svg>

                {/* Inner Content */}
                <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <FavoriteIcon sx={{ color: penaltyPoints > 0 ? '#ef4444' : '#E85A4F', fontSize: '26px', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Life Score
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', mt: 0.2 }}>
                    {lifeScore.toFixed(1)} / 100
                  </Typography>
                </Box>
              </Box>

              {penaltyPoints > 0 && (
                <Chip
                  size="small"
                  label={`−${penaltyPoints} pts penalty`}
                  color="error"
                  sx={{ mt: 1, height: '22px', fontSize: '11px', fontWeight: 700, borderRadius: isProf ? '0px !important' : '6px' }}
                />
              )}
            </TiltCard>

            {/* 2. 3 Compact Metric Cards in a Row (Balance, Water, Tasks) matching Reference Image 2 */}
            <Grid container spacing={1.5}>
              {/* Balance */}
              <Grid size={{ xs: 4 }}>
                <TiltCard
                  sx={{
                    p: 1.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: isProf ? 0 : '18px'
                  }}
                  onClick={() => navigate('/finance')}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(232, 90, 79, 0.12)',
                      color: '#E85A4F',
                      mb: 1
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ fontSize: '20px' }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 750, color: balance >= 0 ? 'var(--text-primary)' : '#E85A4F', fontSize: '13px', lineHeight: 1.2 }}>
                    {formatINR(balance)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', mt: 0.5 }}>
                    Balance
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Water */}
              <Grid size={{ xs: 4 }}>
                <TiltCard
                  sx={{
                    p: 1.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: isProf ? 0 : '18px'
                  }}
                  onClick={() => navigate('/health')}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 188, 212, 0.12)',
                      color: '#00BCD4',
                      mb: 1
                    }}
                  >
                    <LocalDrinkIcon sx={{ fontSize: '20px' }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.2 }}>
                    {todaysWater} ml
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', mt: 0.5 }}>
                    Water
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Tasks */}
              <Grid size={{ xs: 4 }}>
                <TiltCard
                  sx={{
                    p: 1.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: isProf ? 0 : '18px'
                  }}
                  onClick={() => navigate('/planner')}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(124, 58, 237, 0.12)',
                      color: '#7C3AED',
                      mb: 1
                    }}
                  >
                    <CheckBoxOutlinedIcon sx={{ fontSize: '20px' }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.2 }}>
                    {completedTasks} / {totalTasks}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', mt: 0.5 }}>
                    Tasks
                  </Typography>
                </TiltCard>
              </Grid>
            </Grid>

            {/* 3. LifeSync Arena Mobile Banner Card matching Reference Image 2 */}
            <TiltCard
              sx={{
                p: 2,
                borderRadius: isProf ? 0 : '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => {
                const el = document.getElementById('leaderboard-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: isProf ? 0 : '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(232, 90, 79, 0.25) 100%)',
                    color: '#E85A4F'
                  }}
                >
                  <EmojiEventsIcon sx={{ fontSize: '24px' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 750, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    LifeSync Arena
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                    Complete your location to join.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontSize: '10.5px', fontWeight: 600 }}>
                    City • State • Country
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: '#E85A4F',
                  color: '#fff',
                  '&:hover': { bgcolor: '#d2483d' }
                }}
              >
                <ArrowForwardIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </TiltCard>

            {/* 4. Score Feedback & 7-Day History */}
            <TiltCard sx={{ p: 2, borderRadius: isProf ? 0 : '20px' }}>
              {renderLifeScoreFeedback()}
            </TiltCard>

            {/* 5. LifeScore Competition Leaderboard */}
            <Box id="leaderboard-section">
              <LifeScoreCompetitionCard />
            </Box>
          </Stack>
        ) : (
          /* Desktop & Tablet Expanded View */
          <motion.div variants={containerVariants} initial="initial" animate="animate">
            <Grid container spacing={3}>
              {/* Card 1: Life Score Card */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <TiltCard
                    sx={{
                      position: 'relative',
                      color: 'var(--text-primary)',
                      height: '100%',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {!isProf && (
                      <>
                        <Box sx={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          bottom: '8px',
                          width: '4px',
                          background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
                          borderRadius: '2px',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 65%)',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }} />
                      </>
                    )}

                    <Box sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.max(12, Math.min(100, lifeScore))}%`,
                      background: penaltyPoints > 0
                        ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.4) 0%, rgba(185, 28, 28, 0.2) 100%)'
                        : 'linear-gradient(180deg, rgba(232, 90, 79, 0.35) 0%, rgba(183, 28, 28, 0.18) 100%)',
                      transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 1,
                      overflow: 'hidden',
                    }} />

                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, zIndex: 2, position: 'relative' }}>
                      <FavoriteIcon sx={{ color: penaltyPoints > 0 ? '#ef4444' : '#E85A4F', fontSize: '32px', mb: 1.5 }} />
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', mb: 0.5 }}>
                        {selectedDate ? `Life Score (${selectedDate})` : 'Daily Life Score'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', textShadow: isDark ? 'none' : '0 1px 2px rgba(255,255,255,0.8)' }}>
                        {lifeScore.toFixed(1)} / 100
                      </Typography>

                      {penaltyPoints > 0 && (
                        <Tooltip title="Missed deadlines result in an unrecoverable -2 penalty for this day." arrow>
                          <Chip
                            size="small"
                            label={`−${penaltyPoints} pts penalty`}
                            color="error"
                            sx={{ mt: 1, height: '22px', fontSize: '11px', fontWeight: 700, borderRadius: isProf ? '0px !important' : '6px' }}
                          />
                        </Tooltip>
                      )}
                    </CardContent>
                  </TiltCard>
                </motion.div>
              </Grid>

              {/* Card 2: Net Balance */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <TiltCard
                    sx={{ height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate('/finance')}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <AccountBalanceWalletIcon sx={{ color: '#E85A4F', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>Net Balance</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: balance >= 0 ? '#10B981' : '#E85A4F' }}>
                        {formatINR(balance)}
                      </Typography>
                    </CardContent>
                  </TiltCard>
                </motion.div>
              </Grid>

              {/* Card 3: Hydration Score */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <TiltCard
                    sx={{ height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate('/health')}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <LocalDrinkIcon sx={{ color: '#00BCD4', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>Today's Water</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {todaysWater} / 2000 ml
                      </Typography>
                    </CardContent>
                  </TiltCard>
                </motion.div>
              </Grid>

              {/* Card 4: Planner Tasks */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <TiltCard
                    sx={{ height: '100%', cursor: 'pointer' }}
                    onClick={() => navigate('/planner')}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <EventAvailableIcon sx={{ color: '#4A90E2', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>Today's Tasks</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {completedTasks} / {totalTasks}
                      </Typography>
                      {missedDeadlinesCount > 0 && (
                        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600, mt: 0.5 }}>
                          {missedDeadlinesCount} missed
                        </Typography>
                      )}
                    </CardContent>
                  </TiltCard>
                </motion.div>
              </Grid>

              {/* Row 2: Life Score Competition Leaderboard and Score Feedback split */}
              <Grid size={{ xs: 12, md: 8 }}>
                <ResizablePanel pageId="dashboard" componentId="competition_card" defaultHeight={420} minHeight={300} maxHeight={750}>
                  <motion.div variants={cardVariants} style={{ height: '100%' }}>
                    <LifeScoreCompetitionCard />
                  </motion.div>
                </ResizablePanel>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <ResizablePanel pageId="dashboard" componentId="feedback_card" defaultHeight={420} minHeight={300} maxHeight={750}>
                  <motion.div variants={cardVariants} style={{ height: '100%' }}>
                    <TiltCard sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {renderLifeScoreFeedback()}
                    </TiltCard>
                  </motion.div>
                </ResizablePanel>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </Box>
    </PageWrapper>
  );
};

export default Dashboard;
