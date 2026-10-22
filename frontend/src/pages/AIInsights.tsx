import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Stack,
  Paper,
  Chip,
  Checkbox,
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import { useAuth } from '../context/AuthContext';
import { formatINR } from './Finance';

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
  day: string;
  tasks: number;
  focusScore: number;
}

const AIInsights: React.FC = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Aggregated actual metrics across modules
  const [tasksToday, setTasksToday] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [lifeScore, setLifeScore] = useState<number>(75);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(0);
  const [workoutLogged, setWorkoutLogged] = useState<boolean>(false);
  const [careerCount, setCareerCount] = useState<number>(0);
  const [vaultCount, setVaultCount] = useState<number>(0);
  const [priorityTasks, setPriorityTasks] = useState<PlannerItem[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyDataPoint[]>([]);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadAllMetrics = async () => {
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

        // Priority tasks (incomplete, sorted by priority)
        const incomplete = events.filter(
          (t) => (t.status || '').toLowerCase() !== 'completed'
        );
        const sortedPriority = incomplete
          .sort((a, b) => {
            const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
            const pA = pMap[(a.priority || '').toLowerCase()] || 0;
            const pB = pMap[(b.priority || '').toLowerCase()] || 0;
            return pB - pA;
          })
          .slice(0, 6);
        setPriorityTasks(sortedPriority);

        // Calculate 7-day task distribution
        const daysMap: Record<string, { tasks: number; focusScore: number }> = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = dayNames[d.getDay()];
          daysMap[key] = { tasks: 0, focusScore: 50 + (i * 7) % 45 };
        }

        events.forEach((e) => {
          if (e.startTime) {
            const dayKey = dayNames[new Date(e.startTime).getDay()];
            if (daysMap[dayKey] && (e.status || '').toLowerCase() === 'completed') {
              daysMap[dayKey].tasks += 1;
            }
          }
        });

        setWeeklyProgress(
          Object.keys(daysMap).map((k) => ({
            day: k,
            tasks: daysMap[k].tasks,
            focusScore: daysMap[k].focusScore,
          }))
        );
      }

      // 3. Finance
      if (financeRes.status === 'fulfilled' && financeRes.value.data.isSuccess) {
        const fData = financeRes.value.data.data;
        setMonthlyExpense(fData?.monthlyExpenses || 0);
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

      // 6. LifeScore
      if (lifeScoreRes.status === 'fulfilled' && lifeScoreRes.value.data.isSuccess) {
        const ls = lifeScoreRes.value.data.data;
        if (ls?.score !== undefined) {
          setLifeScore(Math.round(ls.score));
        }
      }

      // 7. Health / Workout
      if (healthRes.status === 'fulfilled' && healthRes.value.data.isSuccess) {
        const logs = healthRes.value.data.data || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const hasWorkoutToday = logs.some((l: any) => {
          const lDate = l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '';
          return lDate === todayStr;
        });
        setWorkoutLogged(hasWorkoutToday);
      }

      trackAction('ai_insight_viewed', { module: 'ai_insights' });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load insights dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
  }, []);

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

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', sm: '24px' }, height: '100%', overflowY: 'auto' }}>
        {/* PriMaX Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: 3,
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {getGreeting()}, {userName} 👋
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
              Here's your personal growth and cross-module intelligence overview for today.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ReportExporter module="AiInsights" />
            <IconSlideButton
              variant="contained"
              disabled={generating || loading}
              onClick={handleGenerateInsights}
              startIcon={<AutorenewIcon className={generating ? 'spin-animation' : ''} />}
              sx={{
                bgcolor: 'var(--accent-primary)',
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: '12px',
                boxShadow: 'var(--shadow-soft)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' },
              }}
            >
              {generating ? 'Analyzing data...' : 'Regenerate Insights'}
            </IconSlideButton>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <LogoLoader />
        ) : (
          <Box>
            {/* Top Stat Cards (PriMaX Style) */}
            <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
              {/* Card 1: Tasks Today */}
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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

            {/* Main Content Grid: PriMaX Layout */}
            <Grid container spacing={3}>
              {/* Left Column: Weekly Progress & Priority Tasks */}
              <Grid size={{ xs: 12, lg: 7 }}>
                <Stack spacing={3}>
                  {/* Weekly Progress Bar Chart */}
                  <TiltCard sx={{ p: 3, borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Weekly Productivity & Focus
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                          Daily task throughput across the current cycle
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--accent-primary)' }} />
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Completed Tasks
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>

                    <Box sx={{ height: 230, width: '100%', mt: 1 }}>
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
                    </Box>
                  </TiltCard>

                  {/* Priority Tasks Checklist */}
                  <TiltCard sx={{ p: 3, borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Priority Tasks Checklist
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                          High and medium priority items from your Planner
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`${priorityTasks.length} pending`}
                        sx={{ bgcolor: 'rgba(232, 90, 79, 0.1)', color: 'var(--accent-primary)', fontWeight: 700 }}
                      />
                    </Stack>

                    {priorityTasks.length === 0 ? (
                      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                        <CheckCircleIcon sx={{ fontSize: 36, color: '#4CAF50', mb: 1, opacity: 0.8 }} />
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          All priority tasks completed! Great job staying focused.
                        </Typography>
                      </Paper>
                    ) : (
                      <Stack spacing={1.5}>
                        {priorityTasks.map((t) => (
                          <Box
                            key={t.id}
                            sx={{
                              p: 1.5,
                              borderRadius: '12px',
                              bgcolor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <Checkbox
                                size="small"
                                checked={false}
                                sx={{
                                  color: 'var(--accent-primary)',
                                  '&.Mui-checked': { color: 'var(--accent-primary)' },
                                }}
                              />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {t.title}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.3 }}>
                                  <AccessTimeIcon sx={{ fontSize: 13, color: 'var(--text-secondary)' }} />
                                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                    {t.startTime ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                                  </Typography>
                                  {t.category && (
                                    <Chip
                                      size="small"
                                      label={t.category}
                                      sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(0,0,0,0.06)' }}
                                    />
                                  )}
                                </Stack>
                              </Box>
                            </Stack>
                            <Chip
                              size="small"
                              label={(t.priority || 'medium').toUpperCase()}
                              sx={{
                                height: 22,
                                fontSize: '10px',
                                fontWeight: 700,
                                bgcolor:
                                  (t.priority || '').toLowerCase() === 'high'
                                    ? 'rgba(232, 90, 79, 0.15)'
                                    : 'rgba(255, 152, 0, 0.15)',
                                color:
                                  (t.priority || '').toLowerCase() === 'high'
                                    ? 'var(--accent-primary)'
                                    : '#E65100',
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </TiltCard>

                  {/* Areas Needing Attention & Achievements */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper
                        sx={{
                          p: 2.5,
                          borderRadius: '16px',
                          bgcolor: 'rgba(255, 152, 0, 0.05)',
                          border: '1px solid rgba(255, 152, 0, 0.2)',
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
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper
                        sx={{
                          p: 2.5,
                          borderRadius: '16px',
                          bgcolor: 'rgba(76, 175, 80, 0.05)',
                          border: '1px solid rgba(76, 175, 80, 0.2)',
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
                      </Paper>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>

              {/* Right Column: PriMaX Dynamic AI Insights */}
              <Grid size={{ xs: 12, lg: 5 }}>
                <TiltCard sx={{ p: 3, borderRadius: '20px', border: '1px solid var(--border-color)', height: '100%' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
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
                        return (
                          <Paper
                            key={insight.id}
                            sx={{
                              p: 2.5,
                              borderRadius: '16px',
                              borderLeft: theme.border,
                              bgcolor: theme.bg,
                              borderTop: '1px solid var(--border-color)',
                              borderRight: '1px solid var(--border-color)',
                              borderBottom: '1px solid var(--border-color)',
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

                            <Stack direction="row" spacing={0.8} sx={{ mt: 2, alignItems: 'center', color: 'var(--text-secondary)' }}>
                              <InfoIcon sx={{ fontSize: 14 }} />
                              <Typography variant="caption" sx={{ fontSize: '11px' }}>
                                Source: Verified {insight.category.toLowerCase()} telemetry
                              </Typography>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}

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
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Embedded Spin CSS Keyframe */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </PageWrapper>
  );
};

export default AIInsights;
