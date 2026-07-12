import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Checkbox, IconButton, Grid, Alert, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

interface PlannerEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
}

const Planner: React.FC = () => {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/planner', {
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        isCompleted: false,
      });

      if (res.data.isSuccess) {
        setEvents((prev) => [...prev, res.data.data].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
        setTitle('');
        setDescription('');
        setStartTime('');
        setEndTime('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEvent = async (id: number, currentCompleted: boolean) => {
    try {
      const res = await apiClient.put(`/api/planner/${id}/toggle`, !currentCompleted);
      if (res.data.isSuccess) {
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, isCompleted: !currentCompleted } : e))
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
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

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
            <ThemeToggle />
            <ReportExporter module="Planner" />
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Organize your calendar, tasks, and daily routine. Changes sync in real-time.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
          {/* Add Event Form */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex' }}>
            <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--accent-primary)' }}>
                  Add Task / Event
                </Typography>
                <form onSubmit={handleAddEvent}>
                  <Stack spacing={3}>
                    <TextField
                      label="Event Title"
                      required
                      fullWidth
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <TextField
                      label="Description"
                      multiline
                      rows={3}
                      fullWidth
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <TextField
                      label="Start Time"
                      type="datetime-local"
                      required
                      fullWidth
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="End Time"
                      type="datetime-local"
                      required
                      fullWidth
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
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
                        '&:hover': { bgcolor: 'var(--accent-secondary)' },
                      }}
                    >
                      {submitting ? 'Creating...' : 'Create Event'}
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>

          {/* Events List */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex' }}>
            <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', p: 2 }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  Your Schedule
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : events.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D', minHeight: '350px' }}>
                    <CalendarTodayIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">No events scheduled. Plan your first task!</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '420px', pr: 1 }}>
                    {events.map((e) => (
                      <Card
                        key={e.id}
                        sx={{
                          flexShrink: 0,
                          borderRadius: '12px',
                          borderLeft: e.isCompleted ? '4px solid #4CAF50' : '4px solid var(--accent-primary)',
                          transition: '0.2s',
                          bgcolor: e.isCompleted ? 'rgba(76, 175, 80, 0.02)' : 'white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '12px !important' }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <Checkbox
                              checked={e.isCompleted}
                              onChange={() => handleToggleEvent(e.id, e.isCompleted)}
                              icon={<RadioButtonUncheckedIcon />}
                              checkedIcon={<CheckCircleIcon sx={{ color: '#4CAF50' }} />}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  color: e.isCompleted ? '#8D8D8D' : '#2D2D2D',
                                  textDecoration: e.isCompleted ? 'line-through' : 'none',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {e.title}
                              </Typography>
                              {e.description && (
                                <Typography variant="caption" sx={{ color: '#8D8D8D', display: 'block', mb: 0.5 }}>
                                  {e.description}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                                {formatDate(e.startTime)} - {formatDate(e.endTime)}
                              </Typography>
                            </Box>
                          </Stack>
                          <IconButton onClick={() => handleDeleteEvent(e.id)} size="small" sx={{ color: '#E85A4F' }}>
                            <DeleteIcon />
                          </IconButton>
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

export default Planner;

