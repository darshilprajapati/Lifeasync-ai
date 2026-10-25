import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { UserWorkoutPlan, WorkoutDay, WorkoutWeekSummary } from './types/workout';
import { workoutService } from './services/workoutService';
import { WeeklyPlanCardRow } from './components/WeeklyPlanCardRow';
import { BodyFocusBalanceWidget } from './components/BodyFocusBalanceWidget';
import { WeeklyTipsWidget } from './components/WeeklyTipsWidget';
import { EditWorkoutDayModal } from './components/EditWorkoutDayModal';
import { WorkoutDayDetailModal } from './components/WorkoutDayDetailModal';
import { AiPlanGeneratorWidget } from './components/AiPlanGeneratorWidget';
import { trackAction } from '../../utils/analytics';
import { formatLocalDate } from './utils/workoutDateUtils';
import { useNotification } from '../../context/NotificationContext';

import { useThemeSystem } from '../../context/ThemeContext';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';

interface WorkoutPlannerDashboardProps {
  onWorkoutChanged?: () => void;
  openAiGeneratorExternal?: boolean;
  onCloseAiGeneratorExternal?: () => void;
}

export const WorkoutPlannerDashboard: React.FC<WorkoutPlannerDashboardProps> = ({
  onWorkoutChanged,
  openAiGeneratorExternal = false,
  onCloseAiGeneratorExternal
}) => {
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<UserWorkoutPlan | null>(null);
  const [summary, setSummary] = useState<WorkoutWeekSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const [detailModalDay, setDetailModalDay] = useState<{ day: WorkoutDay; date: Date } | null>(null);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState<boolean>(false);
  const [syncingPlanner, setSyncingPlanner] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (openAiGeneratorExternal) {
      setAiGeneratorOpen(true);
    }
  }, [openAiGeneratorExternal]);

  const loadData = useCallback(async (date: Date) => {
    try {
      setError(null);
      const dateStr = formatLocalDate(date);
      const [loadedPlan, loadedSummary] = await Promise.all([
        workoutService.getActivePlan(dateStr),
        workoutService.getWeekSummary(dateStr)
      ]);
      setPlan(loadedPlan);
      setSummary(loadedSummary);
    } catch (err: any) {
      console.error('Failed to load workout data:', err);
      const errMsg = err?.response?.data?.message || 'Failed to load workout routine.';
      setError(errMsg);
      notify.error(errMsg, 'Load Error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    setLoading(true);
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  useEffect(() => {
    const handleWorkoutEvent = async () => {
      loadData(selectedDate);
      if (detailModalDay) {
        try {
          const dateStr = formatLocalDate(selectedDate);
          const refreshedDay = await workoutService.getDay(detailModalDay.day.id, dateStr);
          if (refreshedDay) {
            setDetailModalDay((prev) => (prev ? { ...prev, day: refreshedDay } : null));
          }
        } catch (e) {
          console.error('Failed to refresh open day modal on workout update:', e);
        }
      }
    };

    window.addEventListener('lifesync:workout-updated', handleWorkoutEvent);
    return () => {
      window.removeEventListener('lifesync:workout-updated', handleWorkoutEvent);
    };
  }, [selectedDate, detailModalDay, loadData]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Compute Monday & Sunday for week label
  const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const currentMonday = getMonday(selectedDate);
  const sunday = new Date(currentMonday);
  sunday.setDate(sunday.getDate() + 6);
  const weekRangeString = `${currentMonday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const handleSyncPlanner = async () => {
    setSyncingPlanner(true);
    setSyncSuccessMsg(null);
    try {
      const dateStr = formatLocalDate(selectedDate);
      const count = await workoutService.syncPlanner(dateStr);
      const msg = `Successfully synced ${count} workout session${count === 1 ? '' : 's'} to your Planner!`;
      setSyncSuccessMsg(msg);
      notify.success(msg, 'Planner Synchronized');
      trackAction('workout_synced_to_planner', { module: 'workout', synced_count: count });
    } catch (err: any) {
      console.error('Failed to sync to planner:', err);
      const errMsg = err?.response?.data?.message || 'Failed to sync workouts to planner.';
      setError(errMsg);
      notify.error(errMsg, 'Sync Failed');
    } finally {
      setSyncingPlanner(false);
    }
  };

  const handleDaySaved = (updatedDay: WorkoutDay) => {
    if (!plan) return;
    setPlan({
      ...plan,
      days: plan.days.map((d) => (d.id === updatedDay.id ? updatedDay : d))
    });
    loadData(selectedDate);
    onWorkoutChanged?.();
  };

  const handleDayDetailUpdated = (updatedDay: WorkoutDay) => {
    if (detailModalDay) {
      setDetailModalDay({ ...detailModalDay, day: updatedDay });
    }
    handleDaySaved(updatedDay);
  };

  const handlePlanApplied = (newPlan: UserWorkoutPlan) => {
    setPlan(newPlan);
    setAiGeneratorOpen(false);
    loadData(selectedDate);
    trackAction('ai_workout_plan_applied', { module: 'workout', plan_title: newPlan.title });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pb: 4 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{
            borderRadius: isProf ? '0px' : '12px',
            border: isProf ? '1px solid #DFE1E6' : undefined,
            boxShadow: isProf ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setLoading(true);
                loadData(selectedDate);
              }}
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {syncSuccessMsg && (
        <Alert
          severity="success"
          onClose={() => setSyncSuccessMsg(null)}
          sx={{
            borderRadius: isProf ? '0px' : '12px',
            border: isProf ? '1px solid #DFE1E6' : undefined
          }}
        >
          {syncSuccessMsg}
        </Alert>
      )}

      {/* ========================================================
          PANEL 1: WEEKLY WORKOUT PLANNER (Mon - Sun Schedule)
          ======================================================== */}
      {loading && !plan ? (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Weekly Workout Planner
              </Typography>
              <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: isProf ? '0px' : '10px' }} />
            </Stack>
            <Skeleton variant="rounded" width={200} height={32} sx={{ borderRadius: isProf ? '0px' : '8px' }} />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(7, minmax(0, 1fr))'
              },
              gap: 1.5
            }}
          >
            {[...Array(7)].map((_, i) => (
              <Card
                key={i}
                sx={{
                  borderRadius: isProf ? '0px' : '18px',
                  p: 2,
                  height: 240,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isProf ? 'none' : 'var(--shadow-soft)'
                }}
              >
                <Box>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="90%" height={26} sx={{ my: 1 }} />
                  <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: isProf ? '0px' : '8px', my: 1 }} />
                </Box>
                <Skeleton variant="rounded" width="100%" height={32} sx={{ borderRadius: isProf ? '0px' : '10px' }} />
              </Card>
            ))}
          </Box>
        </Box>
      ) : plan ? (
        <WeeklyPlanCardRow
          plan={plan}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onOpenDetail={(day, date) => setDetailModalDay({ day, date })}
          onEditDay={(day) => setEditingDay(day)}
          onOpenAiGenerator={() => setAiGeneratorOpen(true)}
          onSyncPlanner={handleSyncPlanner}
          syncingPlanner={syncingPlanner}
        />
      ) : (
        /* Empty / Error state placeholder: Never allow the planner UI to vanish */
        <Card
          sx={{
            mb: 3,
            p: { xs: 3, md: 4 },
            borderRadius: isProf ? '0px' : '20px',
            border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(255, 115, 56, 0.25)',
            background: isProf
              ? 'var(--card-bg)'
              : isDark
              ? 'linear-gradient(135deg, rgba(30, 34, 52, 0.9) 0%, rgba(20, 23, 36, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 243, 0.9) 100%)',
            boxShadow: isProf ? 'var(--shadow-soft)' : '0 12px 32px -4px rgba(255, 115, 56, 0.15)',
            backdropFilter: isProf ? 'none' : 'blur(12px)'
          }}
        >
          <Stack
            direction="row"
            sx={{ mb: 3, flexWrap: 'wrap', gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Weekly Workout Planner
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  bgcolor: 'var(--bg-secondary)',
                  borderRadius: isProf ? '0px' : '10px',
                  p: 0.3,
                  boxShadow: isProf ? 'none' : 'var(--shadow-soft)'
                }}
              >
                <IconButton size="small" onClick={handlePrevWeek}>
                  <ChevronLeftIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Typography variant="caption" sx={{ px: 1, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {weekRangeString}
                </Typography>
                <IconButton size="small" onClick={handleNextWeek}>
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>

              <Button
                size="small"
                variant="text"
                onClick={handleToday}
                startIcon={<TodayIcon sx={{ fontSize: 15 }} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  borderRadius: isProf ? '0px' : '8px'
                }}
              >
                Today
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              textAlign: 'center',
              maxWidth: 520,
              mx: 'auto'
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: isProf ? '0px' : '18px',
                bgcolor: 'rgba(255, 115, 56, 0.12)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: isProf ? 'none' : '0 8px 20px rgba(255, 115, 56, 0.2)'
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1 }}>
              {error ? 'Unable to Load Active Weekly Routine' : 'No Active Weekly Routine Found'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
              {error
                ? 'A data connection issue prevented loading your current workout schedule. You can retry the request or generate a new science-backed personalized routine now.'
                : 'Start your periodized fitness journey with science-backed workouts tailored to your goals, muscle balance, and available equipment.'}
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => setAiGeneratorOpen(true)}
                startIcon={<AutoAwesomeIcon />}
                sx={{
                  px: 3,
                  py: 1.1,
                  borderRadius: isProf ? '0px' : '12px',
                  fontWeight: 700,
                  bgcolor: 'var(--accent-primary)',
                  boxShadow: isProf ? 'none' : '0 6px 18px rgba(255, 115, 56, 0.35)'
                }}
              >
                Generate AI Workout Plan
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setLoading(true);
                  loadData(selectedDate);
                }}
                startIcon={<RefreshIcon />}
                sx={{
                  px: 2.5,
                  py: 1.1,
                  borderRadius: isProf ? '0px' : '12px',
                  fontWeight: 700,
                  borderColor: isProf ? 'var(--card-border)' : 'var(--accent-primary)',
                  color: isProf ? 'var(--text-primary)' : 'var(--accent-primary)'
                }}
              >
                Retry
              </Button>
            </Stack>
          </Box>
        </Card>
      )}

      {/* ========================================================
          PANELS:
          1. Body Focus & Balance
          2. AI Coaching & Recovery Tips
          ======================================================== */}
      <Grid container spacing={3}>
        {/* PANEL: Body Focus & Balance */}
        <Grid size={{ xs: 12, md: 6 }}>
          <BodyFocusBalanceWidget
            completedDistribution={summary?.completedMuscleGroupFocusPercentages || {}}
          />
        </Grid>

        {/* PANEL: AI Coaching & Recovery Tips */}
        <Grid size={{ xs: 12, md: 6 }}>
          <WeeklyTipsWidget
            tips={summary?.personalizedCoachingTips || []}
            goal={plan?.goal}
            fitnessLevel={plan?.fitnessLevel}
          />
        </Grid>
      </Grid>

      {/* Workout Day Detail Modal with Exercise-by-Exercise Completion */}
      {detailModalDay && (
        <WorkoutDayDetailModal
          open={Boolean(detailModalDay)}
          day={detailModalDay.day}
          calendarDate={detailModalDay.date}
          onClose={() => setDetailModalDay(null)}
          onDayUpdated={handleDayDetailUpdated}
        />
      )}

      {/* Customize Day Modal */}
      <EditWorkoutDayModal
        open={Boolean(editingDay)}
        day={editingDay}
        onClose={() => setEditingDay(null)}
        onSaveSuccess={handleDaySaved}
      />

      {/* AI Plan Generator Dialog */}
      <Dialog
        open={aiGeneratorOpen}
        onClose={() => {
          setAiGeneratorOpen(false);
          onCloseAiGeneratorExternal?.();
        }}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Generate Custom Weekly Routine
          </Typography>
          <IconButton
            onClick={() => {
              setAiGeneratorOpen(false);
              onCloseAiGeneratorExternal?.();
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: '14px !important', overflowY: 'auto' }}>
          <AiPlanGeneratorWidget
            onPlanApplied={handlePlanApplied}
            onClose={() => {
              setAiGeneratorOpen(false);
              onCloseAiGeneratorExternal?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
