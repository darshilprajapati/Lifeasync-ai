import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Alert,
  Stack,
  Chip,
  Button,
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
  Drawer,
  Link,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';

import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';
import { exportToExcel } from '../utils/excelExport';

export interface StageHistory {
  id: number;
  jobApplicationId: number;
  fromStage: string;
  toStage: string;
  transitionDate: string;
  note?: string;
}

export interface JobApplication {
  id: number;
  company: string;
  position: string;
  status: string; // 'Saved' | 'Applied' | 'Interview' | 'Offered' | 'Rejected'
  appliedDate: string;
  notes?: string;
  category?: string;
  jobType?: string;
  workplaceType?: string;
  location?: string;
  salary?: string;
  url?: string;
  userId?: number;
  stageHistories?: StageHistory[];
}

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';

const STAGES = [
  { key: 'Saved', label: 'Saved Jobs', color: '#6B7280' },
  { key: 'Applied', label: 'Applied', color: '#3B82F6' },
  { key: 'Interview', label: 'Interviews', color: '#8B5CF6' },
  { key: 'Offered', label: 'Offered Jobs', color: '#10B981' },
  { key: 'Rejected', label: 'Rejected', color: '#EF4444' },
];

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

const normalizeStage = (status: string): string => {
  if (!status) return 'Applied';
  const s = status.trim().toLowerCase();
  if (s === 'interviewing' || s === 'interview') return 'Interview';
  if (s === 'saved') return 'Saved';
  if (s === 'applied') return 'Applied';
  if (s === 'offered') return 'Offered';
  if (s === 'rejected') return 'Rejected';
  return 'Applied';
};

const Career: React.FC = () => {
  const { notify } = useNotification();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag and drop state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Transition Note Prompt (Unobtrusive bar/popover)
  const [transitionPrompt, setTransitionPrompt] = useState<{
    jobId: number;
    company: string;
    position: string;
    newStage: string;
  } | null>(null);
  const [transitionNoteText, setTransitionNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Create / Edit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [stage, setStage] = useState('Applied');
  const [appliedDate, setAppliedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Development');
  const [jobType, setJobType] = useState('Full-time');
  const [workplaceType, setWorkplaceType] = useState('Remote');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Job Details Drawer State
  const [detailsDrawerJob, setDetailsDrawerJob] = useState<JobApplication | null>(null);

  // Career Log Modal State
  const [logOpen, setLogOpen] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStageFilter, setLogStageFilter] = useState<string>('All');
  const [logDateFilter, setLogDateFilter] = useState<DateFilterOption>('all');
  const [logCustomStart, setLogCustomStart] = useState('');
  const [logCustomEnd, setLogCustomEnd] = useState('');
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/career');
      if (res.data.isSuccess) {
        setApplications(res.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load job applications.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openCreateDialog = (initialStage: string = 'Applied') => {
    setEditingId(null);
    setCompany('');
    setPosition('');
    setStage(initialStage);
    setAppliedDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setCategory('Development');
    setJobType('Full-time');
    setWorkplaceType('Remote');
    setLocation('San Francisco, CA');
    setSalary('$120k - $150k');
    setUrl('');
    setDialogOpen(true);
  };

  const openEditDialog = (job: JobApplication) => {
    setEditingId(job.id);
    setCompany(job.company);
    setPosition(job.position);
    setStage(normalizeStage(job.status));
    setAppliedDate(new Date(job.appliedDate).toISOString().slice(0, 10));
    setNotes(job.notes || '');
    setCategory(job.category || 'Development');
    setJobType(job.jobType || 'Full-time');
    setWorkplaceType(job.workplaceType || 'Remote');
    setLocation(job.location || '');
    setSalary(job.salary || '');
    setUrl(job.url || '');
    setDialogOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim() || !appliedDate) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiClient.put(`/api/career/${editingId}`, {
          company: company.trim(),
          position: position.trim(),
          status: stage,
          appliedDate: new Date(appliedDate).toISOString(),
          notes: notes.trim(),
          category: category.trim(),
          jobType,
          workplaceType,
          location: location.trim(),
          salary: salary.trim(),
          url: url.trim(),
        });
        if (res.data.isSuccess) {
          trackAction('career_job_updated', { module: 'career', action: 'edit' });
          notify.success(`Job at ${company.trim()} updated.`);
          setApplications((prev) => prev.map((j) => (j.id === editingId ? res.data.data : j)));
          if (detailsDrawerJob && detailsDrawerJob.id === editingId) {
            setDetailsDrawerJob(res.data.data);
          }
          setDialogOpen(false);
        }
      } else {
        const res = await apiClient.post('/api/career', {
          company: company.trim(),
          position: position.trim(),
          status: stage,
          appliedDate: new Date(appliedDate).toISOString(),
          notes: notes.trim(),
          category: category.trim(),
          jobType,
          workplaceType,
          location: location.trim(),
          salary: salary.trim(),
          url: url.trim(),
        });
        if (res.data.isSuccess) {
          trackAction('career_job_created', { module: 'career', action: 'create' });
          notify.success(`Job at ${company.trim()} tracked in ${stage}.`);
          setApplications((prev) => [res.data.data, ...prev]);
          setDialogOpen(false);
        }
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to save job application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/career/${id}`);
      if (res.data.isSuccess) {
        trackAction('career_job_deleted', { module: 'career', action: 'delete' });
        notify.success('Job application deleted.');
        setApplications((prev) => prev.filter((j) => j.id !== id));
        if (detailsDrawerJob && detailsDrawerJob.id === id) {
          setDetailsDrawerJob(null);
        }
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to delete application.');
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    setDragOverStage(targetStageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (targetStageKey: string) => {
    setDragOverStage(null);
    if (!draggingId) return;

    const job = applications.find((j) => j.id === draggingId);
    if (!job) return;

    const oldStage = normalizeStage(job.status);
    if (oldStage === targetStageKey) {
      setDraggingId(null);
      return;
    }

    // 1. Immediate optimistic UI update
    const prevApps = [...applications];
    const timestamp = new Date().toISOString();
    const optimisticHistory: StageHistory = {
      id: Date.now(),
      jobApplicationId: job.id,
      fromStage: oldStage,
      toStage: targetStageKey,
      transitionDate: timestamp,
    };

    setApplications((prev) =>
      prev.map((item) =>
        item.id === job.id
          ? {
              ...item,
              status: targetStageKey,
              stageHistories: [...(item.stageHistories || []), optimisticHistory],
            }
          : item
      )
    );

    // 2. Persist to backend
    try {
      const res = await apiClient.put(`/api/career/${job.id}/status`, {
        status: targetStageKey,
      });

      if (!res.data.isSuccess) {
        setApplications(prevApps);
        notify.error('Failed to update stage on server.');
      } else {
        // Show unobtrusive prompt for optional transition note
        setTransitionPrompt({
          jobId: job.id,
          company: job.company,
          position: job.position,
          newStage: targetStageKey,
        });
        setTransitionNoteText('');
        notify.success(`Moved ${job.company} to ${targetStageKey}`);
      }
    } catch (err: any) {
      setApplications(prevApps);
      notify.error(err.response?.data?.message || 'Failed to change stage. Reverting position.');
    } finally {
      setDraggingId(null);
    }
  };

  const handleSaveTransitionNote = async () => {
    if (!transitionPrompt) return;
    if (!transitionNoteText.trim()) {
      setTransitionPrompt(null);
      return;
    }

    setSavingNote(true);
    try {
      const res = await apiClient.put(`/api/career/${transitionPrompt.jobId}/status`, {
        status: transitionPrompt.newStage,
        note: transitionNoteText.trim(),
      });
      if (res.data.isSuccess) {
        notify.success('Transition note saved to history.');
        // Refresh job histories
        setApplications((prev) =>
          prev.map((j) => {
            if (j.id === transitionPrompt.jobId) {
              const histories = [...(j.stageHistories || [])];
              const last = histories[histories.length - 1];
              if (last && last.toStage === transitionPrompt.newStage) {
                last.note = transitionNoteText.trim();
              }
              return { ...j, stageHistories: histories };
            }
            return j;
          })
        );
      }
    } catch {
      notify.warning('Could not attach note, but stage change was preserved.');
    } finally {
      setSavingNote(false);
      setTransitionPrompt(null);
      setTransitionNoteText('');
    }
  };

  // Filtered applications for Kanban Board
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchPeriod = isDateInPeriod(app.appliedDate, dateFilter, customStart, customEnd);
      if (!matchPeriod) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const compMatch = app.company.toLowerCase().includes(q);
        const posMatch = app.position.toLowerCase().includes(q);
        const catMatch = (app.category || '').toLowerCase().includes(q);
        const locMatch = (app.location || '').toLowerCase().includes(q);
        if (!compMatch && !posMatch && !catMatch && !locMatch) return false;
      }
      return true;
    });
  }, [applications, dateFilter, customStart, customEnd, searchQuery]);

  // Group applications by stage
  const stageGroups = useMemo(() => {
    const groups: Record<string, JobApplication[]> = {
      Saved: [],
      Applied: [],
      Interview: [],
      Offered: [],
      Rejected: [],
    };

    filteredApplications.forEach((app) => {
      const st = normalizeStage(app.status);
      if (groups[st]) groups[st].push(app);
      else groups.Applied.push(app);
    });

    return groups;
  }, [filteredApplications]);

  // Filtered records for Career Log & Excel Export
  const logRecords = useMemo(() => {
    return applications.filter((app) => {
      const matchPeriod = isDateInPeriod(app.appliedDate, logDateFilter, logCustomStart, logCustomEnd);
      if (!matchPeriod) return false;

      if (logStageFilter !== 'All') {
        if (normalizeStage(app.status) !== logStageFilter) return false;
      }

      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const compMatch = app.company.toLowerCase().includes(q);
        const posMatch = app.position.toLowerCase().includes(q);
        const catMatch = (app.category || '').toLowerCase().includes(q);
        if (!compMatch && !posMatch && !catMatch) return false;
      }
      return true;
    });
  }, [applications, logDateFilter, logCustomStart, logCustomEnd, logStageFilter, logSearch]);

  const pagedLogRecords = useMemo(() => {
    const start = logPage * logRowsPerPage;
    return logRecords.slice(start, start + logRowsPerPage);
  }, [logRecords, logPage, logRowsPerPage]);

  const handleExportCareerExcel = () => {
    const exportRows = logRecords.map((job) => {
      const latestHistory = job.stageHistories && job.stageHistories.length > 0
        ? job.stageHistories[job.stageHistories.length - 1]
        : null;

      return {
        ID: job.id,
        Company: job.company,
        Position: job.position,
        Stage: normalizeStage(job.status),
        Category: job.category || 'General',
        'Workplace Type': job.workplaceType || 'Remote',
        'Job Type': job.jobType || 'Full-time',
        Location: job.location || '',
        Salary: job.salary || '',
        'Applied Date': new Date(job.appliedDate).toLocaleDateString(),
        'Posting URL': job.url || '',
        'Latest Stage Note': latestHistory?.note || '',
        'Stage Transitions Count': job.stageHistories?.length || 0,
      };
    });

    exportToExcel(
      exportRows,
      `LifeSync_Career_Log_${new Date().toISOString().slice(0, 10)}`,
      'Job Applications'
    );
    notify.success(`Exported ${exportRows.length} jobs matching active filters.`);
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
                <WorkIcon sx={{ color: 'var(--accent-primary)', fontSize: 26 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Career
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Applyarc-style Kanban board. Track interviews, job stages, notes, and transition histories.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => {
                setLogPage(0);
                setLogOpen(true);
              }}
              sx={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                bgcolor: 'var(--card-bg)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 'var(--radius-button)',
                '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)', borderColor: 'var(--accent-primary)' },
              }}
            >
              Career Log
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreateDialog('Applied')}
              sx={{
                bgcolor: 'var(--accent-primary)',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                borderRadius: 'var(--radius-button)',
                boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' },
              }}
            >
              Add Job
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Unobtrusive Optional Note Bar for recent stage transition */}
        {transitionPrompt && (
          <Card
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '2px solid var(--accent-primary)',
              boxShadow: 'var(--shadow-hover)',
              animation: 'fadeIn 0.25s ease-in',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  Moved {transitionPrompt.company} ({transitionPrompt.position}) → {transitionPrompt.newStage}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Would you like to attach an optional transition note to this milestone?
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ flex: 1, maxWidth: { md: '520px' } }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. Recruiter scheduled round 2 for Friday..."
                  value={transitionNoteText}
                  onChange={(e) => setTransitionNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTransitionNote();
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={savingNote || !transitionNoteText.trim()}
                  onClick={handleSaveTransitionNote}
                  sx={{ bgcolor: 'var(--accent-primary)', whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 700 }}
                >
                  Save Note
                </Button>
                <Button
                  size="small"
                  onClick={() => setTransitionPrompt(null)}
                  sx={{ color: 'var(--text-secondary)', textTransform: 'none' }}
                >
                  Skip
                </Button>
              </Stack>
            </Stack>
          </Card>
        )}

        {/* Filter Toolbar */}
        <Card
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
            <Box sx={{ position: 'relative', width: { xs: '100%', lg: '320px' } }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search jobs by company, title, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 20 }} />,
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, alignItems: 'center' }}>
              <FilterListIcon sx={{ color: 'var(--text-secondary)', fontSize: 18 }} />
              {(
                [
                  { key: 'all', label: 'All Jobs' },
                  { key: 'today', label: 'Today' },
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
                  }}
                />
              ))}
            </Stack>
          </Stack>

          {dateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed var(--card-border)' }}>
              <TextField
                size="small"
                label="Applied From"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label="Applied To"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}
        </Card>

        {/* Applyarc Kanban Board (5 Columns) */}
        {loading ? (
          <Box sx={{ py: 8 }}>
            <LogoLoader />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {STAGES.map((s) => {
              const jobs = stageGroups[s.key] || [];
              const isOver = dragOverStage === s.key;

              return (
                <Box
                  key={s.key}
                  onDragOver={(e) => handleDragOver(e, s.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(s.key)}
                  sx={{
                    bgcolor: isOver ? 'rgba(232, 90, 79, 0.07)' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-card)',
                    border: isOver ? '2px dashed var(--accent-primary)' : '1px solid var(--card-border)',
                    p: 1.8,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '620px',
                    transition: '0.2s',
                  }}
                >
                  {/* Column Header */}
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.8 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: s.color }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                        {s.label}
                      </Typography>
                      <Chip
                        label={jobs.length}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '10.5px',
                          fontWeight: 800,
                          bgcolor: 'var(--card-bg)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--card-border)',
                        }}
                      />
                    </Stack>

                    <IconButton
                      size="small"
                      onClick={() => openCreateDialog(s.key)}
                      sx={{
                        p: 0.5,
                        bgcolor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <AddIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Stack>

                  {/* Cards List */}
                  <Stack spacing={1.5} sx={{ flex: 1, overflowY: 'auto' }}>
                    {jobs.length === 0 ? (
                      <Box
                        sx={{
                          py: 5,
                          textAlign: 'center',
                          border: '1px dashed var(--card-border)',
                          borderRadius: '10px',
                          bgcolor: 'var(--card-bg)',
                          opacity: 0.6,
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Drop cards here
                        </Typography>
                      </Box>
                    ) : (
                      jobs.map((job) => {
                        const latestNote =
                          job.stageHistories && job.stageHistories.length > 0
                            ? job.stageHistories[job.stageHistories.length - 1]?.note
                            : null;

                        return (
                          <Card
                            key={job.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, job.id)}
                            onClick={() => setDetailsDrawerJob(job)}
                            sx={{
                              p: 1.8,
                              borderRadius: '12px',
                              bgcolor: 'var(--card-bg)',
                              border: '1px solid var(--card-border)',
                              boxShadow: 'var(--shadow-soft)',
                              cursor: 'grab',
                              transition: 'transform 0.15s, box-shadow 0.15s',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 'var(--shadow-hover)',
                              },
                              '&:active': { cursor: 'grabbing' },
                            }}
                          >
                            {/* Card Top: Company & Actions */}
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Box
                                  sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '6px',
                                    bgcolor: 'rgba(232, 90, 79, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <BusinessIcon sx={{ fontSize: 16, color: 'var(--accent-primary)' }} />
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {job.company}
                                </Typography>
                              </Stack>

                              <Stack direction="row" spacing={0.3} onClick={(e) => e.stopPropagation()}>
                                <IconButton size="small" onClick={() => openEditDialog(job)} sx={{ p: 0.5 }}>
                                  <EditIcon sx={{ fontSize: 15, color: 'var(--text-secondary)' }} />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteJob(job.id)} sx={{ p: 0.5 }}>
                                  <DeleteIcon sx={{ fontSize: 15, color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }} />
                                </IconButton>
                              </Stack>
                            </Stack>

                            {/* Job Position Title */}
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.8 }}>
                              {job.position}
                            </Typography>

                            {/* Metadata Pills */}
                            <Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                              {job.jobType && (
                                <Chip
                                  label={job.jobType}
                                  size="small"
                                  sx={{ height: 18, fontSize: '10px', fontWeight: 600, bgcolor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                                />
                              )}
                              {job.workplaceType && (
                                <Chip
                                  label={job.workplaceType}
                                  size="small"
                                  sx={{ height: 18, fontSize: '10px', fontWeight: 600, bgcolor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                                />
                              )}
                              {job.salary && (
                                <Chip
                                  label={job.salary}
                                  size="small"
                                  sx={{ height: 18, fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                                />
                              )}
                            </Stack>

                            {/* Latest Transition Note snippet if available */}
                            {latestNote && (
                              <Box
                                sx={{
                                  p: 1,
                                  mb: 1,
                                  borderRadius: '6px',
                                  bgcolor: 'var(--bg-secondary)',
                                  borderLeft: '2px solid var(--accent-primary)',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  "{latestNote}"
                                </Typography>
                              </Box>
                            )}

                            {/* Card Footer: Date, Location, and Link */}
                            <Stack
                              direction="row"
                              sx={{
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                pt: 1,
                                borderTop: '1px solid var(--border-color)',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontSize: '10.5px' }}>
                                {new Date(job.appliedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Typography>

                              {job.url ? (
                                <Link
                                  href={job.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.3,
                                    color: 'var(--accent-primary)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                >
                                  Posting <OpenInNewIcon sx={{ fontSize: 11 }} />
                                </Link>
                              ) : (
                                <Typography variant="caption" sx={{ fontSize: '10.5px' }}>
                                  {job.stageHistories?.length || 1} transitions
                                </Typography>
                              )}
                            </Stack>
                          </Card>
                        );
                      })
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* JOB DETAILS DRAWER (Shows complete Stage History) */}
      <Drawer
        anchor="right"
        open={!!detailsDrawerJob}
        onClose={() => setDetailsDrawerJob(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: '480px' },
              bgcolor: 'var(--card-bg)',
              p: 3,
            },
          },
        }}
      >
        {detailsDrawerJob && (
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Chip
                label={normalizeStage(detailsDrawerJob.status)}
                sx={{ fontWeight: 800, bgcolor: 'var(--accent-primary)', color: '#FFFFFF' }}
              />
              <IconButton onClick={() => setDetailsDrawerJob(null)} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
              {detailsDrawerJob.position}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--accent-primary)', mb: 2 }}>
              {detailsDrawerJob.company}
            </Typography>

            {/* Key Metadata Table */}
            <Stack spacing={1.2} sx={{ mb: 3, p: 2, bgcolor: 'var(--bg-secondary)', borderRadius: '12px' }}>
              {detailsDrawerJob.location && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', fontSize: '13px' }}>
                  <LocationOnIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-primary)' }}>
                    {detailsDrawerJob.location}
                  </Typography>
                </Stack>
              )}
              {detailsDrawerJob.salary && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', fontSize: '13px' }}>
                  <AttachMoneyIcon sx={{ fontSize: 16, color: '#10B981' }} />
                  <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 700 }}>
                    {detailsDrawerJob.salary}
                  </Typography>
                </Stack>
              )}
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                Applied: {new Date(detailsDrawerJob.appliedDate).toLocaleDateString()} • {detailsDrawerJob.jobType || 'Full-time'} ({detailsDrawerJob.workplaceType || 'Remote'})
              </Typography>
              {detailsDrawerJob.url && (
                <Link
                  href={detailsDrawerJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '13px' }}
                >
                  View Job Posting <OpenInNewIcon sx={{ fontSize: 14 }} />
                </Link>
              )}
            </Stack>

            {detailsDrawerJob.notes && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 1 }}>
                  Application Notes
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', bgcolor: 'var(--bg-secondary)', p: 1.5, borderRadius: '8px' }}>
                  {detailsDrawerJob.notes}
                </Typography>
              </Box>
            )}

            {/* Stage Transition History Timeline */}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon sx={{ fontSize: 18, color: 'var(--accent-primary)' }} />
              Stage Transition History
            </Typography>

            <Stack spacing={2} sx={{ pl: 1, borderLeft: '2px solid var(--card-border)', ml: 1 }}>
              {(detailsDrawerJob.stageHistories || []).map((h, idx) => (
                <Box key={h.id || idx} sx={{ position: 'relative', pl: 2 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -9,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: 'var(--accent-primary)',
                      border: '2px solid var(--card-bg)',
                    }}
                  />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {h.fromStage} → {h.toStage}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      {new Date(h.transitionDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Stack>
                  {h.note && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        bgcolor: 'var(--bg-secondary)',
                        p: 1,
                        borderRadius: '6px',
                      }}
                    >
                      "{h.note}"
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  const target = detailsDrawerJob;
                  setDetailsDrawerJob(null);
                  openEditDialog(target);
                }}
              >
                Edit Job
              </Button>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => handleDeleteJob(detailsDrawerJob.id)}
              >
                Delete Job
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* CREATE / EDIT JOB APPLICATION MODAL */}
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
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
          {editingId ? 'Edit Job Application' : 'Add Job Application'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <form onSubmit={handleSaveJob} id="career-form">
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Company Name"
                  required
                  fullWidth
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. OpenAI, Stripe"
                />
                <TextField
                  label="Job Title / Position"
                  required
                  fullWidth
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Senior Frontend Architect"
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Board Stage</InputLabel>
                  <Select
                    value={stage}
                    label="Board Stage"
                    onChange={(e) => setStage(e.target.value)}
                  >
                    <MenuItem value="Saved">Saved</MenuItem>
                    <MenuItem value="Applied">Applied</MenuItem>
                    <MenuItem value="Interview">Interview</MenuItem>
                    <MenuItem value="Offered">Offered</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Application Date"
                  type="date"
                  required
                  fullWidth
                  size="small"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Job Type</InputLabel>
                  <Select
                    value={jobType}
                    label="Job Type"
                    onChange={(e) => setJobType(e.target.value)}
                  >
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Internship">Internship</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Workplace</InputLabel>
                  <Select
                    value={workplaceType}
                    label="Workplace"
                    onChange={(e) => setWorkplaceType(e.target.value)}
                  >
                    <MenuItem value="Remote">Remote</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                    <MenuItem value="Onsite">Onsite</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Location"
                  fullWidth
                  size="small"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Remote"
                />
                <TextField
                  label="Salary Range"
                  fullWidth
                  size="small"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. $140,000 - $170,000"
                />
              </Stack>

              <TextField
                label="Job Posting URL"
                fullWidth
                size="small"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />

              <TextField
                label="Notes & Context"
                multiline
                rows={2}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Referral name, key interview topics, or recruiter contacts..."
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="career-form"
            variant="contained"
            disabled={!company.trim() || !position.trim() || !appliedDate || submitting}
            sx={{
              bgcolor: 'var(--accent-primary)',
              fontWeight: 700,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {submitting ? 'Saving...' : editingId ? 'Update Job' : 'Add to Board'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CAREER LOG & EXCEL EXPORT MODAL */}
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
                Career Application Log & Export
              </Typography>
            </Stack>
            <IconButton onClick={() => setLogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2.5, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
              <TextField
                size="small"
                placeholder="Search jobs..."
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
                <InputLabel>Stage</InputLabel>
                <Select
                  value={logStageFilter}
                  label="Stage"
                  onChange={(e) => {
                    setLogStageFilter(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="All">All Stages</MenuItem>
                  <MenuItem value="Saved">Saved</MenuItem>
                  <MenuItem value="Applied">Applied</MenuItem>
                  <MenuItem value="Interview">Interview</MenuItem>
                  <MenuItem value="Offered">Offered</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
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

            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCareerExcel}
              disabled={logRecords.length === 0}
              sx={{
                bgcolor: '#10B981',
                color: '#FFFFFF',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 'var(--radius-button)',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Export Excel ({logRecords.length})
            </Button>
          </Stack>

          {logDateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Applied From"
                type="date"
                value={logCustomStart}
                onChange={(e) => {
                  setLogCustomStart(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label="Applied To"
                type="date"
                value={logCustomEnd}
                onChange={(e) => {
                  setLogCustomEnd(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}

          {logRecords.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Typography variant="body1">No job applications match the active log filters.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'var(--bg-primary)' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Applied Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Latest Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogRecords.map((job) => {
                    const st = normalizeStage(job.status);
                    const latestH = job.stageHistories && job.stageHistories.length > 0
                      ? job.stageHistories[job.stageHistories.length - 1]
                      : null;

                    return (
                      <TableRow key={job.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {job.company}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {job.position}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={st}
                            sx={{
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor:
                                st === 'Offered'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : st === 'Interview'
                                  ? 'rgba(139, 92, 246, 0.15)'
                                  : st === 'Rejected'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                              color:
                                st === 'Offered'
                                  ? '#10B981'
                                  : st === 'Interview'
                                  ? '#8B5CF6'
                                  : st === 'Rejected'
                                  ? '#EF4444'
                                  : '#3B82F6',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {job.location || 'Remote'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(job.appliedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {latestH?.note || job.notes || '—'}
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
};

export default Career;
