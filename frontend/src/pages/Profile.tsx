import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Stack,
  Avatar,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PaletteIcon from '@mui/icons-material/Palette';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useThemeSystem, type DesignSystem, type ThemeMode } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { trackAction } from '../utils/analytics';
import { TiltCard } from '../components/modern3d/TiltCard';
import { getAllCountries, getStatesOfCountry, normalizeCity, type LocationCountry, type LocationState } from '../utils/locationData';

interface Dictionary<T> {
  [key: string]: T;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { designSystem, setDesignSystem, mode, setMode } = useThemeSystem();
  const { notify } = useNotification();

  // Account details state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Location state
  const [country, setCountry] = useState(user?.country || '');
  const [state, setState] = useState(user?.state || '');
  const [city, setCity] = useState(user?.city || '');
  const [savingLocation, setSavingLocation] = useState(false);

  const allCountries = useMemo(() => getAllCountries(), []);
  const availableStates = useMemo(() => getStatesOfCountry(country), [country]);

  // Appearance draft state (Draft-and-Apply flow: changes preview locally and apply globally on clicking Save)
  const [prefDesign, setPrefDesign] = useState<DesignSystem>(designSystem);
  const [prefMode, setPrefMode] = useState<ThemeMode>(mode);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  // Profile-scoped preview calculations
  const isProfPreview = prefDesign === 'professional';
  const isDarkPreview = prefMode === 'dark';

  // General & Stats state
  const [stats, setStats] = useState<Dictionary<number>>({});
  const [cumulativeScore, setCumulativeScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPrefDesign(designSystem);
    setPrefMode(mode);
  }, [designSystem, mode]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [statsRes, scoreRes] = await Promise.all([
        apiClient.get('/api/auth/profile/stats'),
        apiClient.get('/api/lifescore/cumulative').catch(() => null)
      ]);

      if (statsRes.data.isSuccess) {
        setStats(statsRes.data.data);
      }
      if (scoreRes && scoreRes.data?.isSuccess) {
        setCumulativeScore(scoreRes.data.data);
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || err.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setProfilePhoto(user.profilePhoto || null);
      setCountry(user.country || '');
      setState(user.state || '');
      setCity(user.city || '');
      fetchProfileData();
    }
  }, [user]);

  const handleSelectDesign = (ds: DesignSystem) => {
    // Local draft only — updates Profile preview without prematurely applying globally
    setPrefDesign(ds);
    setAppearanceSaved(false);
  };

  const handleSelectMode = (m: ThemeMode) => {
    // Local draft only — updates Profile preview without prematurely applying globally
    setPrefMode(m);
    setAppearanceSaved(false);
  };

  const handleSaveAppearance = () => {
    setDesignSystem(prefDesign);
    setMode(prefMode);
    localStorage.setItem('lifesync_design_system', prefDesign);
    localStorage.setItem('lifesync_theme', prefMode);
    setAppearanceSaved(true);
    notify.success('Appearance preferences saved and applied across the entire application!');
    trackAction('appearance_preferences_saved', { designSystem: prefDesign, mode: prefMode });
    setTimeout(() => setAppearanceSaved(false), 2500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify.warning('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify.warning('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);

    try {
      const res = await apiClient.put('/api/auth/profile', {
        fullName: fullName.trim(),
        profilePhoto: profilePhoto,
        country: country.trim() || null,
        state: state.trim() || null,
        city: city.trim() || null
      });

      if (res.data.isSuccess) {
        trackAction('profile_updated', { module: 'profile', action: 'update' });
        notify.success('Account profile updated successfully!');
        updateUser(res.data.data);
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country.trim()) {
      notify.warning('Please select your Country.');
      return;
    }
    if (!city.trim()) {
      notify.warning('Please enter your City name.');
      return;
    }

    setSavingLocation(true);

    try {
      const res = await apiClient.put('/api/auth/profile', {
        fullName: fullName.trim(),
        profilePhoto: profilePhoto,
        country: country.trim(),
        state: state.trim() || null,
        city: normalizeCity(city)
      });

      if (res.data.isSuccess) {
        trackAction('location_saved', { module: 'profile', country, state, city });
        notify.success('Location saved! Competition eligibility is now active.');
        updateUser(res.data.data);
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || err.message || 'Failed to save location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleClearLocation = async () => {
    setSavingLocation(true);

    try {
      const res = await apiClient.put('/api/auth/profile', {
        fullName: fullName.trim(),
        profilePhoto: profilePhoto,
        country: null,
        state: null,
        city: null
      });

      if (res.data.isSuccess) {
        setCountry('');
        setState('');
        setCity('');
        trackAction('location_cleared', { module: 'profile' });
        notify.success('Location cleared.');
        updateUser(res.data.data);
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || err.message || 'Failed to clear location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const isLocationComplete = Boolean(country.trim() && city.trim());

  return (
    <PageWrapper>
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          maxWidth: '1440px',
          mx: 'auto',
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Compact Page Header */}
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.25,
            flexWrap: 'wrap',
            gap: 1,
            flexShrink: 0
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <PersonIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '18px', lineHeight: 1.2 }}>
                My Account Profile
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Account settings, location eligibility, and theme controls.
              </Typography>
            </Box>
          </Stack>

          {/* Quick Cumulative Score Pill */}
          <Chip
            icon={<EmojiEventsIcon sx={{ fontSize: '15px !important', color: '#FFD700 !important' }} />}
            label={`Life Score: ${cumulativeScore.toFixed(1)} points`}
            sx={{
              fontWeight: 800,
              fontSize: '11px',
              height: 26,
              bgcolor: isDarkPreview ? 'rgba(255, 111, 38, 0.15)' : 'rgba(232, 90, 79, 0.1)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(255, 111, 38, 0.3)',
              borderRadius: isProfPreview ? '0px !important' : '8px'
            }}
          />
        </Stack>

        {loading ? (
          <LogoLoader />
        ) : (
          <Grid container spacing={1.5} sx={{ flex: 1, alignItems: 'stretch' }}>
            {/* Column 1: Profile Details & Workspace Activity Statistics */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5} sx={{ height: '100%', justifyContent: 'space-between' }}>
                {/* 1. Personal Information Card */}
                <TiltCard
                  overrideDesignSystem={prefDesign}
                  overrideMode={prefMode}
                  sx={{
                    borderRadius: isProfPreview ? '0px !important' : '14px',
                    p: '14px 16px'
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Personal Information
                    </Typography>
                    <Stack direction="row" spacing={0.75}>
                      <Chip
                        label={user?.role || 'User'}
                        size="small"
                        color={user?.role === 'Admin' ? 'primary' : 'default'}
                        sx={{ height: 20, fontSize: '10px', fontWeight: 700, borderRadius: isProfPreview ? '0px !important' : '6px' }}
                      />
                      <Chip
                        label={user?.status || 'Active'}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '10px', fontWeight: 700, borderRadius: isProfPreview ? '0px !important' : '6px' }}
                      />
                    </Stack>
                  </Stack>

                    <form onSubmit={handleSaveProfile}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                        {/* Compact Avatar */}
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar
                            src={profilePhoto || undefined}
                            sx={{
                              width: 54,
                              height: 54,
                              bgcolor: 'var(--accent-secondary)',
                              fontSize: '20px',
                              fontWeight: 700,
                              border: '2px solid white',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            {!profilePhoto && (fullName.charAt(0).toUpperCase() || 'U')}
                          </Avatar>
                          <Button
                            component="label"
                            size="small"
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              minWidth: 22,
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              bgcolor: 'var(--accent-primary)',
                              color: 'white',
                              p: 0,
                              '&:hover': { bgcolor: 'var(--accent-secondary)' }
                            }}
                          >
                            <PhotoCameraIcon sx={{ fontSize: 11 }} />
                            <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                          </Button>
                        </Box>

                        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                          <TextField
                            label="Full Name"
                            required
                            fullWidth
                            size="small"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            slotProps={{ input: { sx: { fontSize: '12.5px', height: 34 } } }}
                          />
                          <TextField
                            label="Email Address"
                            disabled
                            fullWidth
                            size="small"
                            value={email}
                            slotProps={{ input: { readOnly: true, sx: { fontSize: '12.5px', height: 34 } } }}
                          />
                        </Stack>
                      </Stack>

                      <Button
                        type="submit"
                        variant="contained"
                        size="small"
                        disabled={savingProfile || (fullName.trim() === user?.fullName && profilePhoto === (user?.profilePhoto || null))}
                        startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          bgcolor: 'var(--accent-primary)',
                          borderRadius: isProfPreview ? '0px !important' : '8px',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          py: 0.4,
                          px: 1.5,
                          textTransform: 'none',
                          float: 'right',
                          boxShadow: isProfPreview ? 'none' : '0 2px 8px rgba(255, 111, 38, 0.25)',
                          '&:hover': { bgcolor: 'var(--accent-secondary)' }
                        }}
                      >
                        {savingProfile ? 'Saving...' : 'Update Profile'}
                      </Button>
                      <Box sx={{ clear: 'both' }} />
                    </form>
                </TiltCard>

                {/* 2. Workspace Activity Statistics */}
                <TiltCard
                  overrideDesignSystem={prefDesign}
                  overrideMode={prefMode}
                  sx={{
                    p: '14px 16px',
                    borderRadius: isProfPreview ? '0px !important' : '14px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <QueryStatsIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Workspace Activity Statistics
                    </Typography>
                  </Stack>

                  <Grid container spacing={0.75}>
                    {Object.keys(stats).map((key) => (
                      <Grid key={key} size={{ xs: 6, sm: 4 }}>
                        <Box
                          sx={{
                            p: 0.75,
                            borderRadius: isProfPreview ? '0px !important' : '8px',
                            bgcolor: isDarkPreview ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: isProfPreview ? 'none' : 'blur(8px)',
                            border: isProfPreview
                              ? '1px solid var(--card-border)'
                              : isDarkPreview
                                ? '1px solid rgba(255, 255, 255, 0.08)'
                                : '1px solid rgba(255, 255, 255, 0.7)',
                            boxShadow: isProfPreview ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.03)',
                            textAlign: 'center'
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block', mb: 0.2 }}>
                            {key}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '13px' }}>
                            {stats[key]}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Box
                        sx={{
                          p: 0.75,
                          borderRadius: isProfPreview ? '0px !important' : '8px',
                          bgcolor: isDarkPreview ? 'rgba(255, 111, 38, 0.15)' : 'rgba(232, 90, 79, 0.1)',
                          backdropFilter: isProfPreview ? 'none' : 'blur(8px)',
                          border: isProfPreview ? '1px solid rgba(255, 111, 38, 0.3)' : '1px solid rgba(255, 111, 38, 0.4)',
                          boxShadow: isProfPreview ? 'none' : '0 2px 8px rgba(255, 111, 38, 0.15)',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'var(--accent-primary)', fontSize: '9.5px', fontWeight: 700, display: 'block', mb: 0.2 }}>
                          Life Score
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '13px' }}>
                          {cumulativeScore.toFixed(1)} pts
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </TiltCard>
              </Stack>
            </Grid>

            {/* Column 2: Location Settings & Appearance Preferences */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5} sx={{ height: '100%', justifyContent: 'space-between' }}>
                {/* 3. Location (Optional) Card */}
                <TiltCard
                  id="profile-location-section"
                  overrideDesignSystem={prefDesign}
                  overrideMode={prefMode}
                  sx={{
                    p: '14px 16px',
                    borderRadius: isProfPreview ? '0px !important' : '14px'
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <LocationOnIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                        Location (Optional)
                      </Typography>
                    </Stack>
                    <Chip
                      label={isLocationComplete ? 'LifeSync Arena Active' : 'Location Incomplete'}
                      size="small"
                      color={isLocationComplete ? 'success' : 'warning'}
                      sx={{ height: 20, fontSize: '10px', fontWeight: 800, borderRadius: isProfPreview ? '0px !important' : '6px' }}
                    />
                  </Stack>

                  {!isLocationComplete && (
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 1.25, fontSize: '11px', lineHeight: 1.4 }}>
                      Add your Country and City to participate in the local, state, and national LifeSync Arena leaderboards.
                    </Typography>
                  )}

                  <form onSubmit={handleSaveLocation}>
                    <Grid container spacing={1} sx={{ mb: 1.25 }}>
                      {/* Country Selection */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel sx={{ fontSize: '12px' }}>Country</InputLabel>
                          <Select
                            value={country}
                            label="Country"
                            onChange={(e) => {
                              setCountry(e.target.value);
                              setState(''); // Reset state on country change
                            }}
                            sx={{
                              fontSize: '12.5px',
                              height: 34,
                              borderRadius: isProfPreview ? '0px !important' : '8px',
                              bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)'),
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: '12.5px' }}>
                              <em>None / Clear</em>
                            </MenuItem>
                            {allCountries.map((c: LocationCountry) => (
                              <MenuItem key={c.isoCode} value={c.name} sx={{ fontSize: '12.5px' }}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* State/Region Selection */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        {availableStates.length > 0 ? (
                          <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '12px' }}>State / Region</InputLabel>
                            <Select
                              value={state}
                              label="State / Region"
                              onChange={(e) => setState(e.target.value)}
                              sx={{
                                fontSize: '12.5px',
                                height: 34,
                                borderRadius: isProfPreview ? '0px !important' : '8px',
                                bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)'),
                              }}
                            >
                              <MenuItem value="" sx={{ fontSize: '12.5px' }}>
                                <em>None / Clear</em>
                              </MenuItem>
                              {availableStates.map((s: LocationState) => (
                                <MenuItem key={s.isoCode || s.name} value={s.name} sx={{ fontSize: '12.5px' }}>
                                  {s.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            label="State / Region"
                            fullWidth
                            size="small"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder={country ? "Enter State / Region" : "Select country first"}
                            disabled={!country}
                            slotProps={{
                              input: {
                                sx: {
                                  fontSize: '12.5px',
                                  height: 34,
                                  borderRadius: isProfPreview ? '0px !important' : '8px',
                                  bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)'),
                                }
                              }
                            }}
                          />
                        )}
                      </Grid>

                      {/* City Input */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          label="City"
                          fullWidth
                          size="small"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Ahmedabad"
                          slotProps={{
                            input: {
                              sx: {
                                fontSize: '12.5px',
                                height: 34,
                                borderRadius: isProfPreview ? '0px !important' : '8px',
                                bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)'),
                              }
                            }
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                      {(user?.country || user?.city || user?.state) && (
                        <Button
                          id="btn-clear-location"
                          type="button"
                          variant="outlined"
                          size="small"
                          disabled={savingLocation}
                          onClick={handleClearLocation}
                          sx={{
                            borderColor: 'var(--card-border)',
                            color: 'var(--text-secondary)',
                            borderRadius: isProfPreview ? '0px !important' : '8px',
                            fontWeight: 600,
                            fontSize: '11px',
                            py: 0.4,
                            px: 1.25,
                            textTransform: 'none',
                            bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)'),
                            '&:hover': {
                              borderColor: 'var(--accent-primary)',
                              bgcolor: isProfPreview ? 'transparent' : (isDarkPreview ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)')
                            }
                          }}
                        >
                          Clear Location
                        </Button>
                      )}
                      <Button
                        id="btn-save-location"
                        type="submit"
                        variant="contained"
                        size="small"
                        disabled={savingLocation}
                        startIcon={<LocationOnIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                          bgcolor: 'var(--accent-primary)',
                          borderRadius: isProfPreview ? '0px !important' : '8px',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          py: 0.4,
                          px: 1.5,
                          textTransform: 'none',
                          boxShadow: isProfPreview ? 'none' : '0 2px 8px rgba(255, 111, 38, 0.25)',
                          '&:hover': { bgcolor: 'var(--accent-secondary)' }
                        }}
                      >
                        {savingLocation ? 'Saving...' : 'Save Location'}
                      </Button>
                    </Stack>
                  </form>
                </TiltCard>

                {/* 4. Appearance Settings Card */}
                <TiltCard
                  id="profile-appearance-card"
                  overrideDesignSystem={prefDesign}
                  overrideMode={prefMode}
                  sx={{
                    p: '14px 16px',
                    borderRadius: isProfPreview ? '0px !important' : '14px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1 }}>
                    <PaletteIcon sx={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                      Appearance & Design Preferences
                    </Typography>
                  </Stack>

                  {/* Design System Choices: Professional vs Modern 3D */}
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9.5px', display: 'block', mb: 0.5 }}>
                    Design System
                  </Typography>
                  <Grid container spacing={0.75} sx={{ mb: 1 }}>
                    {/* Professional */}
                    <Grid size={{ xs: 6 }}>
                      <Box
                        id="profile-pref-professional"
                        onClick={() => handleSelectDesign('professional')}
                        sx={{
                          p: 0.9,
                          borderRadius: '0px',
                          cursor: 'pointer',
                          border: prefDesign === 'professional' ? '2px solid var(--accent-primary)' : '1px solid var(--card-border)',
                          bgcolor: prefDesign === 'professional'
                            ? (isDarkPreview ? 'rgba(217, 83, 30, 0.16)' : 'rgba(217, 83, 30, 0.08)')
                            : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <CropSquareIcon sx={{ color: 'var(--accent-primary)', fontSize: 16 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                              Professional
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                              Clean & Sharp
                            </Typography>
                          </Box>
                        </Stack>
                        {prefDesign === 'professional' && <CheckCircleIcon sx={{ color: 'var(--accent-primary)', fontSize: 15 }} />}
                      </Box>
                    </Grid>

                    {/* Modern 3D */}
                    <Grid size={{ xs: 6 }}>
                      <Box
                        id="profile-pref-modern3d"
                        onClick={() => handleSelectDesign('modern3d')}
                        sx={{
                          p: 0.9,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: prefDesign === 'modern3d'
                            ? '2px solid var(--accent-primary)'
                            : isProfPreview ? '1px solid var(--card-border)' : '1px solid rgba(255, 111, 38, 0.25)',
                          bgcolor: prefDesign === 'modern3d'
                            ? (isDarkPreview ? 'rgba(255, 111, 38, 0.2)' : 'rgba(255, 111, 38, 0.12)')
                            : (isDarkPreview ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)'),
                          backdropFilter: isProfPreview ? 'none' : 'blur(8px)',
                          boxShadow: prefDesign === 'modern3d'
                            ? (isProfPreview ? 'none' : '0 4px 14px rgba(255, 111, 38, 0.25)')
                            : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <ViewInArIcon sx={{ color: 'var(--accent-primary)', fontSize: 16 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                              Modern 3D
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                              Dimensional & Glow
                            </Typography>
                          </Box>
                        </Stack>
                        {prefDesign === 'modern3d' && <CheckCircleIcon sx={{ color: 'var(--accent-primary)', fontSize: 15 }} />}
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Mode Selector: Light vs Dark */}
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9.5px', display: 'block', mb: 0.5 }}>
                    Theme Mode
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
                    <Button
                      id="profile-mode-light"
                      variant={prefMode === 'light' ? 'contained' : 'outlined'}
                      startIcon={<LightModeIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={() => handleSelectMode('light')}
                      size="small"
                      sx={{
                        flex: 1,
                        py: 0.4,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: isProfPreview ? '0px !important' : '8px',
                        bgcolor: prefMode === 'light' ? 'var(--accent-primary)' : 'transparent',
                        color: prefMode === 'light' ? '#FFFFFF' : 'var(--text-primary)',
                        borderColor: prefMode === 'light' ? 'transparent' : 'var(--card-border)',
                        boxShadow: prefMode === 'light' && !isProfPreview ? '0 2px 8px rgba(255, 111, 38, 0.25)' : 'none',
                        textTransform: 'none'
                      }}
                    >
                      Light Mode
                    </Button>
                    <Button
                      id="profile-mode-dark"
                      variant={prefMode === 'dark' ? 'contained' : 'outlined'}
                      startIcon={<DarkModeIcon sx={{ fontSize: '14px !important' }} />}
                      onClick={() => handleSelectMode('dark')}
                      size="small"
                      sx={{
                        flex: 1,
                        py: 0.4,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: isProfPreview ? '0px !important' : '8px',
                        bgcolor: prefMode === 'dark' ? 'var(--accent-primary)' : 'transparent',
                        color: prefMode === 'dark' ? '#FFFFFF' : 'var(--text-primary)',
                        borderColor: prefMode === 'dark' ? 'transparent' : 'var(--card-border)',
                        boxShadow: prefMode === 'dark' && !isProfPreview ? '0 2px 8px rgba(255, 111, 38, 0.25)' : 'none',
                        textTransform: 'none'
                      }}
                    >
                      Dark Mode
                    </Button>
                  </Stack>

                  {/* Save Preferences Button */}
                  <Button
                    id="btn-save-appearance"
                    variant="contained"
                    fullWidth
                    size="small"
                    startIcon={appearanceSaved ? <CheckCircleIcon sx={{ fontSize: '15px !important' }} /> : <SaveIcon sx={{ fontSize: '15px !important' }} />}
                    onClick={handleSaveAppearance}
                    sx={{
                      bgcolor: 'var(--accent-primary)',
                      borderRadius: isProfPreview ? '0px !important' : '8px',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      py: 0.5,
                      textTransform: 'none',
                      boxShadow: isProfPreview ? 'none' : '0 4px 14px rgba(255, 111, 38, 0.35)',
                      '&:hover': { bgcolor: 'var(--accent-secondary)' }
                    }}
                  >
                    {appearanceSaved ? 'Preferences Applied!' : 'Save Appearance Preferences'}
                  </Button>
                </TiltCard>
              </Stack>
            </Grid>
          </Grid>
        )}
      </Box>
    </PageWrapper>
  );
};

export default Profile;

