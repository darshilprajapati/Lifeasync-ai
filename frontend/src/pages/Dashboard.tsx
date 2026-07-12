import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Stack } from '@mui/material';
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
  
  // Scoring
  const [lifeScore, setLifeScore] = useState(50);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();

      // Trigger parallel API loading
      const [finRes, healthRes, plannerRes, insightsRes] = await Promise.all([
        apiClient.get('/api/finance/summary').catch(() => null),
        apiClient.get('/api/health').catch(() => null),
        apiClient.get('/api/planner').catch(() => null),
        apiClient.get('/api/insights').catch(() => null)
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
      if (plannerRes && plannerRes.data.isSuccess) {
        const events = plannerRes.data.data as PlannerEvent[];
        const todaysEvents = events.filter((e) => isSameDay(parseDateSafe(e.startTime), today));
        completedCount = todaysEvents.filter((e) => e.isCompleted).length;
        totalCount = todaysEvents.length;

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

      // 5. Dynamic Life Score Calculation
      let score = 0;

      // Check if user has performed ANY daily activity
      const hasWater = waterSum > 0;
      const hasSleep = sleepSum > 0;
      const hasSteps = stepsSum > 0;
      const hasCalories = caloriesSum > 0;
      const hasWorkout = workoutSum > 0;

      // Start baseline points if there is active logging or scheduled tasks
      if (totalCount > 0 || hasWater || hasSleep || hasSteps || hasCalories || hasWorkout) {
        score += 5;
      }

      // A. Tasks completion factor (Up to +15 points)
      if (totalCount > 0) {
        score += (completedCount / totalCount) * 15;
      }

      // B. Health & Wellness factor (Total max +75: Hydration: 30, Workout: 15, Sleep: 10, Steps: 10, Calories: 10)
      score += Math.min(30, (waterSum / 2000) * 30);
      score += Math.min(15, (workoutSum / 30) * 15);
      score += Math.min(10, (sleepSum / 8) * 10);
      score += Math.min(10, (stepsSum / 10000) * 10);
      score += caloriesSum > 0 ? 10 : 0;

      // C. Financial balance factor (Up to +5 points)
      if (currentBalance > 0) {
        score += 5;
      } else if (currentBalance < 0) {
        score -= 5; // penalty for negative net balances
      }

      setLifeScore(Math.max(0, Math.min(100, score)));

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        current: totalTasks === 0 ? 'No tasks scheduled' : `${completedTasks}/${totalTasks} completed`,
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
      : 'Low baseline activity. Let\'s sync your daily metrics.';

    return (
      <Stack spacing={1.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
          {heading}
        </Typography>
        {boosts.length > 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9, fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8E8D8A' }}>
              Pending Boosts:
            </Typography>
            <Stack spacing={0.8} sx={{ maxHeight: '180px', overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.08)', borderRadius: '2px' } }}>
              {boosts.map((boost, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'var(--bg-secondary)', p: '8px 12px', borderRadius: '10px', border: '1px solid var(--neutral-primary)', backdropFilter: 'blur(6px)' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {boost.icon}
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px', lineHeight: 1.2 }}>
                        {boost.label}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)', fontSize: '9px' }}>
                        {boost.current}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 750, color: '#3FA76D', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    +{boost.remainingPoints.toFixed(2)} pts
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {getGreeting()}, {user?.fullName || 'User'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
              Here is your personal real-time habit intelligence summary for today.
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
              {/* Life Score Modern Art Card */}
              {/* Row 1: 4 Symmetrical Metric Cards */}

              {/* Card 1: Life Score Card */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <motion.div variants={cardVariants} style={{ height: '100%' }}>
                  <Card sx={{
                    position: 'relative',
                    borderRadius: '18px',
                    boxShadow: 'var(--shadow-soft)',
                    bgcolor: 'var(--card-bg)', // aligned background color
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

                    {/* Futuristic Whole-Card Vertical Fluid Progress Loader */}
                    <Box sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.max(12, lifeScore)}%`,
                      background: 'linear-gradient(180deg, rgba(232, 90, 79, 0.35) 0%, rgba(183, 28, 28, 0.18) 100%)', // themed coral gradient
                      transition: 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 1,
                      overflow: 'hidden',
                    }}>
                      {/* Wave 1 - Primary Coral Red Layer */}
                      <Box sx={{
                        position: 'absolute',
                        top: '-15px',
                        left: 0,
                        width: '200%',
                        height: '24px',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,60 C150,90 350,90 500,60 C650,30 850,30 1000,60 C1150,90 1300,90 1450,60 L1450,120 L0,120 Z\' fill=\'rgba(232, 90, 79, 0.52)\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: '50% 100%',
                        animation: 'wave-move-1 4.8s infinite ease-in-out', // ease-in-out timing for organic sloshing
                        filter: 'drop-shadow(0 -1.5px 3px rgba(232, 90, 79, 0.3))'
                      }} />

                      {/* Wave 2 - Rose Gold Accent Depth Layer */}
                      <Box sx={{
                        position: 'absolute',
                        top: '-11px',
                        left: 0,
                        width: '200%',
                        height: '24px',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,50 C200,85 400,85 600,50 C800,15 1000,15 1200,50 C1400,85 1600,85 1800,50 L1800,120 L0,120 Z\' fill=\'rgba(233, 128, 116, 0.32)\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: '50% 100%',
                        animation: 'wave-move-2 7.2s infinite ease-in-out', // ease-in-out timing
                        opacity: 0.8
                      }} />

                      {/* Wave 3 - Glowing Meniscus Surface Highlight */}
                      <Box sx={{
                        position: 'absolute',
                        top: '-16px',
                        left: 0,
                        width: '200%',
                        height: '22px',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,65 C100,85 300,85 400,65 C500,45 700,45 800,65 C900,85 1100,85 1200,65 L1200,120 L0,120 Z\' fill=\'rgba(255, 138, 128, 0.72)\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: '50% 100%',
                        animation: 'wave-move-1 5.8s infinite ease-in-out', // ease-in-out timing
                        filter: 'drop-shadow(0 -3px 5px rgba(232, 90, 79, 0.7))',
                        opacity: 0.9,
                      }} />

                      {/* Floating Bubbles */}
                      <Box className="bubble bubble-1" />
                      <Box className="bubble bubble-2" />
                      <Box className="bubble bubble-3" />
                      <Box className="bubble bubble-4" />
                    </Box>

                    {/* CSS Keyframe Styles */}
                    <style dangerouslySetInnerHTML={{ __html: `
                      @keyframes wave-move-1 {
                        0% { transform: translateX(0) translateY(0) rotate(0deg); }
                        50% { transform: translateX(-25%) translateY(-5px) rotate(1.5deg); }
                        100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
                      }
                      @keyframes wave-move-2 {
                        0% { transform: translateX(-50%) translateY(0) rotate(0deg); }
                        50% { transform: translateX(-25%) translateY(6px) rotate(-1.5deg); }
                        100% { transform: translateX(0) translateY(0) rotate(0deg); }
                      }
                      @keyframes rise {
                        0% { bottom: -10px; transform: translateX(0) scale(1); opacity: 0; }
                        15% { opacity: 0.6; }
                        35% { transform: translateX(-9px) scale(1.15); }
                        65% { transform: translateX(9px) scale(0.92); }
                        85% { opacity: 0.6; }
                        100% { bottom: 100%; transform: translateX(1px) scale(0.8); opacity: 0; }
                      }
                      @keyframes bobbing {
                        0% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-5px) rotate(4deg); }
                        100% { transform: translateY(0) rotate(0deg); }
                      }
                      .bubble {
                        position: absolute;
                        bottom: 0;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.4);
                        box-shadow: 0 0 4px rgba(255, 255, 255, 0.6);
                        animation: rise 4.2s infinite ease-in-out;
                        pointer-events: none;
                        z-index: 1;
                      }
                      .bubble-1 { left: 15%; width: 4px; height: 4px; animation-delay: 0s; animation-duration: 3.5s; }
                      .bubble-2 { left: 45%; width: 6px; height: 6px; animation-delay: 0.8s; animation-duration: 4.8s; }
                      .bubble-3 { left: 70%; width: 3px; height: 3px; animation-delay: 1.8s; animation-duration: 3.2s; }
                      .bubble-4 { left: 85%; width: 5px; height: 5px; animation-delay: 2.8s; animation-duration: 4.2s; }
                    `}} />

                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, zIndex: 2, position: 'relative' }}>
                      <FavoriteIcon sx={{ color: '#E85A4F', fontSize: '32px', mb: 2, animation: 'bobbing 3s infinite ease-in-out' }} />
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 1 }}>Life Score</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                        {lifeScore.toFixed(2)}
                      </Typography>
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
                      <HealthAndSafetyIcon sx={{ color: '#3FA76D', fontSize: '32px', mb: 2 }} />
                      <Typography variant="subtitle2" sx={{ color: '#8E8D8A', mb: 1 }}>Hydration Score</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {Math.min(100, Math.round((todaysWater / 2000) * 100))}%
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Card 4: Today's Tasks */}
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
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Row 2: AI Habit Recommendations and Pending Boosts split */}
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

