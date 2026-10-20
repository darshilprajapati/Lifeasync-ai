import React from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useThemeSystem } from '../../../context/ThemeContext';
import type { WorkoutDay, UserWorkoutPlan } from '../types/workout';
import { WorkoutDayCard } from './WorkoutDayCard';

interface WeeklyPlanCardRowProps {
  plan: UserWorkoutPlan;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onOpenDetail: (day: WorkoutDay, date: Date) => void;
  onEditDay: (day: WorkoutDay) => void;
  onOpenAiGenerator: () => void;
  onSyncPlanner?: () => void;
  syncingPlanner?: boolean;
}

export const WeeklyPlanCardRow: React.FC<WeeklyPlanCardRowProps> = ({
  plan,
  selectedDate,
  onDateChange,
  onOpenDetail,
  onEditDay,
  onOpenAiGenerator,
  onSyncPlanner,
  syncingPlanner
}) => {
  const { designSystem } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const [confirmSyncOpen, setConfirmSyncOpen] = React.useState(false);

  // Compute Monday of the selected week
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

  const isTodayDate = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Re-map plan days to Monday..Sunday order
  // DayOfWeek in .NET: Sunday = 0, Monday = 1, ... Saturday = 6
  const orderedDays = [...(plan.days || [])].sort((a, b) => {
    const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  const weekRangeString = `${currentMonday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Weekly Header Controls */}
      <Stack
        direction="row"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Weekly Workout Planner
          </Typography>
          <Chip
            label={plan.title || 'My Routine'}
            size="small"
            sx={{
              borderRadius: isProf ? '0px !important' : '10px',
              bgcolor: isProf ? 'transparent' : 'rgba(255, 115, 56, 0.12)',
              border: isProf ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 115, 56, 0.25)',
              color: 'var(--accent-primary)',
              fontWeight: 700,
              fontSize: '11px'
            }}
          />
          <Chip
            label={`v${plan.version}`}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: isProf ? '0px !important' : '8px',
              fontSize: '10px',
              height: 20,
              borderColor: isProf ? 'var(--card-border)' : undefined
            }}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={onOpenAiGenerator}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              borderRadius: isProf ? '0px !important' : '10px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 700,
              borderColor: isProf ? 'var(--accent-primary)' : 'rgba(255, 115, 56, 0.35)',
              color: 'var(--accent-primary)',
              boxShadow: !isProf ? '0 2px 8px rgba(255, 115, 56, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)' : 'none',
              transition: isProf ? 'background-color 0.15s ease' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              '&:hover': {
                bgcolor: 'rgba(255, 115, 56, 0.08)',
                borderColor: 'var(--accent-primary)',
                transform: isProf ? 'none' : 'translateY(-2px)'
              },
              '&:active': {
                transform: isProf ? 'none' : 'translateY(1px)'
              }
            }}
          >
            AI Plan Generator
          </Button>

          {onSyncPlanner && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setConfirmSyncOpen(true)}
              disabled={syncingPlanner}
              startIcon={<CalendarMonthIcon sx={{ fontSize: '15px !important' }} />}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 600,
                borderColor: isProf ? 'var(--card-border)' : 'rgba(255, 255, 255, 0.2)',
                color: 'var(--text-primary)',
                boxShadow: !isProf ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                '&:hover': {
                  bgcolor: isProf ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                  transform: isProf ? 'none' : 'translateY(-2px)'
                },
                '&:active': {
                  transform: isProf ? 'none' : 'translateY(1px)'
                }
              }}
            >
              {syncingPlanner ? 'Syncing...' : 'Sync to Planner'}
            </Button>
          )}

          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              bgcolor: 'var(--card-bg)',
              borderRadius: isProf ? '0px !important' : '12px',
              border: isProf ? '1px solid var(--card-border)' : '1px solid rgba(255, 255, 255, 0.15)',
              p: 0.3,
              boxShadow: isProf ? 'var(--shadow-soft)' : '0 4px 14px rgba(0,0,0,0.06)'
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
            startIcon={<TodayIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              borderRadius: isProf ? '0px !important' : '8px',
              '&:hover': {
                color: 'var(--accent-primary)',
                bgcolor: 'rgba(255, 115, 56, 0.06)'
              }
            }}
          >
            Today
          </Button>
        </Stack>
      </Stack>

      {/* 7-Card Responsive Desktop Grid / Tablet / Mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(7, minmax(0, 1fr))'
          },
          gap: { xs: 1.5, sm: 1.5, md: 1.5, lg: 1, xl: 1.5 },
          width: '100%',
          overflowX: 'visible',
          pb: 1,
          pt: 1
        }}
      >
        {orderedDays.map((day, idx) => {
          const cardDate = new Date(currentMonday);
          cardDate.setDate(cardDate.getDate() + idx);
          const isToday = isTodayDate(cardDate);

          return (
            <WorkoutDayCard
              key={day.id || idx}
              day={day}
              calendarDate={cardDate}
              isToday={isToday}
              onOpenDetail={onOpenDetail}
              onEdit={onEditDay}
            />
          );
        })}
      </Box>

      {/* Deliberate Confirmation Dialog for Personal Planner Export */}
      <Dialog
        open={confirmSyncOpen}
        onClose={() => setConfirmSyncOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              p: 1
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Export Workouts to Personal Planner?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            This deliberate action exports active scheduled workouts for the selected calendar week into your Personal Planner calendar.
            Workouts are otherwise maintained independently inside the Workout Planner.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmSyncOpen(false)}
            sx={{ textTransform: 'none', color: 'var(--text-secondary)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmSyncOpen(false);
              onSyncPlanner?.();
            }}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: 'var(--accent-primary)',
              '&:hover': { bgcolor: 'var(--accent-primary-hover, #4f46e5)' }
            }}
          >
            Confirm Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
