import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Chip,
  Tooltip
} from '@mui/material';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import { motion } from 'framer-motion';
import { cardVariants, containerVariants } from '../animations';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

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

interface AiRecommendation {
  id: number;
  insightText: string;
  category: string;
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

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todaysWater, setTodaysWater] = useState(0);
  const [todaysSleep, setTodaysSleep] = useState(0);
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [todaysCalories, setTodaysCalories] = useState(0);
  const [todaysWorkout, setTodaysWorkout] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [latestInsight, setLatestInsight] = useState<string | null>(null);

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
      const [finRes, healthRes, plannerRes, insightsRes, scoreRes, historyRes] = await Promise.all([
        apiClient.get('/api/finance/summary').catch(() => null),
        apiClient.get('/api/health').catch(() => null),
        apiClient.get('/api/planner').catch(() => null),
        apiClient.get('/api/insights').catch(() => null),
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
      if (insightsRes && insightsRes.data.isSuccess) {
        const list = insightsRes.data.data as AiRecommendation[];
        if (list.length > 0) {
          setLatestInsight(list[0].insightText);
        }
      }

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
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
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
        current: `Net balance: $${balance.toFixed(2)}`,
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
                    p: 1,
                    borderRadius: '8px',
                    bgcolor: 'var(--bg-secondary)',
                    border: '1px solid rgba(0,0,0,0.03)'
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
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <HistoryIcon sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.5 }} />
                7-Day Score History
              </Typography>
              {selectedDate && (
                <Button size="small" onClick={fetchDashboardData} sx={{ fontSize: '11px', textTransform: 'none', py: 0 }}>
                  Back to Today
                </Button>
              )}
            </Stack>
            <Stack direction="row" spacing={0.8} sx={{ overflowX: 'auto', pb: 0.5 }}>
              {historicalScores.map((h) => {
                const isSelected = selectedDate === h.date || (!selectedDate && h.date === new Date().toISOString().split('T')[0]);
                const dayLabel = h.date.slice(5); // e.g. "10-14"

                return (
                  <Tooltip key={h.date} title={`${h.date}: Score ${Math.round(h.score)}/100 ${h.penaltyPoints > 0 ? `(-${h.penaltyPoints} penalty)` : ''}`} arrow>
                    <Chip
                      size="small"
                      label={`${dayLabel}: ${Math.round(h.score)}`}
                      color={isSelected ? 'primary' : h.penaltyPoints > 0 ? 'error' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => handleSelectHistoryDate(h.date)}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: '24px',
                        borderWidth: isSelected ? 2 : 1
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
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
              {getGreeting()}, {user?.fullName || 'User'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
              {selectedDate ? `Reviewing historical performance for ${selectedDate}.` : 'Here is your daily habit intelligence and Life Score for today.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ThemeToggle />
            <Button
              variant="outlined"
              onClick={fetchDashboardData}
              sx={{
                textTransform: 'none',
                borderRadius: '12px',
                borderColor: '#E85A4F',
                color: '#E85A4F',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': {
                  bgcolor: '#FDF7F7',
                  borderColor: '#E85A4F'
                }
              }}
            >
              Refresh
            </Button>
            <ReportExporter module="All" buttonVariant="contained" buttonColor="primary" />
          </Stack>
        </Stack>

        {loading ? (
          <LogoLoader />
        ) : (
          <motion.div variants={containerVariants} initial="initial" animate="animate">
            <Grid container spacing={3}>
              {/* Card 1: Life Score Card */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{
                    position: 'relative',
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-soft)',
                    bgcolor: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'var(--shadow-hover)',
                      transition: 'var(--transition-smooth)'
                    }
                  }}>
                    {/* Realistic 3D Glass Container Reflections */}
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

                    {/* Fluid Progress Level Indicator */}
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
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 0.5 }}>
                        {selectedDate ? `Life Score (${selectedDate})` : 'Daily Life Score'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                        {lifeScore.toFixed(1)} / 100
                      </Typography>

                      {penaltyPoints > 0 && (
                        <Tooltip title="Missed deadlines result in an unrecoverable -2 penalty for this day." arrow>
                          <Chip
                            size="small"
                            label={`−${penaltyPoints} pts penalty`}
                            color="error"
                            sx={{ mt: 1, height: '22px', fontSize: '11px', fontWeight: 700 }}
                          />
                        </Tooltip>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Card 2: Net Balance */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{
                    height: '100%',
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-soft)',
                    bgcolor: 'var(--card-bg)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'var(--shadow-hover)',
                      transition: 'var(--transition-smooth)'
                    }
                  }} onClick={() => navigate('/finance')}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <AccountBalanceWalletIcon sx={{ color: '#E85A4F', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 1 }}>Net Balance</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: balance >= 0 ? '#4CAF50' : '#E85A4F' }}>
                        ${balance.toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Card 3: Hydration Score */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{
                    height: '100%',
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-soft)',
                    bgcolor: 'var(--card-bg)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'var(--shadow-hover)',
                      transition: 'var(--transition-smooth)'
                    }
                  }} onClick={() => navigate('/health')}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <LocalDrinkIcon sx={{ color: '#00BCD4', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 1 }}>Today's Water</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {todaysWater} / 2000 ml
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Card 4: Planner Tasks */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{
                    height: '100%',
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-soft)',
                    bgcolor: 'var(--card-bg)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'var(--shadow-hover)',
                      transition: 'var(--transition-smooth)'
                    }
                  }} onClick={() => navigate('/planner')}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                      <EventAvailableIcon sx={{ color: '#4A90E2', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 1 }}>Today's Tasks</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {completedTasks} / {totalTasks}
                      </Typography>
                      {missedDeadlinesCount > 0 && (
                        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600, mt: 0.5 }}>
                          {missedDeadlinesCount} missed
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Row 2: AI Habit Recommendations and Score Feedback split */}
              <Grid size={{ xs: 12, md: 8 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{ borderRadius: '18px', boxShadow: 'var(--shadow-soft)', bgcolor: 'var(--bg-secondary)', border: '1px solid var(--neutral-primary)', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, width: '100%' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#E85A4F', mb: 1, display: 'flex', alignItems: 'center' }}>
                          <PsychologyIcon sx={{ mr: 1 }} /> AI Habit Intelligence
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                          {latestInsight ? `"${latestInsight}"` : '"No data patterns generated yet. Run a Life Area Assessment inside AI Insights to load recommendations."'}
                        </Typography>
                      </Box>
                      <Button variant="contained" sx={{ bgcolor: '#E85A4F', color: 'white', borderRadius: '12px', px: 3, py: 1, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#E98074' } }} onClick={() => navigate('/insights')}>
                        View Insights
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{ borderRadius: '18px', boxShadow: 'var(--shadow-soft)', bgcolor: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.05)', p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {renderLifeScoreFeedback()}
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </Box>
    </PageWrapper>
  );
};

export default Dashboard;
