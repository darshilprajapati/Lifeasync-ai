import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Checkbox,
  IconButton,
  Alert,
  Stack,
  Chip,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';

interface PlannerEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  completedAt?: string;
  missedDeadlinePenalized?: boolean;
  reminderSent?: boolean;
  reminderTime?: string;
}

const INVALID_TIME_RANGE_MESSAGE =
  'The end time must be later than the start time. Choose a valid deadline for your task.';

const Planner: React.FC = () => {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRangeError, setTimeRangeError] = useState<string | null>(null);
  const [reminderTimeError, setReminderTimeError] = useState<string | null>(null);

  // Form Fields
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminderSchedule, setReminderSchedule] = useState<'none' | 'at_start' | '15m' | '30m' | '1h' | 'custom'>('15m');
  const [customReminderDate, setCustomReminderDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/planner');
      if (res.data.isSuccess) {
        setEvents(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Strict date/time range validator
  const validateRange = (startVal: string, endVal: string): string | null => {
    if (!startVal || !endVal) return null;
    const startMs = new Date(startVal).getTime();
    const endMs = new Date(endVal).getTime();
    if (isNaN(startMs) || isNaN(endMs)) return null;

    if (endMs <= startMs) {
      return INVALID_TIME_RANGE_MESSAGE;
    }
    return null;
  };

  // Restricts year to exactly 4 digits maximum to avoid 6-digit browser year issues
  const sanitizeDateTimeInput = (val: string): string => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length > 0 && parts[0].length > 4) {
      return [parts[0].slice(0, 4), ...parts.slice(1)].join('-');
    }
    return val;
  };

  const isValidFourDigitYear = (val: string): boolean => {
    if (!val) return true;
    const parts = val.split('-');
    if (parts.length === 0) return true;
    const yearStr = parts[0];
    if (yearStr.length !== 4 || !/^\d{4}$/.test(yearStr)) return false;
    const year = parseInt(yearStr, 10);
    return !isNaN(year) && year >= 1900 && year <= 2099;
  };

  const handleStartTimeChange = (raw: string) => {
    const val = sanitizeDateTimeInput(raw);
    setStartTime(val);
    if (val && !isValidFourDigitYear(val)) {
      setTimeRangeError('Start time year must be a 4-digit number between 1900 and 2099.');
      return;
    }
    if (endTime) {
      const err = validateRange(val, endTime);
      setTimeRangeError(err);
    } else {
      setTimeRangeError(null);
    }
  };

  const handleEndTimeChange = (raw: string) => {
    const val = sanitizeDateTimeInput(raw);
    setEndTime(val);
    if (val && !isValidFourDigitYear(val)) {
      setTimeRangeError('Deadline year must be a 4-digit number between 1900 and 2099.');
      return;
    }
    if (startTime) {
      const err = validateRange(startTime, val);
      setTimeRangeError(err);
    } else {
      setTimeRangeError(null);
    }
  };

  const handleCustomReminderChange = (raw: string) => {
    const val = sanitizeDateTimeInput(raw);
    setCustomReminderDate(val);
    if (val && !isValidFourDigitYear(val)) {
      setReminderTimeError('Reminder year must be a 4-digit number between 1900 and 2099.');
    } else {
      setReminderTimeError(null);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    const rangeErr = validateRange(startTime, endTime);
    if (rangeErr) {
      setTimeRangeError(rangeErr);
      return;
    }

    setError(null);
    setTimeRangeError(null);
    setSubmitting(true);

    const getCalculatedReminderIso = (): string | null => {
      if (reminderSchedule === 'none' || !startTime) return null;
      if (reminderSchedule === 'custom') {
        return customReminderDate ? new Date(customReminderDate).toISOString() : null;
      }
      const startMs = new Date(startTime).getTime();
      if (isNaN(startMs)) return null;

      let offsetMs = 0;
      if (reminderSchedule === '15m') offsetMs = 15 * 60 * 1000;
      else if (reminderSchedule === '30m') offsetMs = 30 * 60 * 1000;
      else if (reminderSchedule === '1h') offsetMs = 60 * 60 * 1000;

      return new Date(startMs - offsetMs).toISOString();
    };

    const calculatedReminderTime = getCalculatedReminderIso();

    try {
      if (editingId) {
        // Update existing event
        const res = await apiClient.put(`/api/planner/${editingId}`, {
          title: title.trim(),
          description: description.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          reminderTime: calculatedReminderTime,
          isCompleted: false,
        });

        if (res.data.isSuccess) {
          trackAction('planner_event_updated', { module: 'planner', action: 'edit' });
          setEvents((prev) =>
            prev.map((ev) => (ev.id === editingId ? res.data.data : ev)).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          );
          resetForm();
        }
      } else {
        // Create new event
        const res = await apiClient.post('/api/planner', {
          title: title.trim(),
          description: description.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          reminderTime: calculatedReminderTime,
          isCompleted: false,
        });

        if (res.data.isSuccess) {
          trackAction('planner_event_created', { module: 'planner', action: 'create' });
          setEvents((prev) =>
            [...prev, res.data.data].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          );
          resetForm();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setReminderSchedule('15m');
    setCustomReminderDate('');
    setTimeRangeError(null);
    setReminderTimeError(null);
  };

  const handleStartEdit = (event: PlannerEvent) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || '');

    // Format ISO string to datetime-local friendly string (YYYY-MM-DDTHH:mm)
    const toLocalInput = (isoStr: string) => {
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartTime(toLocalInput(event.startTime));
    setEndTime(toLocalInput(event.endTime));

    if (event.reminderTime) {
      const reminderDate = new Date(event.reminderTime).getTime();
      const startDate = new Date(event.startTime).getTime();
      const diffMinutes = Math.round((startDate - reminderDate) / 60000);

      if (diffMinutes === 0) setReminderSchedule('at_start');
      else if (diffMinutes === 15) setReminderSchedule('15m');
      else if (diffMinutes === 30) setReminderSchedule('30m');
      else if (diffMinutes === 60) setReminderSchedule('1h');
      else {
        setReminderSchedule('custom');
        setCustomReminderDate(toLocalInput(event.reminderTime));
      }
    } else {
      setReminderSchedule('none');
      setCustomReminderDate('');
    }

    setTimeRangeError(null);
    setReminderTimeError(null);
  };

  const handleToggleEvent = async (id: number, currentCompleted: boolean) => {
    try {
      const res = await apiClient.put(`/api/planner/${id}/toggle`, !currentCompleted);
      if (res.data.isSuccess) {
        trackAction('planner_event_updated', { module: 'planner', action: 'toggle_status' });
        const nowIso = new Date().toISOString();
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === id) {
              const willBeCompleted = !currentCompleted;
              const isOverdue = new Date() > new Date(e.endTime);
              return {
                ...e,
                isCompleted: willBeCompleted,
                completedAt: willBeCompleted ? nowIso : undefined,
                missedDeadlinePenalized: willBeCompleted
                  ? (isOverdue ? true : e.missedDeadlinePenalized)
                  : (isOverdue ? true : e.missedDeadlinePenalized),
              };
            }
            return e;
          })
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle event.');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/planner/${id}`);
      if (res.data.isSuccess) {
        trackAction('planner_event_deleted', { module: 'planner', action: 'delete' });
        setEvents((prev) => prev.filter((e) => e.id !== id));
        if (editingId === id) resetForm();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  // Status helper for task deadline evaluation
  const getTaskDeadlineStatus = (event: PlannerEvent) => {
    const now = new Date();
    const end = new Date(event.endTime);
    const msLeft = end.getTime() - now.getTime();
    const oneHourMs = 60 * 60 * 1000;

    if (event.isCompleted) {
      if (event.completedAt && new Date(event.completedAt) > end) {
        return {
          label: 'Completed Late (-2 Penalty)',
          color: 'error' as const,
          tooltip: 'Completed after expected deadline. Penalty recorded permanently for that day.',
        };
      }
      return {
        label: 'Completed on Time',
        color: 'success' as const,
        tooltip: 'Completed prior to deadline without score penalties.',
      };
    }

    if (now > end) {
      return {
        label: 'Overdue (-2 Score Penalty)',
        color: 'error' as const,
        tooltip: 'Expected deadline passed without completion. -2 points applied to daily Life Score.',
      };
    }

    if (msLeft > 0 && msLeft <= oneHourMs) {
      return {
        label: 'Due in ~1 Hour',
        color: 'warning' as const,
        tooltip: 'Deadline approaching. Reminder email triggered.',
      };
    }

    return null;
  };

  const isFormInvalid =
    !title.trim() ||
    !startTime ||
    !endTime ||
    !isValidFourDigitYear(startTime) ||
    !isValidFourDigitYear(endTime) ||
    (reminderSchedule === 'custom' && (!customReminderDate || !isValidFourDigitYear(customReminderDate))) ||
    !!timeRangeError ||
    !!reminderTimeError ||
    submitting;

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <CalendarTodayIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Personal Planner
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReportExporter module="Planner" />
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          Organize your tasks, schedule deadlines, and maintain daily consistency. Missing deadlines incurs a permanent −2 Life Score deduction.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'stretch' }}>
          {/* Add / Edit Event Form */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 5 }, display: 'flex', flexDirection: 'column' }}>
            <TiltCard sx={{ width: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {editingId ? 'Edit Task / Reschedule' : 'Add Task / Event'}
                  </Typography>
                  {editingId && (
                    <Button size="small" startIcon={<CloseIcon />} onClick={resetForm} sx={{ color: '#6b7280' }}>
                      Cancel Edit
                    </Button>
                  )}
                </Stack>

                {timeRangeError && (
                  <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2.5, borderRadius: '10px', fontSize: '13px' }}>
                    {timeRangeError}
                  </Alert>
                )}

                <form onSubmit={handleSaveEvent}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Event Title"
                      required
                      fullWidth
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Finish Project Proposal"
                    />
                    <TextField
                      label="Description"
                      multiline
                      rows={3}
                      fullWidth
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional notes, context, or checklist items"
                    />
                    <TextField
                      label="Start Time"
                      type="datetime-local"
                      required
                      fullWidth
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: {
                          min: '1900-01-01T00:00',
                          max: '2099-12-31T23:59',
                        }
                      }}
                    />
                    <TextField
                      label="End Time (Deadline)"
                      type="datetime-local"
                      required
                      fullWidth
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      error={!!timeRangeError}
                      helperText={timeRangeError}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: {
                          min: startTime || '1900-01-01T00:00',
                          max: '2099-12-31T23:59',
                        }
                      }}
                    />
                    <TextField
                      label="Email Reminder Schedule"
                      select
                      fullWidth
                      value={reminderSchedule}
                      onChange={(e) => setReminderSchedule(e.target.value as any)}
                      slotProps={{ select: { native: true } }}
                    >
                      <option value="none">No Email Reminder</option>
                      <option value="at_start">At Event Start Time</option>
                      <option value="15m">15 Minutes Before Start</option>
                      <option value="30m">30 Minutes Before Start</option>
                      <option value="1h">1 Hour Before Start</option>
                      <option value="custom">Custom Date & Time</option>
                    </TextField>
                    {reminderSchedule === 'custom' && (
                      <TextField
                        label="Custom Reminder Date & Time"
                        type="datetime-local"
                        required
                        fullWidth
                        value={customReminderDate}
                        onChange={(e) => handleCustomReminderChange(e.target.value)}
                        error={!!reminderTimeError}
                        helperText={reminderTimeError}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            min: '1900-01-01T00:00',
                            max: '2099-12-31T23:59',
                          }
                        }}
                      />
                    )}
                    <IconSlideButton
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={isFormInvalid}
                      startIcon={editingId ? <EditIcon /> : <AddIcon />}
                      sx={{
                        bgcolor: 'var(--accent-primary)',
                        py: 1.5,
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'var(--accent-secondary)' },
                      }}
                    >
                      {submitting
                        ? (editingId ? 'Saving Changes...' : 'Creating...')
                        : (editingId ? 'Save Changes' : 'Create Event')}
                    </IconSlideButton>
                  </Stack>
                </form>
              </CardContent>
            </TiltCard>
          </Box>

          {/* Events List */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 7 }, display: 'flex', flexDirection: 'column' }}>
            <TiltCard sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Your Schedule
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                    {events.length} {events.length === 1 ? 'task' : 'tasks'} scheduled
                  </Typography>
                </Stack>

                {loading ? (
                  <LogoLoader />
                ) : events.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D', minHeight: '350px' }}>
                    <CalendarTodayIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">No events scheduled. Plan your first task!</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '520px', pr: 1 }}>
                    {events.map((e) => {
                      const deadlineStatus = getTaskDeadlineStatus(e);
                      const isOverdue = !e.isCompleted && new Date() > new Date(e.endTime);

                      return (
                        <Card
                          key={e.id}
                          sx={{
                            flexShrink: 0,
                            borderRadius: '12px',
                            borderLeft: e.isCompleted
                              ? '4px solid #4CAF50'
                              : isOverdue
                              ? '4px solid #ef4444'
                              : '4px solid var(--accent-primary)',
                            transition: '0.2s',
                            bgcolor: e.isCompleted
                              ? 'rgba(76, 175, 80, 0.08)'
                              : isOverdue
                              ? 'rgba(239, 68, 68, 0.08)'
                              : 'var(--card-bg)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          }}
                        >
                          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '14px !important' }}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                              <Checkbox
                                checked={e.isCompleted}
                                onChange={() => handleToggleEvent(e.id, e.isCompleted)}
                                icon={<RadioButtonUncheckedIcon />}
                                checkedIcon={<CheckCircleIcon sx={{ color: '#4CAF50' }} />}
                                sx={{ mt: -0.5 }}
                              />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      color: e.isCompleted ? '#8D8D8D' : '#2D2D2D',
                                      textDecoration: e.isCompleted ? 'line-through' : 'none',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {e.title}
                                  </Typography>

                                  {deadlineStatus && (
                                    <Tooltip title={deadlineStatus.tooltip} arrow>
                                      <Chip
                                        size="small"
                                        label={deadlineStatus.label}
                                        color={deadlineStatus.color}
                                        variant="outlined"
                                        sx={{ fontSize: '11px', height: '20px', fontWeight: 600 }}
                                      />
                                    </Tooltip>
                                  )}

                                  {e.reminderTime && (
                                    <Tooltip
                                      title={
                                        e.reminderSent
                                          ? `Reminder email dispatched`
                                          : `Email reminder scheduled for ${formatDate(e.reminderTime)}`
                                      }
                                      arrow
                                    >
                                      <Chip
                                        size="small"
                                        icon={<NotificationsActiveIcon sx={{ fontSize: '12px !important' }} />}
                                        label={e.reminderSent ? 'Reminded' : 'Reminder Set'}
                                        color={e.reminderSent ? 'default' : 'secondary'}
                                        variant="outlined"
                                        sx={{ fontSize: '11px', height: '20px', fontWeight: 600 }}
                                      />
                                    </Tooltip>
                                  )}
                                </Stack>

                                {e.description && (
                                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                                    {e.description}
                                  </Typography>
                                )}

                                <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 500, display: 'block' }}>
                                  📅 {formatDate(e.startTime)} &rarr; {formatDate(e.endTime)}
                                </Typography>
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                onClick={() => handleStartEdit(e)}
                                size="small"
                                sx={{ color: '#6b7280', '&:hover': { color: 'var(--accent-primary)' } }}
                                title="Edit Task"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeleteEvent(e.id)}
                                size="small"
                                sx={{ color: '#E85A4F' }}
                                title="Delete Task"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </TiltCard>
          </Box>
        </Box>
      </Box>
    </PageWrapper>
  );
};

export default Planner;
