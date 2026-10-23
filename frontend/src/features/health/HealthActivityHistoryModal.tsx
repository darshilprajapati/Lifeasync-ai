import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  IconButton,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useThemeSystem } from '../../context/ThemeContext';

export interface HealthLogItem {
  id: number;
  logType: string;
  logValue: number;
  details?: string;
  logDate: string;
}

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';

interface HealthActivityHistoryModalProps {
  open: boolean;
  onClose: () => void;
  logs: HealthLogItem[];
  loading: boolean;
  onDeleteLog: (id: number) => Promise<void>;
}

const parseDateSafe = (dateStr: string) => {
  if (!dateStr) return new Date();
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const rawDate = new Date(dateStr);
      if (!isNaN(rawDate.getTime())) {
        return new Date(y, m, d, rawDate.getHours(), rawDate.getMinutes(), rawDate.getSeconds());
      }
      return new Date(y, m, d);
    }
  }
  return new Date(dateStr);
};

const isDateInPeriod = (
  dateStr: string,
  filter: DateFilterOption,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (filter === 'all' || !dateStr) return true;
  const d = parseDateSafe(dateStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  if (filter === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (filter === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return (
      d.getFullYear() === y.getFullYear() &&
      d.getMonth() === y.getMonth() &&
      d.getDate() === y.getDate()
    );
  }
  if (filter === 'this_week') {
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return d >= mon && d <= sun;
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

export const HealthActivityHistoryModal: React.FC<HealthActivityHistoryModalProps> = ({
  open,
  onClose,
  logs,
  loading,
  onDeleteLog
}) => {
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [dateFilter, setDateFilter] = useState<DateFilterOption>('this_month');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const getUnit = (type: string) => {
    switch (type) {
      case 'Water': return 'ml';
      case 'Workout': return 'mins';
      case 'Sleep': return 'hours';
      case 'Steps': return 'steps';
      case 'Calories': return 'kcal';
      default: return '';
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'Water': return <LocalDrinkIcon sx={{ color: '#2196F3', fontSize: 18 }} />;
      case 'Workout': return <FitnessCenterIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />;
      case 'Sleep': return <BedtimeIcon sx={{ color: '#9C27B0', fontSize: 18 }} />;
      case 'Steps': return <DirectionsWalkIcon sx={{ color: '#4CAF50', fontSize: 18 }} />;
      case 'Calories': return <RestaurantIcon sx={{ color: '#FF9800', fontSize: 18 }} />;
      default: return <FitnessCenterIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'Water': return '#2196F3';
      case 'Workout': return 'var(--accent-primary)';
      case 'Sleep': return '#9C27B0';
      case 'Steps': return '#4CAF50';
      case 'Calories': return '#FF9800';
      default: return '#6D6D6D';
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => {
        // Date match
        if (!isDateInPeriod(l.logDate, dateFilter, customStart, customEnd)) return false;

        // Category match
        if (categoryFilter !== 'All' && l.logType.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }

        // Search match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesDetails = (l.details || '').toLowerCase().includes(q);
          const matchesType = l.logType.toLowerCase().includes(q);
          if (!matchesDetails && !matchesType) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
  }, [logs, dateFilter, categoryFilter, searchQuery, customStart, customEnd]);

  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await onDeleteLog(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportFilteredCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Log ID', 'Category', 'Value', 'Unit', 'Details', 'Date & Time'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.logType,
      l.logValue,
      getUnit(l.logType),
      `"${(l.details || '').replace(/"/g, '""')}"`,
      new Date(l.logDate).toLocaleString()
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Health_Logs_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isProf ? '0px' : '20px',
            bgcolor: isProf
              ? 'var(--card-bg)'
              : isDark
              ? 'rgba(26, 29, 45, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: isProf ? 'none' : 'blur(16px)',
            border: isProf
              ? '1px solid var(--card-border)'
              : isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 111, 38, 0.2)',
            boxShadow: isProf ? 'none' : '0 16px 40px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh'
          }
        }
      }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                p: 0.8,
                borderRadius: isProf ? '0px' : '10px',
                bgcolor: 'rgba(255, 111, 38, 0.12)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HistoryIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Health Activity History & Filters
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                Filter, search, review, and export all recorded hydration, workout, sleep, step, and calorie records.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5, borderColor: isProf ? 'var(--card-border)' : 'rgba(255, 255, 255, 0.08)' }}>
        {/* Filters Row */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ mb: 2.5, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'var(--text-secondary)' }} />
                }
              }}
              sx={{ minWidth: 220, bgcolor: 'var(--card-bg)' }}
            />

            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'var(--card-bg)' }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="All">All Categories</MenuItem>
                <MenuItem value="Water">💧 Water</MenuItem>
                <MenuItem value="Sleep">🌙 Sleep</MenuItem>
                <MenuItem value="Steps">🚶 Steps</MenuItem>
                <MenuItem value="Calories">🍽️ Calories</MenuItem>
                <MenuItem value="Workout">🏋️ Workout</MenuItem>
              </Select>
            </FormControl>

            {/* Date Preset Filter */}
            <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'var(--card-bg)' }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateFilter}
                label="Date Range"
                onChange={(e) => {
                  setDateFilter(e.target.value as DateFilterOption);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="this_week">This Week</MenuItem>
                <MenuItem value="this_month">This Month</MenuItem>
                <MenuItem value="this_year">This Year</MenuItem>
                <MenuItem value="custom">Custom Range...</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Quick Export Button */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportFilteredCSV}
            disabled={filteredLogs.length === 0}
            sx={{
              borderRadius: isProf ? '0px' : '8px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '12px',
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              whiteSpace: 'nowrap'
            }}
          >
            Export Filtered CSV ({filteredLogs.length})
          </Button>
        </Stack>

        {/* Custom Date Inputs if selected */}
        {dateFilter === 'custom' && (
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              type="date"
              label="From Date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ bgcolor: 'var(--card-bg)' }}
            />
            <TextField
              size="small"
              type="date"
              label="To Date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setPage(0);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ bgcolor: 'var(--card-bg)' }}
            />
          </Stack>
        )}

        {/* Table Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'var(--accent-primary)' }} />
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FitnessCenterIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1.5 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              No health activity logs match the selected filters.
            </Typography>
            <Typography variant="caption">
              Try adjusting the date range, category, or search term to see more entries.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isProf ? 'var(--bg-secondary)' : isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255, 111, 38, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>Recorded Value</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>Details / Note</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>Timestamp</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLogs.map((l) => {
                  const color = getLogColor(l.logType);
                  return (
                    <TableRow
                      key={l.id}
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: isProf ? 'rgba(0,0,0,0.02)' : 'rgba(255, 111, 38, 0.03)'
                        }
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Box sx={{ bgcolor: `${color}15`, p: 0.6, borderRadius: '6px', display: 'flex' }}>
                            {getLogTypeIcon(l.logType)}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {l.logType}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${l.logValue} ${getUnit(l.logType)}`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '11px',
                            bgcolor: `${color}18`,
                            color: color,
                            border: `1px solid ${color}35`,
                            borderRadius: '6px'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" sx={{ color: 'var(--text-primary)', wordBreak: 'break-word', fontSize: '12.5px' }}>
                          {l.details || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {parseDateSafe(l.logDate).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(l.id)}
                          disabled={deletingId === l.id}
                          sx={{ color: '#EF4444', p: 0.5 }}
                          title="Delete health record"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
