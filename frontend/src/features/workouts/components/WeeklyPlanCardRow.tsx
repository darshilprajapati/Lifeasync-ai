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
  useMediaQuery,
  LinearProgress,
  Grid
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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
  const { designSystem, mode } = useThemeSystem();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const [confirmSyncOpen, setConfirmSyncOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<'plan' | 'progress' | 'history'>('plan');
  const [selectedMobileDayIdx, setSelectedMobileDayIdx] = React.useState<number>(0);
  const [showAllExercises, setShowAllExercises] = React.useState(false);

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

      {isMobile ? (
        /* Dedicated Mobile View matching Reference Image 1 */
        <Stack spacing={2} sx={{ pb: 3 }}>
          {/* 1. Segmented Control Tabs (Plan, Progress, History) */}
          <Box
            sx={{
              display: 'flex',
              p: 0.5,
              borderRadius: '24px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: '1px solid var(--card-border)',
            }}
          >
            {[
              { key: 'plan', label: 'Plan' },
              { key: 'progress', label: 'Progress' },
              { key: 'history', label: 'History' },
            ].map((tab) => {
              const active = mobileTab === tab.key;
              return (
                <Box
                  key={tab.key}
                  onClick={() => setMobileTab(tab.key as any)}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 0.9,
                    borderRadius: '20px',
                    bgcolor: active ? (isDark ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF') : 'transparent',
                    color: active ? '#1a1a1a' : 'var(--text-secondary)',
                    fontWeight: 750,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>

          {/* 2. Horizontal Weekday Selector (Mon-Sun with active coral pill) */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, alignItems: 'center' }}>
            {orderedDays.map((day, idx) => {
              const cardDate = new Date(currentMonday);
              cardDate.setDate(cardDate.getDate() + idx);
              const dayName = cardDate.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = cardDate.getDate();
              const isSelected = selectedMobileDayIdx === idx;
              const isCompleted = day.isCompletedForDate || !!day.completedAt;

              return (
                <Box
                  key={day.id || idx}
                  onClick={() => {
                    setSelectedMobileDayIdx(idx);
                    onDateChange(cardDate);
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '48px',
                    py: 1.2,
                    px: 1,
                    borderRadius: '16px',
                    bgcolor: isSelected
                      ? 'var(--accent-primary)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.04)',
                    background: isSelected
                      ? 'linear-gradient(135deg, #FF6B6B 0%, #E85A4F 100%)'
                      : undefined,
                    color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
                    boxShadow: isSelected ? '0 4px 14px rgba(232, 90, 79, 0.4)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, color: isCompleted && !isSelected ? '#10B981' : 'inherit' }}>
                    {dayName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 800, mt: 0.3 }}>
                    {dayNum}
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          {/* Active Day Data */}
          {(() => {
            const activeDay = orderedDays[selectedMobileDayIdx] || orderedDays[0];
            const activeDate = new Date(currentMonday);
            activeDate.setDate(activeDate.getDate() + selectedMobileDayIdx);
            const isToday = isTodayDate(activeDate);
            const exercises = activeDay?.exercises || [];
            const displayExercises = showAllExercises ? exercises : exercises.slice(0, 3);
            const completionPct = activeDay?.isCompletedForDate ? 100 : (activeDay?.completedExercisesCount && activeDay?.totalExercisesCount ? Math.round((activeDay.completedExercisesCount / activeDay.totalExercisesCount) * 100) : 0);

            return (
              <Stack spacing={2}>
                {/* 3. Active Routine Status Card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '20px',
                    bgcolor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    boxShadow: 'var(--shadow-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        bgcolor: 'rgba(124, 58, 237, 0.15)',
                        color: '#8B5CF6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FitnessCenterIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                          {activeDay?.focusTitle || (activeDay?.isRestDay ? 'Rest & Recovery' : 'Active Routine')}
                        </Typography>
                        {isToday && (
                          <Chip
                            label="Today"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '10px',
                              fontWeight: 800,
                              bgcolor: 'rgba(232, 90, 79, 0.15)',
                              color: 'var(--accent-primary)',
                              borderRadius: '6px',
                            }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mt: 0.2, display: 'block' }}>
                        Plan: {activeDay?.targetDurationMinutes || 30} min • 🔥 {activeDay?.estimatedCaloriesBurned || 250} kcal
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Circular completion ring badge */}
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      border: '3px solid rgba(232, 90, 79, 0.3)',
                      borderColor: completionPct === 100 ? '#10B981' : 'rgba(232, 90, 79, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {completionPct}%
                  </Box>
                </Box>

                {/* 4. Today's Workout Exercise Cards */}
                {!activeDay?.isRestDay && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '20px',
                      bgcolor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      boxShadow: 'var(--shadow-soft)',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1.5, fontSize: '15px' }}>
                      Today's Workout ({exercises.length} Exercises)
                    </Typography>

                    <Stack spacing={1.2}>
                      {displayExercises.map((ex, exIdx) => (
                        <Box
                          key={ex.id || exIdx}
                          onClick={() => onOpenDetail(activeDay, activeDate)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.2,
                            borderRadius: '14px',
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                            border: '1px solid var(--card-border)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.05)' },
                          }}
                        >
                          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '10px',
                                bgcolor: 'rgba(255, 115, 56, 0.12)',
                                color: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FitnessCenterIcon sx={{ fontSize: 18 }} />
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                                {ex.exerciseName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {ex.sets} × {ex.reps ? `${ex.reps} reps` : `${ex.restSeconds || 30} sec`}
                              </Typography>
                            </Box>
                          </Stack>
                          <RadioButtonUncheckedIcon sx={{ color: 'var(--text-secondary)', fontSize: 20 }} />
                        </Box>
                      ))}

                      {exercises.length > 3 && (
                        <Button
                          size="small"
                          onClick={() => setShowAllExercises(!showAllExercises)}
                          endIcon={<KeyboardArrowRightIcon sx={{ transform: showAllExercises ? 'rotate(90deg)' : 'none' }} />}
                          sx={{ textTransform: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '12px', justifyContent: 'flex-start', p: 0.5 }}
                        >
                          {showAllExercises ? 'Show fewer exercises' : `+${exercises.length - 3} more exercises`}
                        </Button>
                      )}

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
                          background: 'linear-gradient(135deg, #FF6B6B 0%, #E85A4F 100%)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14px',
                          boxShadow: '0 6px 20px rgba(232, 90, 79, 0.4)',
                          textTransform: 'none',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #FF5252 0%, #D32F2F 100%)',
                          },
                        }}
                      >
                        Start Workout
                      </Button>
                    </Stack>
                  </Box>
                )}

                {/* 5. Two Bottom Metric Progress Cards matching Reference Image 1 */}
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 1.8,
                        borderRadius: '20px',
                        bgcolor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: 'var(--shadow-soft)',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FitnessCenterIcon sx={{ fontSize: 16 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px' }}>
                          Weekly Goal
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1 }}>
                        3 / 5 days
                      </Typography>
                      <LinearProgress variant="determinate" value={60} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(16, 185, 129, 0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#10B981', borderRadius: 3 } }} />
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 1.8,
                        borderRadius: '20px',
                        bgcolor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: 'var(--shadow-soft)',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: 'rgba(232, 90, 79, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <LocalFireDepartmentIcon sx={{ fontSize: 16 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px' }}>
                          Calories (Week)
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1 }}>
                        810 / 1500 kcal
                      </Typography>
                      <LinearProgress variant="determinate" value={54} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(232, 90, 79, 0.2)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent-primary)', borderRadius: 3 } }} />
                    </Box>
                  </Grid>
                </Grid>
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
