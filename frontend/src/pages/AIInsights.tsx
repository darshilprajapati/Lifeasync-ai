import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Stack,
  Paper,
  Chip,
  Button,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import WorkIcon from '@mui/icons-material/Work';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockIcon from '@mui/icons-material/Lock';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatters';

interface AiRecommendation {
  id: number;
  insightText: string;
  category: string;
  createdAt: string;
}

interface PlannerItem {
  id: number;
  title: string;
  startTime: string;
  endTime?: string;
  status: string;
  priority?: string;
  category?: string;
}

interface WeeklyDataPoint {
  dateStr: string;
  day: string;
  tasks: number;
}

const AIInsights: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Aggregated actual metrics across modules
  const [tasksToday, setTasksToday] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [lifeScore, setLifeScore] = useState<number>(75);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(0);
  const [workoutLogged, setWorkoutLogged] = useState<boolean>(false);
  const [careerCount, setCareerCount] = useState<number>(0);
  const [vaultCount, setVaultCount] = useState<number>(0);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyDataPoint[]>([]);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRecommendationRoute = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'finance':
        return '/finance';
      case 'health':
        return '/health';
      case 'productivity':
      case 'planner':
        return '/planner';
      case 'career':
        return '/career';
      case 'vault':
        return '/vault';
      default:
        return null;
    }
  };

  const loadAllMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load AI insights, Planner, Finance, Career, Vault, and LifeScore in parallel
      const [insightsRes, plannerRes, financeRes, careerRes, vaultRes, lifeScoreRes, healthRes] =
        await Promise.allSettled([
          apiClient.get('/api/insights'),
          apiClient.get('/api/planner'),
          apiClient.get('/api/finance'),
          apiClient.get('/api/career'),
          apiClient.get('/api/vault'),
          apiClient.get('/api/lifescore/today'),
          apiClient.get('/api/health'),
        ]);

      // 1. Insights
      if (insightsRes.status === 'fulfilled' && insightsRes.value.data.isSuccess) {
        setInsights(insightsRes.value.data.data || []);
      }

      // 2. Planner & Priority Tasks
      if (plannerRes.status === 'fulfilled' && plannerRes.value.data.isSuccess) {
        const events: PlannerItem[] = plannerRes.value.data.data || [];
        const todayStr = new Date().toISOString().split('T')[0];

        const todayTasks = events.filter((e) => {
          const eDate = e.startTime ? new Date(e.startTime).toISOString().split('T')[0] : '';
          return eDate === todayStr;
        });

        const completedCount = todayTasks.filter(
          (t) => (t.status || '').toLowerCase() === 'completed'
        ).length;
        setTasksToday({ completed: completedCount, total: todayTasks.length });

        // Calculate accurate 7-day task distribution using date strings
        const last7Days: WeeklyDataPoint[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const day = dayNames[d.getDay()];
          last7Days.push({ dateStr, day, tasks: 0 });
        }

        events.forEach((e) => {
          if (e.startTime && (e.status || '').toLowerCase() === 'completed') {
            const eDateStr = new Date(e.startTime).toISOString().split('T')[0];
            const match = last7Days.find((d) => d.dateStr === eDateStr);
            if (match) {
              match.tasks += 1;
            }
          }
        });

        setWeeklyProgress(last7Days);
      }

      // 3. Finance (compute current month expenses from transaction array)
      if (financeRes.status === 'fulfilled' && financeRes.value.data.isSuccess) {
        const fRaw = financeRes.value.data.data;
        const transactions: any[] = Array.isArray(fRaw) ? fRaw : [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthExpenses = transactions
          .filter((t) => {
            const isExpense = (t.type || '').toLowerCase() === 'expense';
            const tDate = t.date || t.transactionDate ? new Date(t.date || t.transactionDate) : null;
            return isExpense && tDate && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        setMonthlyExpense(monthExpenses);
      }

      // 4. Career
      if (careerRes.status === 'fulfilled' && careerRes.value.data.isSuccess) {
        const cData = careerRes.value.data.data || [];
        setCareerCount(cData.length);
      }

      // 5. Vault
      if (vaultRes.status === 'fulfilled' && vaultRes.value.data.isSuccess) {
        const vData = vaultRes.value.data.data || [];
        setVaultCount(vData.length);
      }

      // 6. LifeScore (handle both finalScore and score)
      if (lifeScoreRes.status === 'fulfilled' && lifeScoreRes.value.data.isSuccess) {
        const ls = lifeScoreRes.value.data.data;
        const scoreVal = ls?.finalScore ?? ls?.score;
        if (scoreVal !== undefined) {
          setLifeScore(Math.round(scoreVal));
        }
      }

      // 7. Health / Workout (check logDate and logType/activityType)
      if (healthRes.status === 'fulfilled' && healthRes.value.data.isSuccess) {
        const logs = healthRes.value.data.data || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const hasWorkoutToday = logs.some((l: any) => {
          const rawDate = l.logDate || l.createdAt;
          const lDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
          const isWorkout =
            (l.logType || '').toLowerCase() === 'workout' ||
            (l.activityType || '').toLowerCase().includes('workout') ||
            (l.exerciseName && l.durationMinutes > 0);
          return lDate === todayStr && isWorkout;
        });
        setWorkoutLogged(hasWorkoutToday);
      }

      trackAction('ai_insight_viewed', { module: 'ai_insights' });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load insights dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllMetrics();

    // Cross-module real-time sync listeners
    const handleSync = () => {
      loadAllMetrics();
    };
    window.addEventListener('lifesync:score-updated', handleSync);
    window.addEventListener('lifesync:finance-updated', handleSync);
    window.addEventListener('lifesync:health-updated', handleSync);
    window.addEventListener('lifesync:task-updated', handleSync);

    return () => {
      window.removeEventListener('lifesync:score-updated', handleSync);
      window.removeEventListener('lifesync:finance-updated', handleSync);
      window.removeEventListener('lifesync:health-updated', handleSync);
      window.removeEventListener('lifesync:task-updated', handleSync);
    };
  }, [loadAllMetrics]);

  const handleGenerateInsights = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await apiClient.post('/api/insights/generate');
      if (res.data.isSuccess) {
        trackAction('ai_insight_generated', { module: 'ai_insights', action: 'regenerate' });
        setInsights(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate AI insights.');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'finance':
        return {
          border: '4px solid #4CAF50',
          bg: 'rgba(76, 175, 80, 0.05)',
          tagBg: 'rgba(76, 175, 80, 0.12)',
          tagColor: '#2E7D32',
          icon: <AttachMoneyIcon sx={{ fontSize: 18, color: '#2E7D32' }} />,
        };
      case 'health':
        return {
          border: '4px solid #2196F3',
          bg: 'rgba(33, 150, 243, 0.05)',
          tagBg: 'rgba(33, 150, 243, 0.12)',
          tagColor: '#1565C0',
          icon: <FitnessCenterIcon sx={{ fontSize: 18, color: '#1565C0' }} />,
        };
      case 'productivity':
        return {
          border: '4px solid #9C27B0',
          bg: 'rgba(156, 39, 176, 0.05)',
          tagBg: 'rgba(156, 39, 176, 0.12)',
          tagColor: '#7B1FA2',
          icon: <AssignmentIcon sx={{ fontSize: 18, color: '#7B1FA2' }} />,
        };
      case 'career':
        return {
          border: '4px solid #FF9800',
          bg: 'rgba(255, 152, 0, 0.05)',
          tagBg: 'rgba(255, 152, 0, 0.12)',
          tagColor: '#E65100',
          icon: <WorkIcon sx={{ fontSize: 18, color: '#E65100' }} />,
        };
      case 'vault':
        return {
          border: '4px solid #00BCD4',
          bg: 'rgba(0, 188, 212, 0.05)',
          tagBg: 'rgba(0, 188, 212, 0.12)',
          tagColor: '#00838F',
          icon: <ShieldIcon sx={{ fontSize: 18, color: '#00838F' }} />,
        };
      default:
        return {
          border: '4px solid var(--accent-primary)',
          bg: 'rgba(232, 90, 79, 0.05)',
          tagBg: 'rgba(232, 90, 79, 0.12)',
          tagColor: 'var(--accent-secondary)',
          icon: <LightbulbIcon sx={{ fontSize: 18, color: 'var(--accent-primary)' }} />,
        };
    }
  };

  const userName = user?.fullName ? user.fullName.split(' ')[0] : 'User';

  const filteredInsights = useMemo(() => {
    return insights.filter((item) => {
      if (selectedCategory !== 'all' && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = (item.insightText || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        if (!textMatch && !catMatch) return false;
      }
      return true;
    });
  }, [insights, selectedCategory, searchQuery]);

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', sm: '24px' }, height: '100%', overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {/* MOBILE VIEW: Option A — Insights Snapshot */}
        {isMobile ? (
          <Box sx={{ pb: 6 }}>
            {/* 1. Header: Greeting & Subtitle */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.3px', mb: 0.5 }}>
                {getGreeting()}, {userName} 👋
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.4 }}>
                Here's your personal growth and cross-module intelligence overview for today.
              </Typography>
            </Box>

            {/* 2. Top Header Actions: Export Report & Regenerate Insights */}
            <Stack direction="row" spacing={1.2} sx={{ mb: 2.5 }}>
              <Box sx={{ flex: 1 }}>
                <ReportExporter module="AiInsights" />
              </Box>
              <Button
                variant="contained"
                disabled={generating || loading}
                onClick={handleGenerateInsights}
                startIcon={<AutorenewIcon className={generating ? 'spin-animation' : ''} sx={{ fontSize: 18 }} />}
                sx={{
                  flex: 1.3,
                  height: 42,
                  bgcolor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontWeight: 750,
                  fontSize: '12px',
                  borderRadius: '14px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
                  '&:hover': { bgcolor: 'var(--accent-secondary)' },
                }}
              >
                {generating ? 'Analyzing...' : 'Regenerate Insights'}
              </Button>
            </Stack>

            {/* 3. Five Responsive Metric Cards (2-column responsive grid + 1 full-width card) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                mb: 2.5,
              }}
            >
              {/* Card 1: Tasks Completed Today */}
              <TiltCard
                maxTilt={1.5}
                enableRefraction={false}
                onClick={() => navigate('/planner')}
                sx={{
                  p: 1.8,
                  borderRadius: '18px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#3B82F6' },
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Chip
                    label={tasksToday.total > 0 ? `${Math.round((tasksToday.completed / tasksToday.total) * 100)}%` : '0%'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10.5px',
                      fontWeight: 800,
                      bgcolor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                    }}
                  />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 850, color: 'var(--text-primary)', mb: 0.2, fontSize: '18px' }}>
                  {tasksToday.completed}/{tasksToday.total}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11px' }}>
                  Tasks Completed Today
                </Typography>
              </TiltCard>

              {/* Card 2: Life Score Index */}
              <TiltCard
                maxTilt={1.5}
                enableRefraction={false}
                onClick={() => navigate('/')}
                sx={{
                  p: 1.8,
                  borderRadius: '18px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#8B5CF6' },
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: 'rgba(139, 92, 246, 0.12)',
                      color: '#8B5CF6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Chip
                    label={lifeScore >= 70 ? 'Optimal' : lifeScore >= 40 ? 'Good' : 'Needs Focus'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10.5px',
                      fontWeight: 800,
                      bgcolor: lifeScore >= 70 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: lifeScore >= 70 ? '#10B981' : '#F59E0B',
                    }}
                  />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 850, color: 'var(--text-primary)', mb: 0.2, fontSize: '18px' }}>
                  {lifeScore} <Typography component="span" sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>/ 100</Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11px' }}>
                  Life Score Index
                </Typography>
              </TiltCard>

              {/* Card 3: Total Expenses */}
              <TiltCard
                maxTilt={1.5}
                enableRefraction={false}
                onClick={() => navigate('/finance')}
                sx={{
                  p: 1.8,
                  borderRadius: '18px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#F59E0B' },
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: 'rgba(245, 158, 11, 0.12)',
                      color: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AttachMoneyIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Chip
                    label="Monthly"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10.5px',
                      fontWeight: 750,
                      bgcolor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                    }}
                  />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 850, color: 'var(--text-primary)', mb: 0.2, fontSize: '17px' }}>
                  {formatINR(monthlyExpense)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11px' }}>
                  Total Expenses
                </Typography>
              </TiltCard>

              {/* Card 4: Daily Workout Routine */}
              <TiltCard
                maxTilt={1.5}
                enableRefraction={false}
                onClick={() => navigate('/health')}
                sx={{
                  p: 1.8,
                  borderRadius: '18px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#10B981' },
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FitnessCenterIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Chip
                    label={workoutLogged ? 'Done' : 'Pending'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10.5px',
                      fontWeight: 800,
                      bgcolor: workoutLogged ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: workoutLogged ? '#10B981' : '#F59E0B',
                    }}
                  />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 850, color: 'var(--text-primary)', mb: 0.2, fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {workoutLogged ? 'Completed' : 'Rest Day / Todo'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11px' }}>
                  Daily Workout Routine
                </Typography>
              </TiltCard>

              {/* Card 5: Encrypted Vault Records (Full Width across 2 columns) */}
              <TiltCard
                maxTilt={1}
                enableRefraction={false}
                onClick={() => navigate('/vault')}
                sx={{
                  gridColumn: 'span 2',
                  p: 1.8,
                  borderRadius: '18px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#3B82F6' },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '12px',
                      bgcolor: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 850, color: 'var(--text-primary)', fontSize: '15px' }}>
                      {vaultCount} items
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11.5px' }}>
                      Encrypted Vault Records
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label="All Secure"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 750,
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    color: '#2563EB',
                  }}
                />
              </TiltCard>
            </Box>

            {/* 4. Weekly Productivity & Focus Card */}
            <TiltCard
              maxTilt={1}
              enableRefraction={false}
              sx={{
                p: 2.2,
                borderRadius: '20px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                mb: 2.5,
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px',
                      bgcolor: 'rgba(232, 90, 79, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <CalendarTodayIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                    Weekly Productivity &amp; Focus
                  </Typography>
                </Stack>
                <ChevronRightIcon sx={{ color: 'var(--text-secondary)', fontSize: 20 }} />
              </Stack>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2, fontSize: '11.5px' }}>
                Daily task throughput across the current cycle
              </Typography>

              {weeklyProgress.every((p) => p.tasks === 0) ? (
                <Box
                  sx={{
                    py: 3,
                    px: 2,
                    textAlign: 'center',
                    bgcolor: 'var(--bg-secondary)',
                    borderRadius: '14px',
                    border: '1px dashed var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <EventAvailableIcon sx={{ fontSize: 32, color: 'var(--text-secondary)', opacity: 0.6, mb: 0.8 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.3, fontSize: '13.5px' }}>
                    No Completed Tasks This Week
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', maxWidth: 260, mb: 1.8, fontSize: '11px', lineHeight: 1.4 }}>
                    Schedule and finish tasks in Planner to see your weekly trend.
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate('/planner')}
                    sx={{
                      textTransform: 'none',
                      bgcolor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      borderRadius: '10px',
                      px: 2.4,
                      py: 0.6,
                      fontWeight: 700,
                      fontSize: '11.5px',
                      boxShadow: '0 2px 8px rgba(232, 90, 79, 0.3)',
                      '&:hover': { bgcolor: 'var(--accent-secondary)' },
                    }}
                  >
                    Go to Planner
                  </Button>
                </Box>
              ) : (
                <Box sx={{ height: 160, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyProgress} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.12)" />
                      <XAxis dataKey="day" stroke="var(--text-secondary)" tickLine={false} fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" tickLine={false} allowDecimals={false} fontSize={11} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-soft)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="tasks" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </TiltCard>

            {/* 5. Dynamic AI Insights Section */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      bgcolor: 'rgba(232, 90, 79, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <LightbulbIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                    Dynamic AI Insights
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={`${filteredInsights.length} active`}
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 750,
                    bgcolor: 'rgba(232, 90, 79, 0.12)',
                    color: 'var(--accent-primary)',
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 1.5, fontSize: '11.5px' }}>
                Deterministic &amp; ML-driven actionable recommendations
              </Typography>

              {/* Compact Filter trigger (No horizontal scrolling tabs) */}
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search insights..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 0.8, fontSize: 18 }} />,
                      sx: {
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '14px',
                        fontSize: '12.5px',
                        '& fieldset': { borderColor: 'var(--card-border)' },
                      },
                    },
                  }}
                />
                <Button
                  variant={selectedCategory !== 'all' ? 'contained' : 'outlined'}
                  onClick={() => setMobileFilterOpen(true)}
                  startIcon={<TuneIcon sx={{ fontSize: 17 }} />}
                  sx={{
                    height: 38,
                    px: 1.6,
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    bgcolor: selectedCategory !== 'all' ? 'var(--accent-primary)' : 'var(--card-bg)',
                    borderColor: selectedCategory !== 'all' ? 'var(--accent-primary)' : 'var(--card-border)',
                    color: selectedCategory !== 'all' ? '#FFFFFF' : 'var(--text-primary)',
                    boxShadow: selectedCategory !== 'all' ? '0 4px 12px rgba(232, 90, 79, 0.25)' : 'none',
                  }}
                >
                  Filter
                </Button>
              </Stack>

              {/* Active Filter Chip */}
              {selectedCategory !== 'all' && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                  <Chip
                    label={'Category: ' + selectedCategory.toUpperCase()}
                    size="small"
                    onDelete={() => setSelectedCategory('all')}
                    sx={{
                      fontWeight: 700,
                      fontSize: '11px',
                      bgcolor: 'rgba(232, 90, 79, 0.1)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(232, 90, 79, 0.2)',
                    }}
                  />
                </Stack>
              )}

              {/* Insights List */}
              {filteredInsights.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 2,
                    textAlign: 'center',
                    bgcolor: 'var(--card-bg)',
                    borderRadius: '18px',
                    border: '1px dashed var(--card-border)',
                  }}
                >
                  <LightbulbIcon sx={{ fontSize: 36, color: 'var(--text-secondary)', opacity: 0.5, mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                    No Insights Match Active Filter
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                    Try selecting "All" categories or trigger Regenerate Insights.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.2}>
                  {filteredInsights.map((insight: AiRecommendation) => {
                    const themeObj = getCategoryTheme(insight.category);
                    const route = getRecommendationRoute(insight.category);

                    return (
                      <TiltCard
                        key={insight.id}
                        maxTilt={1.2}
                        enableRefraction={false}
                        onClick={() => {
                          if (route) {
                            trackAction('ai_insight_action_clicked', { category: insight.category, route });
                            navigate(route);
                          }
                        }}
                        sx={{
                          p: 1.8,
                          borderRadius: '18px',
                          bgcolor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          boxShadow: 'var(--shadow-soft)',
                          cursor: route ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'var(--accent-primary)' },
                        }}
                      >
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ bgcolor: themeObj.tagBg, px: 1, py: 0.3, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {themeObj.icon}
                            <Typography variant="caption" sx={{ color: themeObj.tagColor, fontWeight: 800, textTransform: 'uppercase', fontSize: '10.5px' }}>
                              {insight.category}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>
                            {new Date(insight.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        </Stack>

                        <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontSize: '12.5px', lineHeight: 1.5, mb: 1.2, fontWeight: 550 }}>
                          {insight.insightText}
                        </Typography>

                        {route && (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'var(--accent-primary)' }}>
                            <Typography variant="caption" sx={{ fontWeight: 750, fontSize: '11.5px' }}>
                              Go to {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                            </Typography>
                            <ArrowForwardIcon sx={{ fontSize: 13 }} />
                          </Stack>
                        )}
                      </TiltCard>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* 6. Compact Attention, Integrity & Privacy Cards */}
            <Stack spacing={1.2}>
              {/* Overdue Penalty */}
              <TiltCard
                maxTilt={1}
                enableRefraction={false}
                onClick={() => navigate('/planner')}
                sx={{
                  p: 1.8,
                  borderRadius: '16px',
                  bgcolor: 'rgba(255, 152, 0, 0.05)',
                  border: '1px solid rgba(255, 152, 0, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flex: 1, mr: 1 }}>
                  <WarningAmberIcon sx={{ color: '#FF9800', fontSize: 20, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Attention: Overdue Penalty Rule
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', lineHeight: 1.3 }}>
                      Keep up with tasks to avoid Life Score deduction.
                    </Typography>
                  </Box>
                </Stack>
                <ChevronRightIcon sx={{ color: 'var(--text-secondary)', fontSize: 18, flexShrink: 0 }} />
              </TiltCard>

              {/* Multi-Module Integrity */}
              <TiltCard
                maxTilt={1}
                enableRefraction={false}
                sx={{
                  p: 1.8,
                  borderRadius: '16px',
                  bgcolor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flex: 1, mr: 1 }}>
                  <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Multi-Module Integrity
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', lineHeight: 1.3 }}>
                      All cross-module metrics are analyzed securely.
                    </Typography>
                  </Box>
                </Stack>
                <ChevronRightIcon sx={{ color: 'var(--text-secondary)', fontSize: 18, flexShrink: 0 }} />
              </TiltCard>

              {/* Privacy First */}
              <TiltCard
                maxTilt={1}
                enableRefraction={false}
                onClick={() => navigate('/vault')}
                sx={{
                  p: 1.8,
                  borderRadius: '16px',
                  bgcolor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flex: 1, mr: 1 }}>
                  <LockIcon sx={{ color: '#2563EB', fontSize: 20, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Privacy First
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', lineHeight: 1.3 }}>
                      Vault passwords, secret notes and auth tokens are strictly excluded from AI prompts.
                    </Typography>
                  </Box>
                </Stack>
                <ChevronRightIcon sx={{ color: 'var(--text-secondary)', fontSize: 18, flexShrink: 0 }} />
              </TiltCard>
            </Stack>
          </Box>
        ) : loading ? (
          <LogoLoader />
        ) : (
          <Box>
            {/* Top Stat Cards (PriMaX Style) */}
            <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
              {/* Card 1: Tasks Today */}
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
                <TiltCard sx={{ p: 2.5, height: '100%', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}>
                      <CheckCircleIcon fontSize="small" />
                    </Box>
                    <Chip
                      size="small"
                      label={tasksToday.total > 0 ? `${Math.round((tasksToday.completed / tasksToday.total) * 100)}%` : '0%'}
                      sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#2E7D32', fontWeight: 700, fontSize: '11px' }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                    {tasksToday.completed}/{tasksToday.total}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Tasks Completed Today
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Card 2: Growth / Life Score */}
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
                <TiltCard sx={{ p: 2.5, height: '100%', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(156, 39, 176, 0.1)', color: '#9C27B0' }}>
                      <TrendingUpIcon fontSize="small" />
                    </Box>
                    <Chip
                      size="small"
                      label={lifeScore >= 80 ? 'Optimal' : lifeScore >= 60 ? 'Stable' : 'Needs Focus'}
                      sx={{
                        bgcolor: lifeScore >= 70 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(232, 90, 79, 0.1)',
                        color: lifeScore >= 70 ? '#2E7D32' : 'var(--accent-primary)',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                    {lifeScore} <Typography component="span" variant="body2" sx={{ color: 'var(--text-secondary)' }}>/ 100</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Life Score Index
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Card 3: Spending */}
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
                <TiltCard sx={{ p: 2.5, height: '100%', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#FF9800' }}>
                      <AttachMoneyIcon fontSize="small" />
                    </Box>
                    <Chip
                      size="small"
                      label="Monthly"
                      sx={{ bgcolor: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '11px' }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                    {formatINR(monthlyExpense, false)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Total Expenses
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Card 4: Workout / Fitness */}
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
                <TiltCard sx={{ p: 2.5, height: '100%', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
                      <FitnessCenterIcon fontSize="small" />
                    </Box>
                    <Chip
                      size="small"
                      label={workoutLogged ? 'Done' : 'Pending'}
                      sx={{
                        bgcolor: workoutLogged ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                        color: workoutLogged ? '#2E7D32' : '#E65100',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                    {workoutLogged ? 'Completed' : 'Rest Day / Todo'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Daily Workout Routine
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Card 5: Vault & Career */}
              <Grid size={{ xs: 6, sm: 6, md: 2.4 }}>
                <TiltCard sx={{ p: 2.5, height: '100%', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(0, 188, 212, 0.1)', color: '#00BCD4' }}>
                      <ShieldIcon fontSize="small" />
                    </Box>
                    <Chip
                      size="small"
                      label={`${careerCount} Jobs`}
                      sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)', color: '#00838F', fontWeight: 700, fontSize: '11px' }}
                    />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', my: 0.5 }}>
                    {vaultCount} <Typography component="span" variant="body2" sx={{ color: 'var(--text-secondary)' }}>items</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Encrypted Vault Records
                  </Typography>
                </TiltCard>
              </Grid>
            </Grid>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
              {/* Left Column: Weekly Progress & Priority Tasks */}
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={3}>
                  {/* Weekly Progress Bar Chart */}
                  <ResizablePanel pageId="insights" componentId="insights_productivity_chart" defaultHeight={330} minHeight={260} maxHeight={600}>
                    <TiltCard sx={{ p: 3, borderRadius: '20px', border: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Weekly Productivity & Focus
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                            Daily task throughput across the current cycle
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--accent-primary)' }} />
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Completed Tasks
                          </Typography>
                        </Stack>
                      </Stack>

                      <Box sx={{ flex: 1, width: '100%', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {weeklyProgress.every((p) => p.tasks === 0) ? (
                          <Paper
                            sx={{
                              p: 3,
                              width: '100%',
                              textAlign: 'center',
                              bgcolor: 'rgba(0,0,0,0.01)',
                              border: '1px dashed var(--border-color)',
                              borderRadius: '14px',
                            }}
                          >
                            <EventAvailableIcon sx={{ fontSize: 36, color: 'var(--text-secondary)', opacity: 0.6, mb: 1 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
                              No Completed Tasks This Week
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
                              Schedule and finish tasks in Planner to track your weekly throughput and focus trends.
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate('/planner')}
                              sx={{
                                textTransform: 'none',
                                borderColor: 'var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                borderRadius: '10px',
                                px: 2,
                                fontWeight: 600,
                              }}
                            >
                              Go to Planner
                            </Button>
                          </Paper>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                              <XAxis dataKey="day" stroke="var(--text-secondary)" tickLine={false} />
                              <YAxis stroke="var(--text-secondary)" tickLine={false} allowDecimals={false} />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: 'var(--bg-primary)',
                                  borderColor: 'var(--border-color)',
                                  borderRadius: '10px',
                                  color: 'var(--text-primary)',
                                  boxShadow: 'var(--shadow-soft)',
                                }}
                              />
                              <Bar
                                dataKey="tasks"
                                fill="var(--accent-primary)"
                                radius={[6, 6, 0, 0]}
                                name="Completed Tasks"
                                barSize={28}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </Box>
                    </TiltCard>
                  </ResizablePanel>

                  {/* Areas Needing Attention & System Integrity */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TiltCard
                        sx={{
                          p: 2.5,
                          borderRadius: '16px',
                          bgcolor: 'rgba(255, 152, 0, 0.05)',
                          border: '1px solid rgba(255, 152, 0, 0.25)',
                          height: '100%',
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                          <WarningAmberIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Attention: Overdue Penalty Rule
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', lineHeight: 1.5 }}>
                          Incomplete tasks past deadline deduct <strong>−2 points</strong> from your Life Score. Complete or reschedule them in Planner to safeguard your standing.
                        </Typography>
                      </TiltCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TiltCard
                        sx={{
                          p: 2.5,
                          borderRadius: '16px',
                          bgcolor: 'rgba(76, 175, 80, 0.05)',
                          border: '1px solid rgba(76, 175, 80, 0.25)',
                          height: '100%',
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                          <EmojiEventsIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Multi-Module Integrity
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', lineHeight: 1.5 }}>
                          All cross-module metrics synchronize seamlessly. Encrypted Vault credentials remain local and strictly excluded from AI prompts.
                        </Typography>
                      </TiltCard>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>

              {/* Right Column: PriMaX Dynamic AI Insights */}
              <Grid size={{ xs: 12, lg: 5 }}>
                <ResizablePanel pageId="insights" componentId="insights_dynamic_recommendations" defaultHeight={680} minHeight={450} maxHeight={1200}>
                  <TiltCard sx={{ p: 3, borderRadius: '20px', border: '1px solid var(--border-color)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'rgba(232, 90, 79, 0.1)', color: 'var(--accent-primary)' }}>
                          <PsychologyIcon />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                            Dynamic AI Insights
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                            Deterministic & ML-driven actionable recommendations
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        size="small"
                        label={`${insights.length} active`}
                        sx={{ bgcolor: 'rgba(232, 90, 79, 0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}
                      />
                    </Stack>

                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>

                  {insights.length === 0 ? (
                    <Paper
                      sx={{
                        p: 4,
                        borderRadius: '16px',
                        textAlign: 'center',
                        border: '1px dashed var(--border-color)',
                        bgcolor: 'transparent',
                        mt: 2,
                      }}
                    >
                      <LightbulbIcon sx={{ fontSize: 50, color: '#8D8D8D', opacity: 0.5, mb: 2 }} />
                      <Typography variant="subtitle1" sx={{ color: 'var(--text-primary)', fontWeight: 700, mb: 1 }}>
                        No Recommendations Yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
                        Log tasks, finance transactions, or workout records, then run the analysis tool to produce personalized insights.
                      </Typography>
                      <IconSlideButton
                        variant="contained"
                        onClick={handleGenerateInsights}
                        disabled={generating}
                        sx={{ bgcolor: 'var(--accent-primary)', fontWeight: 600 }}
                      >
                        Run Assessment Now
                      </IconSlideButton>
                    </Paper>
                  ) : (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      {insights.map((insight) => {
                        const theme = getCategoryTheme(insight.category);
                        const route = getRecommendationRoute(insight.category);
                        return (
                          <Paper
                            key={insight.id}
                            onClick={() => {
                              if (route) {
                                trackAction('ai_insight_action_clicked', { category: insight.category, route });
                                navigate(route);
                              }
                            }}
                            sx={{
                              p: 2.5,
                              borderRadius: '16px',
                              borderLeft: theme.border,
                              bgcolor: theme.bg,
                              borderTop: '1px solid var(--border-color)',
                              borderRight: '1px solid var(--border-color)',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: route ? 'pointer' : 'default',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 'var(--shadow-soft)',
                              },
                            }}
                          >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Box sx={{ bgcolor: theme.tagBg, px: 1.2, py: 0.3, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {theme.icon}
                                  <Typography variant="caption" sx={{ color: theme.tagColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>
                                    {insight.category}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {new Date(insight.createdAt).toLocaleDateString()}
                              </Typography>
                            </Stack>

                            <Typography variant="body2" sx={{ color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
                              {insight.insightText}
                            </Typography>

                            <Stack direction="row" sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', color: 'var(--text-secondary)' }}>
                                <InfoIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption" sx={{ fontSize: '11px' }}>
                                  Source: Verified {insight.category.toLowerCase()} telemetry
                                </Typography>
                              </Stack>
                              {route && (
                                <Typography variant="caption" sx={{ color: theme.tagColor, fontWeight: 700, fontSize: '11.5px' }}>
                                  Go to {insight.category} &rarr;
                                </Typography>
                              )}
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                    </Box>

                    {/* Security / Non-sensitive Guarantee Note */}
                  <Paper
                    sx={{
                      p: 2,
                      mt: 3,
                      borderRadius: '14px',
                      bgcolor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                      <ShieldIcon sx={{ fontSize: 18, color: '#00BCD4', mt: 0.2 }} />
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong>Privacy First:</strong> Vault passwords, secret note contents, and auth tokens are strictly excluded from AI prompts and telemetry.
                      </Typography>
                    </Stack>
                  </Paper>
                </TiltCard>
              </ResizablePanel>
            </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Shared Mobile Filter Sheet for AI Insights */}
      <MobileFilterSheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Insights"
        groups={[
          {
            id: 'category',
            label: 'Insight Category',
            selectedValue: selectedCategory,
            onChange: (val) => setSelectedCategory(val as any),
            options: [
              { value: 'all', label: 'All Categories' },
              { value: 'health', label: 'Health & Wellness' },
              { value: 'finance', label: 'Finance & Spending' },
              { value: 'planner', label: 'Planner & Tasks' },
              { value: 'career', label: 'Career & Jobs' },
              { value: 'vault', label: 'Vault & Privacy' },
            ],
          },
        ]}
        onReset={() => setSelectedCategory('all')}
        onApply={() => setMobileFilterOpen(false)}
      />
    </PageWrapper>
  );
};

export default AIInsights;
