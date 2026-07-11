import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Alert, Stack, Avatar, Chip, Divider } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SecurityIcon from '@mui/icons-material/Security';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);
  const [stats, setStats] = useState<Dictionary<number>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  interface Dictionary<T> {
    [key: string]: T;
  }

  const fetchProfileStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/auth/profile/stats');
      if (res.data.isSuccess) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load user profile statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setProfilePhoto(user.profilePhoto || null);
      fetchProfileStats();
    }
  }, [user]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    const hasChanges = fullName.trim() !== user?.fullName || profilePhoto !== (user?.profilePhoto || null);
    if (!hasChanges) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await apiClient.put('/api/auth/profile', {
        fullName: fullName.trim(),
        profilePhoto: profilePhoto
      });

      if (res.data.isSuccess) {
        setSuccess('Profile updated successfully!');
        updateUser(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <PersonIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              My Account Profile
            </Typography>
          </Stack>
          <ThemeToggle />
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Manage your personal details, configure display avatars, and inspect workspace summary metrics.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <LogoLoader />
        ) : (
          <Grid container spacing={4}>
            {/* Left side: Photo & Profile Config */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                <CardContent>
                  <form onSubmit={handleSaveChanges}>
                    <Stack spacing={4} sx={{ alignItems: 'center' }}>
                      {/* Avatar Upload Container */}
                      <Box sx={{ position: 'relative' }}>
                        <Avatar
                          src={profilePhoto || undefined}
                          sx={{
                            width: 140,
                            height: 140,
                            bgcolor: 'var(--accent-secondary)',
                            fontSize: '48px',
                            fontWeight: 600,
                            border: '4px solid white',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                          }}
                        >
                          {!profilePhoto && (fullName.charAt(0).toUpperCase() || 'U')}
                        </Avatar>
                        
                        <Button
                          component="label"
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            minWidth: 40,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'var(--accent-primary)',
                            color: 'white',
                            boxShadow: 'var(--shadow-soft)',
                            '&:hover': { bgcolor: 'var(--accent-secondary)' }
                          }}
                        >
                          <PhotoCameraIcon sx={{ fontSize: 18 }} />
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handlePhotoUpload}
                          />
                        </Button>
                      </Box>

                      {/* Config Inputs */}
                      <Stack spacing={2.5} sx={{ width: '100%' }}>
                        <TextField
                          label="Full Name"
                          required
                          fullWidth
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                        <TextField
                          label="Email Address"
                          disabled
                          fullWidth
                          value={email}
                          slotProps={{ input: { readOnly: true } }}
                          helperText="Email address cannot be changed."
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={saving || (fullName.trim() === user?.fullName && profilePhoto === (user?.profilePhoto || null))}
                          startIcon={<SaveIcon />}
                          sx={{
                            bgcolor: 'var(--accent-primary)',
                            py: 1.5,
                            borderRadius: '12px',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'var(--accent-secondary)' }
                          }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Stack>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            {/* Right side: Security & Activity Stats */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={4}>
                {/* Account Details */}
                <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
                      <SecurityIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Account Security & Role
                      </Typography>
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: '#8D8D8D', display: 'block', mb: 0.5 }}>
                          Security Role
                        </Typography>
                        <Chip
                          label={user?.role || 'User'}
                          color={user?.role === 'Admin' ? 'primary' : 'default'}
                          sx={{ fontWeight: 700, borderRadius: '8px' }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: '#8D8D8D', display: 'block', mb: 0.5 }}>
                          Account Status
                        </Typography>
                        <Chip
                          label={user?.status || 'Active'}
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700, borderRadius: '8px' }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Workspace Stats summary */}
                <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
                      <QueryStatsIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Workspace Activity Statistics
                      </Typography>
                    </Stack>

                    <Stack spacing={2} divider={<Divider />}>
                      {Object.keys(stats).map((key) => (
                        <Stack
                          key={key}
                          direction="row"
                          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Typography variant="body1" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {key}
                          </Typography>
                          <Chip
                            label={stats[key]}
                            sx={{
                              bgcolor: 'rgba(232, 90, 79, 0.08)',
                              color: 'var(--accent-primary)',
                              fontWeight: 700,
                              borderRadius: '8px',
                              px: 1
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        )}
      </Box>
    </PageWrapper>
  );
};

export default Profile;

