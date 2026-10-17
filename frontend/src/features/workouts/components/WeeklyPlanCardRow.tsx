import React from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  Chip
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              fontSize: '11px'
            }}
          />
          <Chip
            label={`v${plan.version}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '10px', height: 20 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={onOpenAiGenerator}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 600,
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' }
            }}
          >
            AI Plan Generator
          </Button>

          {onSyncPlanner && (
            <Button
              size="small"
              variant="outlined"
              onClick={onSyncPlanner}
              disabled={syncingPlanner}
              startIcon={<CalendarMonthIcon sx={{ fontSize: '15px !important' }} />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '12px',
                fontWeight: 600,
                borderColor: 'var(--border-color, #e2e8f0)',
                color: 'var(--text-primary)',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
              }}
            >
              {syncingPlanner ? 'Syncing...' : 'Sync to Planner'}
            </Button>
          )}

          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              bgcolor: 'var(--bg-card, #ffffff)',
              borderRadius: '10px',
              p: 0.3,
              boxShadow: 'var(--shadow-soft)'
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
              color: 'var(--text-secondary)'
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
          pt: 0.5
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
    </Box>
  );
};
