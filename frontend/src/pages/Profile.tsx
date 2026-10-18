import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Grid, Alert, Stack, Avatar, Chip, Divider } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useThemeSystem, type DesignSystem, type ThemeMode } from '../context/ThemeContext';
import { trackAction } from '../utils/analytics';

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

  const { designSystem, setDesignSystem, mode, setMode } = useThemeSystem();
  const [prefDesign, setPrefDesign] = useState<DesignSystem>(designSystem);
  const [prefMode, setPrefMode] = useState<ThemeMode>(mode);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  useEffect(() => {
    setPrefDesign(designSystem);
    setPrefMode(mode);
  }, [designSystem, mode]);

  const handleSelectDesign = (ds: DesignSystem) => {
    setPrefDesign(ds);
    setDesignSystem(ds);
    setAppearanceSaved(false);
  };

  const handleSelectMode = (m: ThemeMode) => {
    setPrefMode(m);
    setMode(m);
    setAppearanceSaved(false);
  };

  const handleSaveAppearance = () => {
    setDesignSystem(prefDesign);
    setMode(prefMode);
    localStorage.setItem('lifesync_design_system', prefDesign);
    localStorage.setItem('lifesync_theme', prefMode);
    setAppearanceSaved(true);
    setSuccess('Appearance and design preferences saved successfully!');
    trackAction('appearance_preferences_saved', { designSystem: prefDesign, mode: prefMode });
    setTimeout(() => setAppearanceSaved(false), 3500);
  };

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
        trackAction('profile_updated', { module: 'profile', action: 'update' });
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

                {/* Appearance & Design System Preferences */}
                <Card sx={{ borderRadius: prefDesign === 'professional' ? '0px !important' : '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <PaletteIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Appearance & Design Preferences
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
                      Select your preferred workspace aesthetic and color scheme. Both designs provide complete access to all modules and tools.
                    </Typography>

                    {/* Dual Design Choice */}
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.5 }}>
                      Select Design System
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      {/* Option A - Professional */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          id="profile-pref-professional"
                          onClick={() => handleSelectDesign('professional')}
                          sx={{
                            p: 2,
                            border: prefDesign === 'professional' ? '2px solid var(--accent-primary)' : '1px solid var(--card-border)',
                            bgcolor: prefDesign === 'professional' ? 'rgba(232, 90, 79, 0.08)' : 'var(--card-bg)',
                            borderRadius: '0px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            '&:hover': {
                              borderColor: 'var(--accent-primary)',
                            }
                          }}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                              <CropSquareIcon sx={{ color: 'var(--accent-primary)', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                Option A — Professional
                              </Typography>
                              {prefDesign === 'professional' && <CheckCircleIcon sx={{ color: 'var(--accent-primary)', fontSize: 18, ml: 'auto' }} />}
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
                              Clean, simple, rectangular, and productivity-focused. Sharp 0px corners, flat surfaces, thin borders, and minimal animation.
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid var(--card-border)' }}>
                            <Chip label="Sharp 0px • Flat • High Focus" size="small" sx={{ borderRadius: '0px', fontSize: '11px', fontWeight: 600 }} />
                          </Box>
                        </Box>
                      </Grid>

                      {/* Option B - Modern 3D */}
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          id="profile-pref-modern3d"
                          onClick={() => handleSelectDesign('modern3d')}
                          sx={{
                            p: 2,
                            border: prefDesign === 'modern3d' ? '2px solid var(--accent-primary)' : '1px solid var(--card-border)',
                            bgcolor: prefDesign === 'modern3d' ? 'rgba(232, 90, 79, 0.08)' : 'var(--card-bg)',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            boxShadow: prefDesign === 'modern3d' ? '0 8px 24px rgba(232, 90, 79, 0.2)' : 'none',
                            transition: 'all 0.2s ease',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            '&:hover': {
                              borderColor: 'var(--accent-primary)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                              <ViewInArIcon sx={{ color: 'var(--accent-primary)', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                Option B — Modern 3D
                              </Typography>
                              {prefDesign === 'modern3d' && <CheckCircleIcon sx={{ color: 'var(--accent-primary)', fontSize: 18, ml: 'auto' }} />}
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
                              Interactive, dimensional, animated, and visually expressive. 3D push buttons, layered surfaces, subtle glass depth, and glowing accents.
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid var(--card-border)' }}>
                            <Chip label="Dimensional • 3D Buttons • Glowing Accents" size="small" sx={{ borderRadius: '10px', fontSize: '11px', fontWeight: 600 }} />
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Color Theme Mode Toggle */}
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1.5 }}>
                      Color Theme Mode
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                      <Button
                        id="profile-mode-light"
                        variant={prefMode === 'light' ? 'contained' : 'outlined'}
                        startIcon={<LightModeIcon />}
                        onClick={() => handleSelectMode('light')}
                        sx={{
                          flex: 1,
                          py: 1,
                          borderRadius: prefDesign === 'professional' ? '0px !important' : '12px',
                          bgcolor: prefMode === 'light' ? 'var(--accent-primary)' : 'transparent',
                          color: prefMode === 'light' ? '#FFFFFF' : 'var(--text-primary)',
                          borderColor: 'var(--accent-primary)',
                          '&:hover': {
                            bgcolor: prefMode === 'light' ? 'var(--accent-secondary)' : 'rgba(232, 90, 79, 0.08)',
                          }
                        }}
                      >
                        Light Mode
                      </Button>
                      <Button
                        id="profile-mode-dark"
                        variant={prefMode === 'dark' ? 'contained' : 'outlined'}
                        startIcon={<DarkModeIcon />}
                        onClick={() => handleSelectMode('dark')}
                        sx={{
                          flex: 1,
                          py: 1,
                          borderRadius: prefDesign === 'professional' ? '0px !important' : '12px',
                          bgcolor: prefMode === 'dark' ? 'var(--accent-primary)' : 'transparent',
                          color: prefMode === 'dark' ? '#FFFFFF' : 'var(--text-primary)',
                          borderColor: 'var(--accent-primary)',
                          '&:hover': {
                            bgcolor: prefMode === 'dark' ? 'var(--accent-secondary)' : 'rgba(232, 90, 79, 0.08)',
                          }
                        }}
                      >
                        Dark Mode
                      </Button>
                    </Stack>

                    {/* Interactive Sample Component Preview */}
                    <Box sx={{ p: 2, mb: 3, border: '1px dashed var(--card-border)', borderRadius: prefDesign === 'professional' ? '0px' : '12px', bgcolor: 'var(--bg-secondary)' }}>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, display: 'block', mb: 1 }}>
                        Live Interactive Preview ({prefDesign === 'professional' ? 'Professional' : 'Modern 3D'} + {prefMode === 'light' ? 'Light' : 'Dark'})
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                        <Button variant="contained" size="small" sx={{ bgcolor: 'var(--accent-primary)' }}>
                          Sample Button
                        </Button>
                        <Button variant="outlined" size="small">
                          Outline Action
                        </Button>
                        <Chip label="Active Filter" color="primary" size="small" />
                        <TextField size="small" placeholder="Interactive input…" slotProps={{ input: { sx: { height: 32 } } }} sx={{ width: 160 }} />
                      </Stack>
                    </Box>

                    {/* Save Appearance Preferences Button */}
                    <Button
                      id="btn-save-appearance"
                      variant="contained"
                      startIcon={appearanceSaved ? <CheckCircleIcon /> : <SaveIcon />}
                      onClick={handleSaveAppearance}
                      sx={{
                        bgcolor: 'var(--accent-primary)',
                        py: 1.2,
                        borderRadius: prefDesign === 'professional' ? '0px !important' : '12px',
                        fontWeight: 600,
                        width: '100%',
                        '&:hover': { bgcolor: 'var(--accent-secondary)' }
                      }}
                    >
                      {appearanceSaved ? 'Preferences Saved!' : 'Save Appearance Preferences'}
                    </Button>
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

