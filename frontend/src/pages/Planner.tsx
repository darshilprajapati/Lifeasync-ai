import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  CardContent,
  TextField,
  Button,
  IconButton,
  Alert,
  Stack,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SortIcon from '@mui/icons-material/Sort';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FilterListIcon from '@mui/icons-material/FilterList';

import { useThemeSystem } from '../context/useThemeSystem';
import PageWrapper from '../components/PageWrapper';
import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import LogoLoader from '../components/LogoLoader';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { ResetLayoutButton } from '../components/resizable/ResetLayoutButton';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';
import { exportToExcel } from '../utils/excelExport';
import {
  clampYearToFourDigits,
  isValidFourDigitYear,
  STANDARD_DATE_INPUT_PROPS,
  STANDARD_DATETIME_INPUT_PROPS,
} from '../utils/dateValidation';

export interface PlannerEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  completedAt?: string;
  status: string; // 'Todo' | 'InProgress' | 'Completed' | 'Overdue'
  priority?: string; // 'Low' | 'Medium' | 'High' | 'Urgent'
  category?: string; // 'Design' | 'Development' | 'Personal' | 'Research' | 'Meetings' | 'General'
  missedDeadlinePenalized?: boolean;
  reminderSent?: boolean;
  reminderTime?: string;
}

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';

const INVALID_TIME_RANGE_MESSAGE =
  'The end time must be later than the start time. Choose a valid deadline for your task.';

// Color palette inspired by Taskmate references for task tags
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Design: { bg: 'rgba(254, 243, 199, 0.9)', text: '#92400E', border: 'rgba(245, 158, 11, 0.3)' },
  Development: { bg: 'rgba(219, 234, 254, 0.9)', text: '#1E40AF', border: 'rgba(59, 130, 246, 0.3)' },
  Research: { bg: 'rgba(209, 250, 229, 0.9)', text: '#065F46', border: 'rgba(16, 185, 129, 0.3)' },
  Meetings: { bg: 'rgba(254, 226, 226, 0.9)', text: '#991B1B', border: 'rgba(239, 68, 68, 0.3)' },
  Personal: { bg: 'rgba(243, 232, 255, 0.9)', text: '#6B21A8', border: 'rgba(168, 85, 247, 0.3)' },
  General: { bg: 'rgba(243, 244, 246, 0.9)', text: '#374151', border: 'rgba(209, 213, 219, 0.5)' },
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#E85A4F',
  Urgent: '#EF4444',
};

const isDateInPeriod = (
  dateStr: string,
  filter: DateFilterOption,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (filter === 'all' || !dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  if (filter === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (filter === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  if (filter === 'this_week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (filter === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (filter === 'this_year') {
    return d.getFullYear() === now.getFullYear();
  }
  if (filter === 'custom' && customStart && customEnd) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  }
  return true;
};

const Planner: React.FC = () => {
  const { mode, designSystem } = useThemeSystem();
  const isDark = mode === 'dark';
  const isProf = designSystem === 'professional';
  const { notify } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');

  // Drag and drop state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Form Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetStatus, setTargetStatus] = useState<string>('Todo');
  const [priority, setPriority] = useState<string>('Medium');
  const [category, setCategory] = useState<string>('Development');
  const [reminderSchedule, setReminderSchedule] = useState<'none' | 'at_start' | '15m' | '30m' | '1h' | 'custom'>('15m');
  const [customReminderDate, setCustomReminderDate] = useState<string>('');
  const [timeRangeError, setTimeRangeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Log Modal state
  const [logOpen, setLogOpen] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('All');
  const [logDateFilter, setLogDateFilter] = useState<DateFilterOption>('all');
  const [logCustomStart, setLogCustomStart] = useState('');
  const [logCustomEnd, setLogCustomEnd] = useState('');
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/planner');
      if (res.data.isSuccess) {
        setEvents(res.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load planner events.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Classify a task into its canonical Kanban column
  const getTaskColumn = (e: PlannerEvent): 'todo' | 'in_progress' | 'completed' | 'overdue' => {
    if (e.isCompleted) return 'completed';
    const isPastDeadline = new Date() > new Date(e.endTime);
    if (isPastDeadline) return 'overdue';
    if (e.status === 'InProgress') return 'in_progress';
    return 'todo';
  };

  // Validate Start and End times
  const validateRange = (startVal: string, endVal: string): string | null => {
    if (!startVal || !endVal) return null;
    const s = new Date(startVal).getTime();
    const e = new Date(endVal).getTime();
    if (isNaN(s) || isNaN(e)) return null;
    if (e <= s) return INVALID_TIME_RANGE_MESSAGE;
    return null;
  };


  const toLocalInput = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateDialog = (initialStatus: string = 'Todo') => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setStartTime(toLocalInput(now.toISOString()));
    setEndTime(toLocalInput(oneHourLater.toISOString()));
    setTargetStatus(initialStatus);
    setPriority('Medium');
    setCategory('Development');
    setReminderSchedule('15m');
    setCustomReminderDate('');
    setTimeRangeError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (ev: PlannerEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setDescription(ev.description || '');
    setStartTime(toLocalInput(ev.startTime));
    setEndTime(toLocalInput(ev.endTime));
    setTargetStatus(ev.isCompleted ? 'Completed' : ev.status || 'Todo');
    setPriority(ev.priority || 'Medium');
    setCategory(ev.category || 'General');

    if (ev.reminderTime) {
      const remMs = new Date(ev.reminderTime).getTime();
      const startMs = new Date(ev.startTime).getTime();
      const diffMins = Math.round((startMs - remMs) / 60000);
      if (diffMins === 0) setReminderSchedule('at_start');
      else if (diffMins === 15) setReminderSchedule('15m');
      else if (diffMins === 30) setReminderSchedule('30m');
      else if (diffMins === 60) setReminderSchedule('1h');
      else {
        setReminderSchedule('custom');
        setCustomReminderDate(toLocalInput(ev.reminderTime));
      }
    } else {
      setReminderSchedule('none');
      setCustomReminderDate('');
    }

    setTimeRangeError(null);
    setDialogOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    const rangeErr = validateRange(startTime, endTime);
    if (rangeErr) {
      setTimeRangeError(rangeErr);
      return;
    }

    setSubmitting(true);
    setError(null);

    const getCalculatedReminderIso = (): string | null => {
      if (reminderSchedule === 'none' || !startTime) return null;
      if (reminderSchedule === 'custom') {
        return customReminderDate ? new Date(customReminderDate).toISOString() : null;
      }
      const sMs = new Date(startTime).getTime();
      if (isNaN(sMs)) return null;
      let offsetMs = 0;
      if (reminderSchedule === '15m') offsetMs = 15 * 60 * 1000;
      else if (reminderSchedule === '30m') offsetMs = 30 * 60 * 1000;
      else if (reminderSchedule === '1h') offsetMs = 60 * 60 * 1000;
      return new Date(sMs - offsetMs).toISOString();
    };

    const reminderIso = getCalculatedReminderIso();
    const isCompleted = targetStatus === 'Completed';

    try {
      if (editingId) {
        const res = await apiClient.put(`/api/planner/${editingId}`, {
          title: title.trim(),
          description: description.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          reminderTime: reminderIso,
          isCompleted,
          status: targetStatus,
          priority,
          category,
        });
        if (res.data.isSuccess) {
          trackAction('planner_event_updated', { module: 'planner', action: 'edit' });
          setEvents((prev) => prev.map((ev) => (ev.id === editingId ? res.data.data : ev)));
          window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
          window.dispatchEvent(new CustomEvent('lifesync:task-updated'));
          notify.success(`Task "${title.trim()}" updated successfully.`);
          setDialogOpen(false);
        }
      } else {
        const res = await apiClient.post('/api/planner', {
          title: title.trim(),
          description: description.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          reminderTime: reminderIso,
          isCompleted,
          status: targetStatus,
          priority,
          category,
        });
        if (res.data.isSuccess) {
          trackAction('planner_event_created', { module: 'planner', action: 'create' });
          setEvents((prev) => [...prev, res.data.data]);
          window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
          window.dispatchEvent(new CustomEvent('lifesync:task-updated'));
          notify.success(`Task "${title.trim()}" created in ${targetStatus}.`);
          setDialogOpen(false);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save task.';
      setError(msg);
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/planner/${id}`);
      if (res.data.isSuccess) {
        trackAction('planner_event_deleted', { module: 'planner', action: 'delete' });
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
        window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
        window.dispatchEvent(new CustomEvent('lifesync:task-updated'));
        notify.success('Task removed from planner.');
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const handleToggleComplete = async (ev: PlannerEvent) => {
    const nextCompleted = !ev.isCompleted;
    try {
      const res = await apiClient.put(`/api/planner/${ev.id}/toggle`, nextCompleted);
      if (res.data.isSuccess) {
        trackAction('planner_event_toggled', { module: 'planner', action: 'toggle' });
        const nowIso = new Date().toISOString();
        setEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id
              ? {
                  ...item,
                  isCompleted: nextCompleted,
                  status: nextCompleted ? 'Completed' : 'Todo',
                  completedAt: nextCompleted ? nowIso : undefined,
                }
              : item
          )
        );
        window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
        window.dispatchEvent(new CustomEvent('lifesync:task-updated'));
        notify.success(nextCompleted ? `Task completed!` : `Task marked active.`);
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to toggle task.');
    }
  };

  // Drag and Drop Handling
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    if (col !== 'overdue') {
      setDragOverCol(col);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (targetColKey: 'todo' | 'in_progress' | 'completed' | 'overdue') => {
    setDragOverCol(null);
    if (!draggingId) return;

    // Do not allow dragging into overdue
    if (targetColKey === 'overdue') {
      notify.warning('Overdue status is assigned automatically when task deadlines pass.');
      setDraggingId(null);
      return;
    }

    const task = events.find((t) => t.id === draggingId);
    if (!task) return;

    // Do not allow dragging OUT of Overdue unless completing it via supported actions
    const currentCol = getTaskColumn(task);
    if (currentCol === 'overdue' && targetColKey !== 'completed') {
      notify.warning('Overdue tasks cannot be rescheduled by drag. Complete it or edit its deadline.');
      setDraggingId(null);
      return;
    }

    let nextStatus = 'Todo';
    if (targetColKey === 'in_progress') nextStatus = 'InProgress';
    else if (targetColKey === 'completed') nextStatus = 'Completed';

    if (task.status === nextStatus && (targetColKey === 'completed') === task.isCompleted) {
      setDraggingId(null);
      return;
    }

    // Optimistic Update
    const prevEvents = [...events];
    const willBeCompleted = targetColKey === 'completed';
    setEvents((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextStatus,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString() : undefined,
            }
          : t
      )
    );

    try {
      const res = await apiClient.put(`/api/planner/${task.id}/status`, { status: nextStatus });
      if (!res.data.isSuccess) {
        setEvents(prevEvents);
        notify.error('Failed to update status on server.');
      } else {
        window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
        window.dispatchEvent(new CustomEvent('lifesync:task-updated'));
        notify.success(`Moved to ${targetColKey === 'in_progress' ? 'In Progress' : targetColKey === 'completed' ? 'Completed' : 'To Do'}`);
      }
    } catch (err: any) {
      setEvents(prevEvents);
      notify.error(err.response?.data?.message || 'Failed to move task. Reverting position.');
    } finally {
      setDraggingId(null);
    }
  };

  // Filter tasks for the board
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Date filter applied based on task deadline / start time
      const dateMatch = isDateInPeriod(ev.startTime, dateFilter, customStart, customEnd);
      if (!dateMatch) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = ev.title.toLowerCase().includes(q);
        const descMatch = (ev.description || '').toLowerCase().includes(q);
        const catMatch = (ev.category || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [events, dateFilter, customStart, customEnd, searchQuery]);

  // Group into the 4 Taskmate Kanban columns
  const columns = useMemo(() => {
    const todo: PlannerEvent[] = [];
    const inProgress: PlannerEvent[] = [];
    const completed: PlannerEvent[] = [];
    const overdue: PlannerEvent[] = [];

    filteredEvents.forEach((ev) => {
      const col = getTaskColumn(ev);
      if (col === 'completed') completed.push(ev);
      else if (col === 'overdue') overdue.push(ev);
      else if (col === 'in_progress') inProgress.push(ev);
      else todo.push(ev);
    });

    return {
      todo,
      in_progress: inProgress,
      completed,
      overdue,
    };
  }, [filteredEvents]);

  const displayedTasks = useMemo(() => {
    let list = filteredEvents;
    if (selectedStatusFilter !== 'all') {
      list = list.filter((t) => getTaskColumn(t) === selectedStatusFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (pOrder[b.priority || 'Medium'] || 0) - (pOrder[a.priority || 'Medium'] || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [filteredEvents, selectedStatusFilter, sortBy]);

  // Filter records for the Planner Log & Excel Export
  const logRecords = useMemo(() => {
    return events.filter((ev) => {
      const dateMatch = isDateInPeriod(ev.startTime, logDateFilter, logCustomStart, logCustomEnd);
      if (!dateMatch) return false;

      const col = getTaskColumn(ev);
      if (logStatusFilter !== 'All') {
        if (logStatusFilter === 'Todo' && col !== 'todo') return false;
        if (logStatusFilter === 'InProgress' && col !== 'in_progress') return false;
        if (logStatusFilter === 'Completed' && col !== 'completed') return false;
        if (logStatusFilter === 'Overdue' && col !== 'overdue') return false;
      }

      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const titleMatch = ev.title.toLowerCase().includes(q);
        const descMatch = (ev.description || '').toLowerCase().includes(q);
        const catMatch = (ev.category || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [events, logDateFilter, logCustomStart, logCustomEnd, logStatusFilter, logSearch]);

  const pagedLogRecords = useMemo(() => {
    const start = logPage * logRowsPerPage;
    return logRecords.slice(start, start + logRowsPerPage);
  }, [logRecords, logPage, logRowsPerPage]);

  const handleExportPlannerExcel = () => {
    const exportRows = logRecords.map((ev) => ({
      ID: ev.id,
      Title: ev.title,
      Description: ev.description || '',
      Status: getTaskColumn(ev).toUpperCase(),
      Priority: ev.priority || 'Medium',
      Category: ev.category || 'General',
      'Start Time': new Date(ev.startTime).toLocaleString(),
      Deadline: new Date(ev.endTime).toLocaleString(),
      'Is Completed': ev.isCompleted ? 'Yes' : 'No',
      'Completed At': ev.completedAt ? new Date(ev.completedAt).toLocaleString() : 'N/A',
      'Penalty Applied (-2)': ev.missedDeadlinePenalized ? 'Yes (-2)' : 'No',
    }));

    exportToExcel(
      exportRows,
      `LifeSync_Planner_Log_${new Date().toISOString().slice(0, 10)}`,
      'Planner Tasks'
    );
    notify.success(`Exported ${exportRows.length} tasks matching current log filters.`);
  };

  const formatTimeRange = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d: Date) =>
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (s.toDateString() === e.toDateString()) {
      return `${formatDate(s)} • ${formatTime(s)} - ${formatTime(e)}`;
    }
    return `${formatDate(s)} ${formatTime(s)} → ${formatDate(e)} ${formatTime(e)}`;
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', md: '28px' }, height: '100%', overflowY: 'auto', bgcolor: 'var(--bg-primary)' }}>
        {/* Top Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 2.5, gap: 2 }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(232, 90, 79, 0.12)',
                  p: 1,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CalendarTodayIcon sx={{ color: 'var(--accent-primary)', fontSize: 26 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Planner
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Taskmate-style agile board. Incomplete tasks past deadline deduct −2 Life Score points once.
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.2}
            sx={{
              width: { xs: '100%', md: 'auto' },
              alignItems: 'center',
            }}
          >
            {!isMobile && <ResetLayoutButton pageId="planner" pageName="Planner" />}
            <Button
              variant="outlined"
              startIcon={<HistoryIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setLogPage(0);
                setLogOpen(true);
              }}
              sx={{
                flex: { xs: 1, md: 'none' },
                height: 42,
                borderRadius: isProf ? 0 : '14px',
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                bgcolor: 'var(--card-bg)',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'none',
                boxShadow: 'var(--shadow-soft)',
                '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)', borderColor: 'var(--accent-primary)' },
              }}
            >
              Planner Log
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => openCreateDialog('Todo')}
              sx={{
                flex: { xs: 1, md: 'none' },
                height: 42,
                borderRadius: isProf ? 0 : '14px',
                bgcolor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontWeight: 750,
                fontSize: '13px',
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' },
              }}
            >
              New Task
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Desktop Filter Toolbar */}
        {!isMobile && (
        <TiltCard
          maxTilt={1.5}
          enableRefraction={false}
          sx={{
            mb: 3,
            p: 1.5,
            bgcolor: 'var(--card-bg)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, gap: 2 }}
          >
            {/* Search Box */}
            <Box sx={{ position: 'relative', width: { xs: '100%', lg: '320px' } }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search tasks by name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 20 }} />,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-input)',
                    bgcolor: 'var(--bg-primary)',
                    fontSize: '13.5px',
                  },
                }}
              />
            </Box>

            {/* Date Filter Badges */}
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, alignItems: 'center' }}>
              <FilterListIcon sx={{ color: 'var(--text-secondary)', fontSize: 18 }} />
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'this_week', label: 'This Week' },
                  { key: 'this_month', label: 'This Month' },
                  { key: 'this_year', label: 'This Year' },
                  { key: 'custom', label: 'Custom' },
                ] as const
              ).map((tab) => (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  clickable
                  onClick={() => setDateFilter(tab.key)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: 'var(--radius-chip)',
                    bgcolor: dateFilter === tab.key ? 'var(--accent-primary)' : 'transparent',
                    color: dateFilter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: dateFilter === tab.key ? 'var(--accent-primary)' : 'var(--card-border)',
                    '&:hover': {
                      bgcolor: dateFilter === tab.key ? 'var(--accent-secondary)' : 'rgba(232, 90, 79, 0.08)',
                    },
                  }}
                />
              ))}
            </Stack>
          </Stack>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed var(--card-border)' }}>
              <TextField
                size="small"
                label="From Date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(clampYearToFourDigits(e.target.value))}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
              <TextField
                size="small"
                label="To Date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(clampYearToFourDigits(e.target.value))}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
            </Stack>
          )}
        </TiltCard>
        )}

        {/* Kanban Board Columns */}
{loading ? (
          <Box sx={{ py: 8 }}>
            <LogoLoader />
          </Box>
        ) : isMobile ? (
          /* Mobile View: Option B — Compact Overview (Reference Screenshot 2) */
          <Box sx={{ pb: 3 }}>
            {/* 1. Compact Search & Filter Row (Single 40px row, no horizontal scrolling tabs) */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search tasks by name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 0.8, fontSize: 18 }} />,
                    sx: { height: 40, borderRadius: isProf ? 0 : '12px', bgcolor: 'var(--card-bg)' }
                  }
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterListIcon sx={{ fontSize: 18, color: 'var(--accent-primary)' }} />}
                onClick={() => setMobileFilterSheetOpen(true)}
                sx={{
                  height: 40,
                  minWidth: 95,
                  flexShrink: 0,
                  borderRadius: isProf ? 0 : '12px',
                  borderColor: 'var(--card-border)',
                  bgcolor: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  textTransform: 'none',
                  px: 1.5,
                }}
              >
                Filter
                {(selectedStatusFilter !== 'all' || dateFilter !== 'all') && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--accent-primary)', ml: 0.8 }} />
                )}
              </Button>
            </Stack>

            {/* 2. 2x2 Responsive Grid of Status Summary Cards */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {/* To Do */}
              <Grid size={{ xs: 6 }}>
                <TiltCard
                  onClick={() => setSelectedStatusFilter((prev) => (prev === 'todo' ? 'all' : 'todo'))}
                  sx={{
                    p: 2,
                    borderRadius: isProf ? 0 : '18px',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selectedStatusFilter === 'todo' ? '#F59E0B' : 'var(--card-border)',
                    bgcolor: selectedStatusFilter === 'todo' ? (isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)') : 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                      <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                        To Do
                      </Typography>
                    </Stack>
                    <Box sx={{ color: '#F59E0B' }}>
                      <AssignmentIcon sx={{ fontSize: 22 }} />
                    </Box>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: 'var(--text-primary)' }}>
                    {columns.todo.length}
                  </Typography>
                </TiltCard>
              </Grid>

              {/* In Progress */}
              <Grid size={{ xs: 6 }}>
                <TiltCard
                  onClick={() => setSelectedStatusFilter((prev) => (prev === 'in_progress' ? 'all' : 'in_progress'))}
                  sx={{
                    p: 2,
                    borderRadius: isProf ? 0 : '18px',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selectedStatusFilter === 'in_progress' ? '#3B82F6' : 'var(--card-border)',
                    bgcolor: selectedStatusFilter === 'in_progress' ? (isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)') : 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                      <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                        In Progress
                      </Typography>
                    </Stack>
                    <Box sx={{ color: '#3B82F6' }}>
                      <AutorenewIcon sx={{ fontSize: 22 }} />
                    </Box>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: 'var(--text-primary)' }}>
                    {columns.in_progress.length}
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Completed */}
              <Grid size={{ xs: 6 }}>
                <TiltCard
                  onClick={() => setSelectedStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
                  sx={{
                    p: 2,
                    borderRadius: isProf ? 0 : '18px',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selectedStatusFilter === 'completed' ? '#10B981' : 'var(--card-border)',
                    bgcolor: selectedStatusFilter === 'completed' ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)') : 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                      <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                        Completed
                      </Typography>
                    </Stack>
                    <Box sx={{ color: '#10B981' }}>
                      <CheckCircleIcon sx={{ fontSize: 22 }} />
                    </Box>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: 'var(--text-primary)' }}>
                    {columns.completed.length}
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Overdue */}
              <Grid size={{ xs: 6 }}>
                <TiltCard
                  onClick={() => setSelectedStatusFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))}
                  sx={{
                    p: 2,
                    borderRadius: isProf ? 0 : '18px',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: selectedStatusFilter === 'overdue' ? '#EF4444' : 'var(--card-border)',
                    bgcolor: selectedStatusFilter === 'overdue' ? (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)') : 'var(--card-bg)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
                      <Typography variant="body2" sx={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                        Overdue
                      </Typography>
                    </Stack>
                    <Box sx={{ color: '#EF4444' }}>
                      <WarningAmberIcon sx={{ fontSize: 22 }} />
                    </Box>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 1, color: 'var(--text-primary)' }}>
                    {columns.overdue.length}
                  </Typography>
                </TiltCard>
              </Grid>
            </Grid>

            {/* 3. Tasks List Header with Sort Option */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                Tasks ({displayedTasks.length})
              </Typography>

              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                <SortIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                <Select
                  size="small"
                  variant="standard"
                  disableUnderline
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  sx={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}
                >
                  <MenuItem value="dueDate">Due Date</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                </Select>
              </Stack>
            </Stack>

            {/* 4. Single-Column Task Cards List */}
            {displayedTasks.length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: isProf ? 0 : '16px',
                  bgcolor: 'var(--card-bg)',
                  border: '1px dashed var(--card-border)',
                }}
              >
                <AssignmentIcon sx={{ fontSize: 40, color: 'var(--text-secondary)', opacity: 0.5, mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 750, color: 'var(--text-primary)', mb: 0.5 }}>
                  No Tasks Found
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
                  {searchQuery || selectedStatusFilter !== 'all' || dateFilter !== 'all'
                    ? 'No tasks match the active filters.'
                    : 'Get started by creating your first agile task.'}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openCreateDialog('Todo')}
                  sx={{
                    borderRadius: isProf ? 0 : '10px',
                    bgcolor: 'var(--accent-primary)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '12px',
                    px: 2,
                    '&:hover': { bgcolor: 'var(--accent-secondary)' },
                  }}
                >
                  New Task
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {displayedTasks.map((task) => {
                  const isCompleted = task.isCompleted;
                  const isPast = !isCompleted && new Date() > new Date(task.endTime);

                  return (
                    <TiltCard
                      key={task.id}
                      sx={{
                        p: 1.8,
                        borderRadius: isProf ? 0 : '16px',
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        borderLeft: isCompleted
                          ? '4px solid #10B981'
                          : isPast
                          ? '4px solid #EF4444'
                          : task.status === 'InProgress'
                          ? '4px solid #3B82F6'
                          : '4px solid #F59E0B',
                        opacity: isCompleted ? 0.78 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Row: Checkbox, Title, Actions */}
                      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'flex-start' }}>
                        {/* Completion Toggle */}
                        <IconButton
                          size="small"
                          onClick={() => handleToggleComplete(task)}
                          aria-label={isCompleted ? 'Mark Active' : 'Mark Complete'}
                          sx={{
                            color: isCompleted ? '#10B981' : isPast ? '#EF4444' : 'var(--text-secondary)',
                            p: 0.3,
                            mt: 0.1,
                            '&:hover': { color: '#10B981' },
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircleIcon sx={{ fontSize: 22 }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: 22 }} />
                          )}
                        </IconButton>

                        {/* Title & Badges */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 800,
                              fontSize: '14.5px',
                              color: 'var(--text-primary)',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              lineHeight: 1.3,
                              mb: 0.6,
                            }}
                          >
                            {task.title}
                          </Typography>

                          {/* Category and Priority Badges */}
                          <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.6, mb: 0.8 }}>
                            {task.category && (
                              <Chip
                                size="small"
                                label={task.category}
                                sx={{
                                  height: '20px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  bgcolor: 'rgba(59, 130, 246, 0.12)',
                                  color: '#3B82F6',
                                  borderRadius: isProf ? 0 : '6px',
                                  border: 'none',
                                }}
                              />
                            )}
                            {task.priority && (
                              <Chip
                                size="small"
                                label={task.priority}
                                sx={{
                                  height: '20px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  bgcolor:
                                    task.priority === 'Urgent'
                                      ? 'rgba(239, 68, 68, 0.12)'
                                      : task.priority === 'High'
                                      ? 'rgba(249, 115, 22, 0.12)'
                                      : 'rgba(245, 158, 11, 0.12)',
                                  color:
                                    task.priority === 'Urgent'
                                      ? '#EF4444'
                                      : task.priority === 'High'
                                      ? '#F97316'
                                      : '#F59E0B',
                                  borderRadius: isProf ? 0 : '6px',
                                  border: 'none',
                                }}
                              />
                            )}
                          </Stack>

                          {/* Description if present */}
                          {task.description && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'var(--text-secondary)',
                                fontSize: '12.5px',
                                mb: 1,
                                lineHeight: 1.35,
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}

                          {/* Time details */}
                          <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', color: isPast ? '#EF4444' : 'var(--text-secondary)' }}>
                            <ScheduleIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600 }}>
                              {new Date(task.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {' → '}
                              {new Date(task.endTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Stack>
                        </Box>

                        {/* Action Icons */}
                        <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(task)}
                            aria-label="Edit Task"
                            sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--accent-primary)' } }}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTask(task.id)}
                            aria-label="Delete Task"
                            sx={{ color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </TiltCard>
                  );
                })}
              </Stack>
            )}

            {/* Mobile Filter Sheet */}
            <MobileFilterSheet
              open={mobileFilterSheetOpen}
              onClose={() => setMobileFilterSheetOpen(false)}
              title="Filter Tasks"
              groups={[
                {
                  id: 'date',
                  label: 'Date Range',
                  selectedValue: dateFilter,
                  onChange: (val) => setDateFilter(val as any),
                  options: [
                    { value: 'all', label: 'All Tasks' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this_week', label: 'This Week' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'this_year', label: 'This Year' },
                    { value: 'custom', label: 'Custom' },
                  ],
                },
                {
                  id: 'status',
                  label: 'Status',
                  selectedValue: selectedStatusFilter,
                  onChange: (val) => setSelectedStatusFilter(val as any),
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'todo', label: 'To Do' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'overdue', label: 'Overdue' },
                  ],
                },
              ]}
              customDateRange={{
                start: customStart,
                end: customEnd,
                onStartChange: setCustomStart,
                onEndChange: setCustomEnd,
                show: dateFilter === 'custom',
              }}
              onReset={() => {
                setDateFilter('all');
                setSelectedStatusFilter('all');
                setSearchQuery('');
                setCustomStart('');
                setCustomEnd('');
              }}
            />
          </Box>
        ) : (
          /* Desktop 4-Column Agile Board */
          <ResizablePanel pageId="planner" componentId="kanban_board" defaultHeight={680} minHeight={450} maxHeight={1400}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: 2.5,
                alignItems: 'start',
                height: '100%',
                overflowY: 'auto',
                pr: 0.5,
              }}
            >
              {/* Column 1: To Do */}
              {renderKanbanColumn(
                'todo',
                'To Do',
                columns.todo,
                '#F59E0B',
                true,
                'Todo',
                handleDragOver,
                handleDragLeave,
                () => handleDrop('todo'),
                dragOverCol === 'todo'
              )}

              {/* Column 2: In Progress */}
              {renderKanbanColumn(
                'in_progress',
                'In Progress',
                columns.in_progress,
                '#3B82F6',
                true,
                'InProgress',
                handleDragOver,
                handleDragLeave,
                () => handleDrop('in_progress'),
                dragOverCol === 'in_progress'
              )}

              {/* Column 3: Completed */}
              {renderKanbanColumn(
                'completed',
                'Completed',
                columns.completed,
                '#10B981',
                true,
                'Completed',
                handleDragOver,
                handleDragLeave,
                () => handleDrop('completed'),
                dragOverCol === 'completed'
              )}

              {/* Column 4: Overdue */}
              {renderKanbanColumn(
                'overdue',
                'Overdue',
                columns.overdue,
                '#EF4444',
                false,
                'Todo',
                handleDragOver,
                handleDragLeave,
                () => handleDrop('overdue'),
                dragOverCol === 'overdue'
              )}
            </Box>
          </ResizablePanel>
        )}
      </Box>

      {/* CREATE / EDIT TASK DIALOG */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)', pb: 1 }}>
          {editingId ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          {timeRangeError && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2, borderRadius: '10px', fontSize: '13px' }}>
              {timeRangeError}
            </Alert>
          )}

          <form onSubmit={handleSaveTask} id="planner-form">
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                label="Task Title"
                required
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Landing Page Wireframes"
              />

              <TextField
                label="Description & Notes"
                multiline
                rows={2}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional task brief or checklist..."
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Column / Status</InputLabel>
                  <Select
                    value={targetStatus}
                    label="Column / Status"
                    onChange={(e) => setTargetStatus(e.target.value)}
                  >
                    <MenuItem value="Todo">To Do</MenuItem>
                    <MenuItem value="InProgress">In Progress</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={priority}
                    label="Priority"
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={category}
                    label="Category"
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <MenuItem value="Design">Design</MenuItem>
                    <MenuItem value="Development">Development</MenuItem>
                    <MenuItem value="Research">Research</MenuItem>
                    <MenuItem value="Meetings">Meetings</MenuItem>
                    <MenuItem value="Personal">Personal</MenuItem>
                    <MenuItem value="General">General</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  required
                  fullWidth
                  size="small"
                  value={startTime}
                  onChange={(e) => {
                    const val = clampYearToFourDigits(e.target.value);
                    setStartTime(val);
                    if (endTime) setTimeRangeError(validateRange(val, endTime));
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: '1900-01-01T00:00', max: '2099-12-31T23:59', maxLength: 16 },
                  }}
                />

                <TextField
                  label="End Time (Deadline)"
                  type="datetime-local"
                  required
                  fullWidth
                  size="small"
                  value={endTime}
                  onChange={(e) => {
                    const val = clampYearToFourDigits(e.target.value);
                    setEndTime(val);
                    if (startTime) setTimeRangeError(validateRange(startTime, val));
                  }}
                  error={!!timeRangeError}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: startTime || '1900-01-01T00:00', max: '2099-12-31T23:59', maxLength: 16 },
                  }}
                />
              </Stack>

              <FormControl fullWidth size="small">
                <InputLabel>Reminder Notification</InputLabel>
                <Select
                  value={reminderSchedule}
                  label="Reminder Notification"
                  onChange={(e) => setReminderSchedule(e.target.value as any)}
                >
                  <MenuItem value="none">No Reminder</MenuItem>
                  <MenuItem value="at_start">At Event Start Time</MenuItem>
                  <MenuItem value="15m">15 Minutes Before Start</MenuItem>
                  <MenuItem value="30m">30 Minutes Before Start</MenuItem>
                  <MenuItem value="1h">1 Hour Before Start</MenuItem>
                  <MenuItem value="custom">Custom Date & Time</MenuItem>
                </Select>
              </FormControl>

              {reminderSchedule === 'custom' && (
                <TextField
                  label="Custom Reminder Time"
                  type="datetime-local"
                  fullWidth
                  size="small"
                  value={customReminderDate}
                  onChange={(e) => setCustomReminderDate(clampYearToFourDigits(e.target.value))}
                  slotProps={STANDARD_DATETIME_INPUT_PROPS}
                />
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <IconSlideButton
            type="submit"
            form="planner-form"
            variant="contained"
            disabled={
              !title.trim() ||
              !startTime ||
              !endTime ||
              !isValidFourDigitYear(startTime) ||
              !isValidFourDigitYear(endTime) ||
              !!timeRangeError ||
              submitting
            }
            sx={{
              bgcolor: 'var(--accent-primary)',
              fontWeight: 700,
              px: 2.5,
              py: 0.8,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Task'}
          </IconSlideButton>
        </DialogActions>
      </Dialog>

      {/* PLANNER LOG & EXCEL EXPORT DIALOG */}
      <Dialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)', pb: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <HistoryIcon sx={{ color: 'var(--accent-primary)' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Planner Activity Log & Export
              </Typography>
            </Stack>
            <IconButton onClick={() => setLogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          {/* Log Filters Bar */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2.5, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
              <TextField
                size="small"
                placeholder="Search log..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 18 }} />,
                  },
                }}
                sx={{ minWidth: '220px' }}
              />

              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={logStatusFilter}
                  label="Status"
                  onChange={(e) => {
                    setLogStatusFilter(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="Todo">To Do</MenuItem>
                  <MenuItem value="InProgress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={logDateFilter}
                  label="Period"
                  onChange={(e) => {
                    setLogDateFilter(e.target.value as any);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="this_week">This Week</MenuItem>
                  <MenuItem value="this_month">This Month</MenuItem>
                  <MenuItem value="this_year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <IconSlideButton
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPlannerExcel}
              disabled={logRecords.length === 0}
              sx={{
                bgcolor: '#10B981',
                color: '#FFFFFF',
                fontWeight: 750,
                px: 2.5,
                py: 0.8,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Export Excel ({logRecords.length})
            </IconSlideButton>
          </Stack>

          {logDateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Log From"
                type="date"
                value={logCustomStart}
                onChange={(e) => {
                  setLogCustomStart(clampYearToFourDigits(e.target.value));
                  setLogPage(0);
                }}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
              <TextField
                size="small"
                label="Log To"
                type="date"
                value={logCustomEnd}
                onChange={(e) => {
                  setLogCustomEnd(clampYearToFourDigits(e.target.value));
                  setLogPage(0);
                }}
                slotProps={STANDARD_DATE_INPUT_PROPS}
              />
            </Stack>
          )}

          {/* Table */}
          {logRecords.length === 0 ? (
            <Box sx={{ py: 6, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Typography variant="body1">No tasks found matching the active log filters.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'var(--bg-primary)' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Task Title</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Schedule</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Deadline Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogRecords.map((task) => {
                    const col = getTaskColumn(task);
                    const isOverdue = col === 'overdue';
                    return (
                      <TableRow key={task.id} hover>
                        <TableCell sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {task.title}
                          {task.description && (
                            <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-secondary)' }}>
                              {task.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={col === 'in_progress' ? 'In Progress' : col === 'overdue' ? 'Overdue (-2)' : col.toUpperCase()}
                            sx={{
                              fontWeight: 700,
                              fontSize: '11px',
                              bgcolor:
                                col === 'completed'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : col === 'overdue'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : col === 'in_progress'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                col === 'completed'
                                  ? '#10B981'
                                  : col === 'overdue'
                                  ? '#EF4444'
                                  : col === 'in_progress'
                                  ? '#3B82F6'
                                  : '#F59E0B',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={task.category || 'General'}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 600,
                              bgcolor: CATEGORY_COLORS[task.category || 'General']?.bg,
                              color: CATEGORY_COLORS[task.category || 'General']?.text,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: PRIORITY_COLORS[task.priority || 'Medium'],
                            }}
                          >
                            {task.priority || 'Medium'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {formatTimeRange(task.startTime, task.endTime)}
                        </TableCell>
                        <TableCell>
                          {task.isCompleted ? (
                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                              Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                            </Typography>
                          ) : isOverdue ? (
                            <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 700 }}>
                              Overdue (−2 pts)
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                              Active
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={logRecords.length}
                rowsPerPage={logRowsPerPage}
                page={logPage}
                onPageChange={(_, p) => setLogPage(p)}
                onRowsPerPageChange={(e) => {
                  setLogRowsPerPage(parseInt(e.target.value, 10));
                  setLogPage(0);
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogOpen(false)} sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );

  // Helper renderer for a single Kanban Column
  function renderKanbanColumn(
    colKey: 'todo' | 'in_progress' | 'completed' | 'overdue',
    colTitle: string,
    tasks: PlannerEvent[],
    accentColor: string,
    allowCreate: boolean,
    targetCreateStatus: string,
    onDragOver: (e: React.DragEvent, col: string) => void,
    onDragLeave: () => void,
    onDrop: () => void,
    isDragOver: boolean
  ) {
    return (
      <Box
        onDragOver={(e) => onDragOver(e, colKey)}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        sx={{
          bgcolor: isDragOver ? 'rgba(232, 90, 79, 0.06)' : 'var(--bg-secondary)',
          borderRadius: 'var(--radius-card)',
          border: isDragOver ? '2px dashed var(--accent-primary)' : '1px solid var(--card-border)',
          p: 1.8,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '620px',
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
      >
        {/* Column Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: accentColor }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
              {colTitle}
            </Typography>
            <Chip
              label={tasks.length}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '11px',
                height: 20,
                bgcolor: 'var(--card-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
              }}
            />
          </Stack>

          {allowCreate && (
            <IconButton
              size="small"
              onClick={() => openCreateDialog(targetCreateStatus)}
              sx={{
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.12)', color: 'var(--accent-primary)' },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Stack>

        {/* Task Cards List */}
        <Stack spacing={1.6} sx={{ flex: 1, overflowY: 'auto' }}>
          {tasks.length === 0 ? (
            isMobile ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 5,
                  px: 3,
                  textAlign: 'center',
                  bgcolor: 'var(--card-bg)',
                  borderRadius: '24px',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                {/* 3D Clipboard Illustration */}
                <Box sx={{ width: 130, height: 130, mb: 2, position: 'relative' }}>
                  <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                    <ellipse cx="65" cy="88" rx="52" ry="24" fill="rgba(255, 120, 100, 0.12)" />
                    <rect x="30" y="24" width="70" height="88" rx="12" fill="#FFAB91" />
                    <rect x="32" y="26" width="66" height="84" rx="10" fill="#FF8A65" />
                    <rect x="50" y="16" width="30" height="14" rx="5" fill="#FFE0B2" />
                    <rect x="56" y="20" width="18" height="6" rx="3" fill="#FFB74D" />
                    <rect x="38" y="32" width="54" height="74" rx="6" fill="#FFFFFF" />
                    <rect x="44" y="44" width="12" height="12" rx="3" fill="none" stroke="#FF7043" strokeWidth="2" />
                    <path d="M47 50 L50 53 L54 46" stroke="#FF7043" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="62" y1="50" x2="82" y2="50" stroke="#FFE0B2" strokeWidth="3" strokeLinecap="round" />
                    <rect x="44" y="64" width="12" height="12" rx="3" fill="none" stroke="#FF7043" strokeWidth="2" />
                    <path d="M47 70 L50 73 L54 66" stroke="#FF7043" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="62" y1="70" x2="82" y2="70" stroke="#FFE0B2" strokeWidth="3" strokeLinecap="round" />
                    <line x1="44" y1="88" x2="72" y2="88" stroke="#FFE0B2" strokeWidth="3" strokeLinecap="round" />
                    <g transform="translate(86, 52) rotate(28)">
                      <rect x="0" y="0" width="10" height="42" rx="2" fill="#FFA726" />
                      <polygon points="0,42 10,42 5,52" fill="#FFE0B2" />
                      <polygon points="3,48 7,48 5,52" fill="#3E2723" />
                      <rect x="0" y="0" width="10" height="6" rx="2" fill="#E57373" />
                    </g>
                  </svg>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.8, fontSize: '18px' }}>
                  No tasks yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3, maxWidth: 260, fontSize: '13px', lineHeight: 1.4 }}>
                  Create your first task to get started and stay productive.
                </Typography>

                {allowCreate && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openCreateDialog(targetCreateStatus)}
                    sx={{
                      bgcolor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      fontWeight: 750,
                      px: 3.5,
                      py: 1.1,
                      fontSize: '14px',
                      borderRadius: '16px',
                      boxShadow: '0 6px 20px rgba(232, 90, 79, 0.4)',
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'var(--accent-secondary)' },
                    }}
                  >
                    New Task
                  </Button>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 6,
                  color: 'var(--text-secondary)',
                  border: '1px dashed var(--card-border)',
                  borderRadius: '12px',
                  bgcolor: 'var(--card-bg)',
                  opacity: 0.7,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  No tasks
                </Typography>
              </Box>
            )
          ) : (
            tasks.map((task) => {
              const catConfig = CATEGORY_COLORS[task.category || 'General'] || CATEGORY_COLORS.General;
              const isOverdue = colKey === 'overdue';

              return (
                <TiltCard
                  key={task.id}
                  maxTilt={3}
                  enableRefraction={false}
                  draggable={colKey !== 'overdue'}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  sx={{
                    borderRadius: '14px',
                    bgcolor: 'var(--card-bg)',
                    border: '1px solid',
                    borderColor: isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--card-border)',
                    boxShadow: 'var(--shadow-soft)',
                    cursor: colKey === 'overdue' ? 'default' : 'grab',
                    '&:active': { cursor: colKey === 'overdue' ? 'default' : 'grabbing' },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Card Top: Badges and Actions */}
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                      <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                        <Chip
                          label={task.category || 'General'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '10.5px',
                            height: 20,
                            bgcolor: catConfig.bg,
                            color: catConfig.text,
                            border: `1px solid ${catConfig.border}`,
                          }}
                        />
                        <Chip
                          label={task.priority || 'Medium'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '10px',
                            height: 18,
                            bgcolor: 'transparent',
                            color: PRIORITY_COLORS[task.priority || 'Medium'],
                            border: `1px solid ${PRIORITY_COLORS[task.priority || 'Medium']}`,
                          }}
                        />
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleComplete(task)}
                          title={task.isCompleted ? 'Mark Incomplete' : 'Complete Task'}
                          sx={{
                            color: task.isCompleted ? '#10B981' : 'var(--text-secondary)',
                            p: 0.5,
                          }}
                        >
                          {task.isCompleted ? (
                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                        <IconButton size="small" onClick={() => openEditDialog(task)} sx={{ p: 0.5 }}>
                          <EditIcon sx={{ fontSize: 17, color: 'var(--text-secondary)' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ p: 0.5 }}>
                          <DeleteIcon sx={{ fontSize: 17, color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }} />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {/* Task Title */}
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        mb: 0.8,
                        textDecoration: task.isCompleted ? 'line-through' : 'none',
                        opacity: task.isCompleted ? 0.75 : 1,
                        fontSize: '14.5px',
                        lineHeight: 1.35,
                      }}
                    >
                      {task.title}
                    </Typography>

                    {/* Optional description snippet */}
                    {task.description && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'var(--text-secondary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 1.2,
                          lineHeight: 1.4,
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}

                    {/* Card Footer: Time and Overdue indicator */}
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pt: 1,
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '11.5px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 13, color: isOverdue ? '#EF4444' : 'var(--text-secondary)' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '11px',
                            fontWeight: isOverdue ? 700 : 500,
                            color: isOverdue ? '#EF4444' : 'var(--text-secondary)',
                          }}
                        >
                          {formatTimeRange(task.startTime, task.endTime)}
                        </Typography>
                      </Stack>

                      {isOverdue && (
                        <Tooltip title="−2 Life Score penalty applied permanently for missing deadline">
                          <Chip
                            label="−2 Penalty"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '10px',
                              fontWeight: 800,
                              bgcolor: 'rgba(239, 68, 68, 0.12)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                          />
                        </Tooltip>
                      )}
                    </Stack>
                  </CardContent>
                </TiltCard>
              );
            })
          )}
        </Stack>
      </Box>
    );
  }
};

export default Planner;
