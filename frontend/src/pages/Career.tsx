import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Select, MenuItem, InputLabel, FormControl, IconButton, Grid, Alert, Stack, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/career', {
        company,
        position,
        status,
        appliedDate: new Date(appliedDate).toISOString(),
        notes
      });

      if (res.data.isSuccess) {
        setApplications((prev) => [res.data.data, ...prev]);
        setCompany('');
        setPosition('');
        setStatus('Applied');
        setAppliedDate('');
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
            <ThemeToggle />
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

        <Grid container spacing={4}>
          {/* Add Job Application Form */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
              <CardContent>
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
                      onChange={(e) => setAppliedDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
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
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={submitting}
                      startIcon={<AddIcon />}
                      sx={{
                        bgcolor: 'var(--accent-primary)',
                        py: 1.5,
                        borderRadius: '12px',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'var(--accent-secondary)' }
                      }}
                    >
                      {submitting ? 'Adding...' : 'Track Application'}
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Job Applications List */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  Job Applications Pipeline
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : applications.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D' }}>
                    <WorkIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">No job applications logged yet. Begin your job search pipeline!</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '500px', pr: 1 }}>
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
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageWrapper>
  );
};

export default Career;

