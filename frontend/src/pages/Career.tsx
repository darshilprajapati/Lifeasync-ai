import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Select, MenuItem, InputLabel, FormControl, IconButton, Alert, Stack, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';

interface JobApplication {
  id: number;
  company: string;
  position: string;
  status: string; // 'Applied', 'Interviewing', 'Offered', 'Rejected'
  appliedDate: string;
  notes?: string;
}

const Career: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('Applied');
  const [appliedDate, setAppliedDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parseDateParts = (dateStr: string): { year: number; month: number; day: number; yearStr: string } | null => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(/[-/.]/);
    if (parts.length !== 3) return null;

    let yearPart = '';
    let monthPart = '';
    let dayPart = '';

    if (parts[0].length >= 4) {
      // YYYY-MM-DD
      yearPart = parts[0];
      monthPart = parts[1];
      dayPart = parts[2];
    } else if (parts[2].length >= 4) {
      // DD-MM-YYYY or MM-DD-YYYY
      yearPart = parts[2];
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      if (p0 > 12) {
        dayPart = parts[0];
        monthPart = parts[1];
      } else if (p1 > 12) {
        monthPart = parts[0];
        dayPart = parts[1];
      } else {
        dayPart = parts[0];
        monthPart = parts[1];
      }
    } else {
      yearPart = parts[0];
      monthPart = parts[1];
      dayPart = parts[2];
    }

    return {
      year: parseInt(yearPart, 10),
      month: parseInt(monthPart, 10),
      day: parseInt(dayPart, 10),
      yearStr: yearPart
    };
  };

  const validateDateString = (value: string): { isValid: boolean; error?: string; normalized?: string } => {
    if (!value) {
      return { isValid: false, error: 'Applied date is required.' };
    }

    const parsed = parseDateParts(value);
    if (!parsed) {
      return { isValid: false, error: 'Please enter a valid date in YYYY-MM-DD or DD-MM-YYYY format.' };
    }

    const { year, month, day, yearStr } = parsed;

    // Strict 4-digit year rule: cannot be less or more than 4 digits
    if (yearStr.length !== 4 || !/^\d{4}$/.test(yearStr)) {
      return { isValid: false, error: 'Year must be exactly four digits (YYYY).' };
    }

    if (isNaN(year) || year < 1900 || year > 2100) {
      return { isValid: false, error: 'Year must be a 4-digit number between 1900 and 2100.' };
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return { isValid: false, error: 'Month must be between 01 and 12.' };
    }

    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const maxDays = daysInMonth[month - 1];

    if (isNaN(day) || day < 1 || day > maxDays) {
      if (month === 2 && day === 29 && !isLeapYear) {
        return { isValid: false, error: `${year} is not a leap year. February only has 28 days.` };
      }
      return { isValid: false, error: `Day must be between 01 and ${maxDays} for month ${month}.` };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const normalized = `${year}-${pad(month)}-${pad(day)}`;

    return { isValid: true, normalized };
  };

  const handleDateChange = (rawVal: string) => {
    if (!rawVal) {
      setAppliedDate('');
      setDateError(null);
      return;
    }

    const parsed = parseDateParts(rawVal);
    if (parsed && parsed.yearStr.length > 4) {
      setAppliedDate(rawVal);
      setDateError('Year cannot exceed 4 digits (YYYY).');
      return;
    }

    const check = validateDateString(rawVal);
    if (check.isValid && check.normalized) {
      setAppliedDate(check.normalized);
      setDateError(null);
    } else {
      setAppliedDate(rawVal);
      setDateError(check.error || 'Invalid date.');
    }
  };

  const handleDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text').trim();
    const parts = pasteData.split(/[-/.]/);
    const hasOversizedYear = parts.some((p) => /^\d{5,}$/.test(p)) || /\d{5,}/.test(pasteData);
    if (hasOversizedYear) {
      e.preventDefault();
      setDateError('Year cannot exceed 4 digits (YYYY).');
      return;
    }

    const check = validateDateString(pasteData);
    if (check.isValid && check.normalized) {
      e.preventDefault();
      setAppliedDate(check.normalized);
      setDateError(null);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/career');
      if (res.data.isSuccess) {
        setApplications(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !position || !status || !appliedDate) return;

    const dateValidation = validateDateString(appliedDate);
    if (!dateValidation.isValid) {
      setDateError(dateValidation.error || 'Please enter a valid 4-digit year date.');
      return;
    }

    setError(null);
    setDateError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/career', {
        company,
        position,
        status,
        appliedDate: new Date(dateValidation.normalized || appliedDate).toISOString(),
        notes
      });

      if (res.data.isSuccess) {
        trackAction('job_application_created', { module: 'career', action: 'create' });
        setApplications((prev) => [res.data.data, ...prev]);
        setCompany('');
        setPosition('');
        setStatus('Applied');
        setAppliedDate('');
        setDateError(null);
        setNotes('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await apiClient.put(`/api/career/${id}/status`, { status: newStatus });
      if (res.data.isSuccess) {
        trackAction('job_application_updated', { module: 'career', action: 'update_status' });
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update job status.');
    }
  };

  const handleDeleteApplication = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/career/${id}`);
      if (res.data.isSuccess) {
        trackAction('job_application_deleted', { module: 'career', action: 'delete' });
        setApplications((prev) => prev.filter((app) => app.id !== id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete application.');
    }
  };

  const getStatusChip = (jobStatus: string) => {
    let color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' = 'primary';
    switch (jobStatus) {
      case 'Applied':
        color = 'info';
        break;
      case 'Interviewing':
        color = 'warning';
        break;
      case 'Offered':
        color = 'success';
        break;
      case 'Rejected':
        color = 'error';
        break;
    }
    return <Chip label={jobStatus} color={color} size="small" sx={{ fontWeight: 600, borderRadius: '8px' }} />;
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <WorkIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Career & Job Tracker
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReportExporter module="Career" />
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Track job applications, manage interviews, organize career search pipelines, and update status timelines.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'stretch' }}>
          {/* Add Job Application Form */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 5 }, display: 'flex', flexDirection: 'column' }}>
            <TiltCard sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--accent-primary)' }}>
                  Track Job Position
                </Typography>
                <form onSubmit={handleAddApplication}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Company Name"
                      placeholder="e.g. Google, Stripe"
                      required
                      fullWidth
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                    <TextField
                      label="Job Title / Position"
                      placeholder="e.g. Software Engineer, Product Manager"
                      required
                      fullWidth
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                    <FormControl fullWidth>
                      <InputLabel id="status-label">Pipeline Status</InputLabel>
                      <Select
                        labelId="status-label"
                        label="Pipeline Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <MenuItem value="Applied">Applied</MenuItem>
                        <MenuItem value="Interviewing">Interviewing</MenuItem>
                        <MenuItem value="Offered">Offered</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Date Applied"
                      type="date"
                      required
                      fullWidth
                      value={appliedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      error={Boolean(dateError)}
                      helperText={dateError}
                      slotProps={{
                        htmlInput: {
                          min: '1900-01-01',
                          max: '2099-12-31',
                          onPaste: handleDatePaste
                        },
                        inputLabel: { shrink: true }
                      }}
                    />
                    <TextField
                      label="Pipeline Notes / Reminders"
                      placeholder="Recruiter contact details, salary notes, interview dates..."
                      multiline
                      rows={3}
                      fullWidth
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <IconSlideButton
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={submitting}
                      startIcon={<AddIcon />}
                      sx={{
                        bgcolor: 'var(--accent-primary)',
                        py: 1.5,
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'var(--accent-secondary)' }
                      }}
                    >
                      {submitting ? 'Adding...' : 'Track Application'}
                    </IconSlideButton>
                  </Stack>
                </form>
              </CardContent>
            </TiltCard>
          </Box>

          {/* Job Applications List */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 7 }, display: 'flex', flexDirection: 'column' }}>
            <TiltCard sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  Job Applications Pipeline
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : applications.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D', minHeight: '350px' }}>
                    <WorkIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">No job applications logged yet. Begin your job search pipeline!</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '480px', pr: 1 }}>
                    {applications.map((app) => (
                      <Card
                        key={app.id}
                        sx={{
                          flexShrink: 0,
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          bgcolor: 'var(--card-bg)',
                          border: '1px solid rgba(0,0,0,0.04)'
                        }}
                      >
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: '14px !important' }}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {app.position}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)' }}>
                                {app.company}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              {getStatusChip(app.status)}
                              <IconButton onClick={() => handleDeleteApplication(app.id)} size="small" sx={{ color: '#E85A4F' }}>
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </Stack>

                          {app.notes && (
                            <Typography variant="body2" sx={{ color: '#8D8D8D', fontStyle: 'italic', pl: 1, borderLeft: '2px solid #E0E0E0' }}>
                              {app.notes}
                            </Typography>
                          )}

                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#8D8D8D' }}>
                              Applied: {new Date(app.appliedDate).toLocaleDateString()}
                            </Typography>

                            <FormControl size="small" sx={{ width: 150 }}>
                              <InputLabel id={`change-status-${app.id}`}>Move Stage</InputLabel>
                              <Select
                                labelId={`change-status-${app.id}`}
                                label="Move Stage"
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                sx={{ borderRadius: '8px', fontSize: '12px' }}
                              >
                                <MenuItem value="Applied">Applied</MenuItem>
                                <MenuItem value="Interviewing">Interviewing</MenuItem>
                                <MenuItem value="Offered">Offered</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                              </Select>
                            </FormControl>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
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

export default Career;

