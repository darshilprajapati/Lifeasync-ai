import React, { useState, useEffect } from 'react';
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
import { WorkoutProgressWidget } from './components/WorkoutProgressWidget';
import { BodyFocusBalanceWidget } from './components/BodyFocusBalanceWidget';
import { WeeklyTipsWidget } from './components/WeeklyTipsWidget';
import { EditWorkoutDayModal } from './components/EditWorkoutDayModal';
import { WorkoutDayDetailModal } from './components/WorkoutDayDetailModal';
import { AiPlanGeneratorWidget } from './components/AiPlanGeneratorWidget';
import LogoLoader from '../../components/LogoLoader';
import { trackAction } from '../../utils/analytics';

export const WorkoutPlannerDashboard: React.FC = () => {
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

  const loadData = async (date: Date) => {
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
    setLoading(true);
    loadData(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

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

  const handleDaySaved = (updatedDay: WorkoutDay) => {
    if (!plan) return;
    setPlan({
      ...plan,
      days: plan.days.map((d) => (d.id === updatedDay.id ? updatedDay : d))
    });
    loadData(selectedDate);
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

  if (loading && !plan) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
        <LogoLoader />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, pb: 4 }}>
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

      {/* ========================================================
          PANEL 1: WEEKLY WORKOUT PLANNER (Mon - Sun Schedule)
          ======================================================== */}
      {plan && (
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
      )}

      {/* ========================================================
          PANELS 2, 3, 4:
          2. Weekly Progress & Adherence
          3. Body Focus & Balance
          4. AI Coaching & Recovery Tips
          ======================================================== */}
      <Grid container spacing={3}>
        {/* PANEL 2: Weekly Progress & Adherence */}
        <Grid size={{ xs: 12, md: 4 }}>
          <WorkoutProgressWidget summary={summary} />
        </Grid>

        {/* PANEL 3: Body Focus & Balance */}
        <Grid size={{ xs: 12, md: 4 }}>
          <BodyFocusBalanceWidget
            distribution={summary?.muscleGroupFocusPercentages || {}}
          />
        </Grid>

        {/* PANEL 4: AI Coaching & Recovery Tips */}
        <Grid size={{ xs: 12, md: 4 }}>
          <WeeklyTipsWidget />
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
        onClose={() => setAiGeneratorOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
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
