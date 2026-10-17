import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
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
import { WorkoutProgressWidget } from './components/WorkoutProgressWidget';
import { BodyFocusBalanceWidget } from './components/BodyFocusBalanceWidget';
import { WeeklyTipsWidget } from './components/WeeklyTipsWidget';
import { ExerciseLibrarySection } from './components/ExerciseLibrarySection';
import { EditWorkoutDayModal } from './components/EditWorkoutDayModal';
import { AiPlanGeneratorWidget } from './components/AiPlanGeneratorWidget';
import { trackAction } from '../../utils/analytics';

export const WorkoutPlannerDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<UserWorkoutPlan | null>(null);
  const [summary, setSummary] = useState<WorkoutWeekSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState<boolean>(false);
  const [syncingPlanner, setSyncingPlanner] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleSyncPlanner = async () => {
    setSyncingPlanner(true);
    setSyncSuccessMsg(null);
    try {
      const count = await workoutService.syncPlanner(selectedDate.toISOString());
      setSyncSuccessMsg(`Successfully synced ${count} workout sessions to your Planner!`);
      trackAction('workout_synced_to_planner', { module: 'workout', synced_count: count });
    } catch (err: any) {
      console.error('Failed to sync to planner:', err);
      setError(err?.response?.data?.message || 'Failed to sync workouts to planner.');
    } finally {
      setSyncingPlanner(false);
    }
  };

  const loadData = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateIso = date.toISOString();
      const [loadedPlan, loadedSummary] = await Promise.all([
        workoutService.getActivePlan(dateIso),
        workoutService.getWeekSummary(dateIso)
      ]);
      setPlan(loadedPlan);
      setSummary(loadedSummary);
    } catch (err: any) {
      console.error('Failed to load workout data:', err);
      setError(err?.response?.data?.message || 'Failed to load workout routine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const handleToggleComplete = async (day: WorkoutDay, date: Date) => {
    if (day.isRestDay) return;

    try {
      if (day.isCompletedForDate && day.sessionLogId) {
        // Un-complete session
        await workoutService.deleteSessionLog(day.sessionLogId);
        trackAction('workout_session_uncompleted', { module: 'workout', day_id: day.id });
      } else {
        // Complete session
        const sessionDateStr = date.toISOString().split('T')[0];
        await workoutService.logSession({
          workoutDayId: day.id,
          sessionDate: sessionDateStr,
          isCompleted: true,
          actualDurationMinutes: day.targetDurationMinutes || 30
        });
        trackAction('workout_session_completed', {
          module: 'workout',
          day_id: day.id,
          duration: day.targetDurationMinutes
        });
      }

      // Reload fresh data
      await loadData(selectedDate);
    } catch (err: any) {
      console.error('Failed to toggle workout completion:', err);
      setError(err?.response?.data?.message || 'Failed to update workout status.');
    }
  };

  const handleDaySaved = (updatedDay: WorkoutDay) => {
    if (!plan) return;
    setPlan({
      ...plan,
      days: plan.days.map((d) => (d.id === updatedDay.id ? updatedDay : d))
    });
    loadData(selectedDate);
  };

  const handlePlanApplied = (newPlan: UserWorkoutPlan) => {
    setPlan(newPlan);
    setAiGeneratorOpen(false);
    loadData(selectedDate);
    trackAction('ai_workout_plan_applied', { module: 'workout', plan_title: newPlan.title });
  };

  if (loading && !plan) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
        <CircularProgress size={36} sx={{ color: 'var(--accent-primary)' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {syncSuccessMsg && (
        <Alert severity="success" onClose={() => setSyncSuccessMsg(null)} sx={{ borderRadius: '12px' }}>
          {syncSuccessMsg}
        </Alert>
      )}

      {/* 1. 7-Day Horizontal Weekly Plan Row */}
      {plan && (
        <WeeklyPlanCardRow
          plan={plan}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onToggleComplete={handleToggleComplete}
          onEditDay={(day) => setEditingDay(day)}
          onOpenAiGenerator={() => setAiGeneratorOpen(true)}
          onSyncPlanner={handleSyncPlanner}
          syncingPlanner={syncingPlanner}
        />
      )}

      {/* 2. Middle Row: Progress, Body Focus & AI Tips */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <WorkoutProgressWidget summary={summary} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BodyFocusBalanceWidget
            distribution={summary?.muscleGroupFocusPercentages || {}}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <WeeklyTipsWidget />
        </Grid>
      </Grid>

      {/* 3. Full Exercise Library with Dual Equipment Mode */}
      <Box sx={{ mt: 2 }}>
        <ExerciseLibrarySection
          actionLabel="View Details"
        />
      </Box>

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
        onClose={() => setAiGeneratorOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Generate Custom Weekly Routine
          </Typography>
          <IconButton onClick={() => setAiGeneratorOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          <AiPlanGeneratorWidget
            onPlanApplied={handlePlanApplied}
            onClose={() => setAiGeneratorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
