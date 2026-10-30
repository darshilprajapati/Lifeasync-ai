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
  DialogActions,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HotelIcon from '@mui/icons-material/Hotel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useThemeSystem } from '../../../context/ThemeContext';
import type { WorkoutDay, UserWorkoutPlan } from '../types/workout';
import { WorkoutDayCard } from './WorkoutDayCard';
import {
  getMondayOfWeek,
  isSameDay,
  isDateToday,
  isDatePast,
  getDayIndexInWeek,
  getTodayLocalDate
} from '../utils/workoutDateUtils';

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
  const { designSystem, mode } = useThemeSystem();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const [confirmSyncOpen, setConfirmSyncOpen] = React.useState(false);
  const [showAllExercises, setShowAllExercises] = React.useState(false);

  // Compute Monday of the selected week safely
  const currentMonday = getMondayOfWeek(selectedDate);
  const sunday = new Date(currentMonday);
  sunday.setDate(sunday.getDate() + 6);

  // Today's actual local calendar date
  const today = getTodayLocalDate();
  const todayMonday = getMondayOfWeek(today);
  const isViewingCurrentWeek = isSameDay(currentMonday, todayMonday);

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
    onDateChange(getTodayLocalDate());
  };

  // Re-map plan days to Monday..Sunday order
  // DayOfWeek in .NET: Sunday = 0, Monday = 1, ... Saturday = 6
  const orderedDays = [...(plan.days || [])].sort((a, b) => {
    const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  // Calculate day index within current week
  // When selectedDate is today, selectedDayIdx is today's index (e.g. 5 for Saturday)
  const selectedDayIdx = getDayIndexInWeek(selectedDate, currentMonday);

  const weekRangeString = `${currentMonday.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Weekly Header Controls (Desktop Only) */}
      {!isMobile && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.2, sm: 2 }}
          sx={{
            mb: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.2
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.8 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontSize: { xs: '1.05rem', sm: '1.25rem' }
              }}
            >
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
                fontSize: '11px',
                maxWidth: { xs: 180, sm: 'none' }
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

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.8,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' }
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenAiGenerator}
              startIcon={<AutoAwesomeIcon sx={{ fontSize: '15px !important' }} />}
              sx={{
                borderRadius: isProf ? '0px !important' : '10px',
                textTransform: 'none',
                fontSize: { xs: '11px', sm: '12px' },
                fontWeight: 700,
                borderColor: isProf ? 'var(--accent-primary)' : 'rgba(255, 115, 56, 0.35)',
                color: 'var(--accent-primary)',
                boxShadow: !isProf ? '0 2px 8px rgba(255, 115, 56, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)' : 'none',
                transition: isProf ? 'background-color 0.15s ease' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                px: { xs: 1, sm: 1.4 },
                py: { xs: 0.4, sm: 0.6 },
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
                  fontSize: { xs: '11px', sm: '12px' },
                  fontWeight: 600,
                  borderColor: isProf ? 'var(--card-border)' : 'rgba(255, 255, 255, 0.2)',
                  color: 'var(--text-primary)',
                  boxShadow: !isProf ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                  px: { xs: 1, sm: 1.4 },
                  py: { xs: 0.4, sm: 0.6 },
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
              <IconButton size="small" onClick={handlePrevWeek} sx={{ p: 0.4 }}>
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Typography variant="caption" sx={{ px: 0.8, fontWeight: 600, color: 'var(--text-primary)', fontSize: { xs: '10.5px', sm: '12px' } }}>
                {weekRangeString}
              </Typography>
              <IconButton size="small" onClick={handleNextWeek} sx={{ p: 0.4 }}>
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
                fontSize: { xs: '11px', sm: '12px' },
                fontWeight: 600,
                color: 'var(--text-secondary)',
                borderRadius: isProf ? '0px !important' : '8px',
                px: { xs: 0.8, sm: 1.2 },
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
      )}

      {isMobile ? (
        /* Option B — Workout First Mobile View (Reference Screenshot 4) */
        <Stack spacing={2.2} sx={{ pb: 1 }}>
          {/* Active Day Data */}
          {(() => {
            const activeDay = orderedDays[selectedDayIdx] || orderedDays[0];
            const activeDate = new Date(currentMonday);
            activeDate.setDate(activeDate.getDate() + selectedDayIdx);
            const isToday = isDateToday(activeDate);
            const isPast = isDatePast(activeDate);
            const exercises = activeDay?.exercises || [];
            const displayExercises = showAllExercises ? exercises : exercises.slice(0, 3);
            const dateDisplay = activeDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const completedCount = exercises.filter((e) => e.isCompleted).length;
            const totalCount = exercises.length;
            const isFullyCompleted = activeDay?.isCompletedForDate || (totalCount > 0 && completedCount === totalCount);

            return (
              <Stack spacing={2}>
                {/* 1. Today's / Selected Day's Workout Card FIRST */}
                <Box
                  sx={{
                    p: 2.2,
                    borderRadius: '24px',
                    bgcolor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 10px 30px rgba(232, 90, 79, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header: Icon + Card Title + Date Badge */}
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          color: activeDay?.isRestDay ? '#8B5CF6' : 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {activeDay?.isRestDay ? (
                          <HotelIcon sx={{ fontSize: 20 }} />
                        ) : (
                          <FitnessCenterIcon sx={{ fontSize: 20 }} />
                        )}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                        {isToday
                          ? "Today's Workout"
                          : isPast
                          ? 'Past Workout'
                          : 'Upcoming Workout'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                      {isToday && (
                        <Box
                          sx={{
                            bgcolor: 'var(--accent-primary)',
                            color: '#ffffff',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            px: 0.8,
                            py: 0.2,
                            borderRadius: '6px',
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase'
                          }}
                        >
                          Today
                        </Box>
                      )}
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 650, fontSize: '11.5px' }}>
                        {dateDisplay}
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Main Body: Focus Title + Badges + Exercise Checklist / Rest State + Graphic */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flex: 1, pr: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 850,
                          color: activeDay?.isRestDay ? '#8B5CF6' : 'var(--text-primary)',
                          fontSize: '18px',
                          mb: 0.8,
                          lineHeight: 1.2
                        }}
                      >
                        {activeDay?.focusTitle || (activeDay?.isRestDay ? 'Rest & Recovery' : 'Core & Endurance')}
                      </Typography>

                      {/* Duration & Calorie Badges */}
                      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.8 }}>
                        {activeDay?.isRestDay ? (
                          <>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.4,
                                borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
                                border: '1px solid rgba(139, 92, 246, 0.25)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6' }}>
                                😴 Rest & Recovery
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.4,
                                borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                🔥 0 kcal
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.4,
                                borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                ⏱ {activeDay?.targetDurationMinutes || 25} min
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.4,
                                borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                🔥 {activeDay?.estimatedCaloriesBurned ? `${activeDay.estimatedCaloriesBurned} kcal` : '0 kcal (90 est.)'}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </Stack>

                      {/* Content: Rest State vs Exercise Checklist */}
                      {activeDay?.isRestDay ? (
                        <Box
                          sx={{
                            p: 1.8,
                            borderRadius: '16px',
                            bgcolor: isProf ? 'transparent' : isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
                            border: isProf ? '1px dashed var(--card-border)' : '1px dashed rgba(139, 92, 246, 0.3)',
                            textAlign: 'center',
                            my: 0.8,
                          }}
                        >
                          <HotelIcon sx={{ color: '#8B5CF6', fontSize: 26, mb: 0.4 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#8B5CF6', fontSize: '13px' }}>
                            Active Rest & Recovery
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.4, lineHeight: 1.4 }}>
                            {activeDay?.restDayNotes || 'Hydrate, light stretching, and get adequate rest.'}
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={0.8} sx={{ mb: 1 }}>
                          {displayExercises.map((ex, exIdx) => (
                            <Stack
                              key={ex.id || exIdx}
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', cursor: 'pointer' }}
                              onClick={() => onOpenDetail(activeDay, activeDate)}
                            >
                              {ex.isCompleted ? (
                                <CheckCircleIcon sx={{ fontSize: 16, color: '#10B981' }} />
                              ) : (
                                <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                              )}
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 650,
                                  fontSize: '12.5px',
                                  color: ex.isCompleted ? '#10B981' : 'var(--text-primary)',
                                  textDecoration: ex.isCompleted ? 'line-through' : 'none'
                                }}
                              >
                                {ex.exerciseName}{' '}
                                <Typography component="span" variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                  ({ex.sets}x{ex.reps || 10})
                                </Typography>
                              </Typography>
                            </Stack>
                          ))}

                          {exercises.length > 3 && (
                            <Typography
                              variant="caption"
                              onClick={() => setShowAllExercises(!showAllExercises)}
                              sx={{ color: 'var(--accent-primary)', fontWeight: 750, cursor: 'pointer', fontSize: '11px', pt: 0.5 }}
                            >
                              {showAllExercises ? 'Show fewer' : `+${exercises.length - 3} more exercises`}
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Box>

                    {/* Graphic Box */}
                    <Box
                      sx={{
                        width: 68,
                        height: 68,
                        borderRadius: '20px',
                        bgcolor: activeDay?.isRestDay ? 'rgba(139, 92, 246, 0.12)' : 'rgba(232, 90, 79, 0.1)',
                        color: activeDay?.isRestDay ? '#8B5CF6' : 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: activeDay?.isRestDay ? '0 8px 20px rgba(139, 92, 246, 0.15)' : '0 8px 20px rgba(232, 90, 79, 0.15)',
                      }}
                    >
                      {activeDay?.isRestDay ? (
                        <HotelIcon sx={{ fontSize: 32 }} />
                      ) : (
                        <FitnessCenterIcon sx={{ fontSize: 34, transform: 'rotate(-25deg)' }} />
                      )}
                    </Box>
                  </Box>

                  {/* Primary Action Button Based on Day Status */}
                  {activeDay?.isRestDay ? (
                    <Button
                      disabled
                      fullWidth
                      startIcon={<HotelIcon />}
                      sx={{
                        mt: 1,
                        py: 1.2,
                        borderRadius: '16px',
                        bgcolor: isDark ? 'rgba(139, 92, 246, 0.15) !important' : 'rgba(139, 92, 246, 0.1) !important',
                        color: '#8B5CF6 !important',
                        fontWeight: 800,
                        fontSize: '14px',
                        textTransform: 'none',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                      }}
                    >
                      Rest Scheduled
                    </Button>
                  ) : isToday ? (
                    isFullyCompleted ? (
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<CheckCircleIcon />}
                        onClick={() => onOpenDetail(activeDay, activeDate)}
                        sx={{
                          mt: 1,
                          py: 1.2,
                          borderRadius: '16px',
                          bgcolor: '#10B981',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14.5px',
                          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#059669' },
                        }}
                      >
                        Review Workout (Completed)
                      </Button>
                    ) : completedCount > 0 ? (
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onOpenDetail(activeDay, activeDate)}
                        sx={{
                          mt: 1,
                          py: 1.2,
                          borderRadius: '16px',
                          bgcolor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14.5px',
                          boxShadow: '0 6px 20px rgba(232, 90, 79, 0.4)',
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'var(--accent-secondary)' },
                        }}
                      >
                        Continue Workout ({completedCount}/{totalCount} Done)
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onOpenDetail(activeDay, activeDate)}
                        sx={{
                          mt: 1,
                          py: 1.2,
                          borderRadius: '16px',
                          bgcolor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14.5px',
                          boxShadow: '0 6px 20px rgba(232, 90, 79, 0.4)',
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'var(--accent-secondary)' },
                        }}
                      >
                        Start Workout
                      </Button>
                    )
                  ) : isPast ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => onOpenDetail(activeDay, activeDate)}
                      sx={{
                        mt: 1,
                        py: 1.2,
                        borderRadius: '16px',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '14px',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: 'var(--accent-primary)',
                          bgcolor: 'rgba(255, 115, 56, 0.05)',
                        },
                      }}
                    >
                      View History (Past Workout)
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => onOpenDetail(activeDay, activeDate)}
                      sx={{
                        mt: 1,
                        py: 1.2,
                        borderRadius: '16px',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '14px',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: 'var(--accent-primary)',
                          bgcolor: 'rgba(255, 115, 56, 0.05)',
                        },
                      }}
                    >
                      View Scheduled Routine
                    </Button>
                  )}
                </Box>

                {/* 2. Weekly Workout Plan Section */}
                <Box>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                      Weekly Workout Plan
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <IconButton size="small" onClick={handlePrevWeek} sx={{ p: 0.3, color: 'var(--text-secondary)' }}>
                        <ChevronLeftIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '11.5px', mx: 0.2 }}
                      >
                        {weekRangeString}
                      </Typography>
                      <IconButton size="small" onClick={handleNextWeek} sx={{ p: 0.3, color: 'var(--text-secondary)' }}>
                        <ChevronRightIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Return to Today Button when browsing another day */}
                  {!isToday && isViewingCurrentWeek && (
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={handleToday}
                        startIcon={<TodayIcon sx={{ fontSize: 13 }} />}
                        sx={{
                          py: 0.3,
                          px: 1,
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '11px',
                          fontWeight: 750,
                          color: 'var(--accent-primary)',
                          bgcolor: 'rgba(255, 115, 56, 0.08)',
                          '&:hover': { bgcolor: 'rgba(255, 115, 56, 0.15)' }
                        }}
                      >
                        Jump to Today's Workout
                      </Button>
                    </Box>
                  )}

                  {/* Compact 7-Day Grid (Mon-Sun) with focus label under each day */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 0.8 }, width: '100%' }}>
                    {orderedDays.map((day, idx) => {
                      const cardDate = new Date(currentMonday);
                      cardDate.setDate(cardDate.getDate() + idx);
                      const dayName = cardDate.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = cardDate.getDate();
                      const isSelected = selectedDayIdx === idx;
                      const isPillToday = isDateToday(cardDate);
                      const isCompleted = day.isCompletedForDate || !!day.completedAt;

                      const shortFocus = day.isRestDay
                        ? 'Rest'
                        : day.focusTitle
                        ? day.focusTitle.replace(' & ', ' ').split(' ')[0]
                        : 'Active';

                      return (
                        <Box
                          key={day.id || idx}
                          onClick={() => {
                            onDateChange(cardDate);
                          }}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 0,
                            py: 0.8,
                            px: 0.3,
                            borderRadius: '12px',
                            bgcolor: isSelected
                              ? 'var(--accent-primary)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)',
                            background: isSelected
                              ? 'linear-gradient(135deg, #FF6B6B 0%, #E85A4F 100%)'
                              : undefined,
                            color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                            border: isSelected
                              ? '1.5px solid rgba(255, 255, 255, 0.4)'
                              : isPillToday
                              ? '1.5px solid var(--accent-primary)'
                              : '1.5px solid transparent',
                            boxShadow: isSelected ? '0 4px 14px rgba(232, 90, 79, 0.4)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            position: 'relative'
                          }}
                        >
                          {isPillToday && (
                            <Box
                              sx={{
                                fontSize: '7px',
                                fontWeight: 900,
                                px: 0.4,
                                py: 0.1,
                                borderRadius: '3px',
                                bgcolor: isSelected ? '#FFFFFF' : 'var(--accent-primary)',
                                color: isSelected ? 'var(--accent-primary)' : '#FFFFFF',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                mb: 0.3
                              }}
                            >
                              Today
                            </Box>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '10px',
                              fontWeight: 650,
                              color: isCompleted && !isSelected
                                ? '#10B981'
                                : isSelected
                                ? 'rgba(255,255,255,0.9)'
                                : isPillToday
                                ? 'var(--accent-primary)'
                                : 'var(--text-secondary)'
                            }}
                          >
                            {dayName}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 850, my: 0.2 }}>
                            {dayNum}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '8.5px',
                              fontWeight: 700,
                              color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                              lineHeight: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            {shortFocus}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            );
          })()}
        </Stack>
      ) : (
        /* 7-Card Responsive Desktop Grid */
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
            const isToday = isDateToday(cardDate);

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
      )}

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
