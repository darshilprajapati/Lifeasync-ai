import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, Button, CircularProgress, Chip, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlaceIcon from '@mui/icons-material/Place';
import PublicIcon from '@mui/icons-material/Public';
import MapIcon from '@mui/icons-material/Map';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useThemeSystem } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { TiltCard } from './modern3d/TiltCard';

export type CompetitionScope = 'city' | 'state' | 'country';

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalLifeScore: number;
  isCurrentUser: boolean;
  city?: string;
  state?: string;
  country?: string;
}

export interface LeaderboardResponse {
  scope: CompetitionScope;
  scopeValue: string;
  hasLocation: boolean;
  currentUserRank: number;
  currentUserTotalScore: number;
  topRankings: LeaderboardEntry[];
  totalParticipants: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const LifeScoreCompetitionCard: React.FC = () => {
  const navigate = useNavigate();
  const { mode, designSystem } = useThemeSystem();
  const { notify } = useNotification();
  const isDark = mode === 'dark';
  const isProf = designSystem === 'professional';

  const [scope, setScope] = useState<CompetitionScope>('city');
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (selectedScope: CompetitionScope, currentPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<{ isSuccess: boolean; data: LeaderboardResponse; message?: string }>(
        `/api/lifescore/leaderboard?scope=${selectedScope}&page=${currentPage}&pageSize=20`
      );
      if (res.data.isSuccess) {
        setData(res.data.data);
      } else {
        const msg = res.data.message || 'Failed to load leaderboard data.';
        setError(msg);
        notify.error(msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Network error while loading leaderboard.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchLeaderboard(scope, page);
  }, [scope, page, fetchLeaderboard]);

  useEffect(() => {
    const handleScoreUpdated = () => {
      fetchLeaderboard(scope, page);
    };
    window.addEventListener('lifesync:score-updated', handleScoreUpdated);
    return () => {
      window.removeEventListener('lifesync:score-updated', handleScoreUpdated);
    };
  }, [scope, page, fetchLeaderboard]);

  const handleScopeChange = (newScope: CompetitionScope) => {
    if (newScope !== scope) {
      setScope(newScope);
      setPage(1); // Reset to page 1 on scope change
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#1a1a1a',
        border: '1px solid #FFE082',
        label: '1'
      };
    }
    if (rank === 2) {
      return {
        bg: 'linear-gradient(135deg, #E0E0E0 0%, #B0BEC5 100%)',
        color: '#1a1a1a',
        border: '1px solid #ECEFF1',
        label: '2'
      };
    }
    if (rank === 3) {
      return {
        bg: 'linear-gradient(135deg, #CD7F32 0%, #8D6E63 100%)',
        color: '#ffffff',
        border: '1px solid #D7CCC8',
        label: '3'
      };
    }
    return {
      bg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--card-border)',
      label: `${rank}`
    };
  };

  return (
    <TiltCard
      sx={{
        height: '100%',
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: isProf ? '0px !important' : '18px',
        bgcolor: 'var(--card-bg)',
        border: '1px solid var(--card-border)'
      }}
    >
      {/* Header section with Title & Scope Switcher */}
      <Box sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          {/* Card Title & Icon */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: isProf ? '0px !important' : '10px',
                bgcolor: isDark ? 'rgba(255, 111, 38, 0.15)' : 'rgba(232, 90, 79, 0.1)',
                border: '1px solid rgba(255, 111, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                flexShrink: 0
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.2 }}>
                LifeSync Arena
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Your progress. Your community. Your place on the leaderboard.
              </Typography>
            </Box>
          </Stack>

          {/* Scope Segmented Control */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              p: 0.5,
              borderRadius: isProf ? '0px !important' : '10px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--card-border)'
            }}
          >
            <Button
              id="competition-scope-city"
              size="small"
              onClick={() => handleScopeChange('city')}
              startIcon={<PlaceIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                py: 0.4,
                px: 1.2,
                fontSize: '11px',
                fontWeight: scope === 'city' ? 800 : 600,
                borderRadius: isProf ? '0px !important' : '8px',
                bgcolor: scope === 'city' ? 'var(--accent-primary)' : 'transparent',
                color: scope === 'city' ? '#FFFFFF' : 'var(--text-secondary)',
                textTransform: 'none',
                minWidth: 'auto',
                boxShadow: scope === 'city' && !isProf ? '0 2px 8px rgba(255, 111, 38, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: scope === 'city' ? 'var(--accent-secondary)' : 'rgba(255, 111, 38, 0.08)'
                }
              }}
            >
              City
            </Button>
            <Button
              id="competition-scope-state"
              size="small"
              onClick={() => handleScopeChange('state')}
              startIcon={<MapIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                py: 0.4,
                px: 1.2,
                fontSize: '11px',
                fontWeight: scope === 'state' ? 800 : 600,
                borderRadius: isProf ? '0px !important' : '8px',
                bgcolor: scope === 'state' ? 'var(--accent-primary)' : 'transparent',
                color: scope === 'state' ? '#FFFFFF' : 'var(--text-secondary)',
                textTransform: 'none',
                minWidth: 'auto',
                boxShadow: scope === 'state' && !isProf ? '0 2px 8px rgba(255, 111, 38, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: scope === 'state' ? 'var(--accent-secondary)' : 'rgba(255, 111, 38, 0.08)'
                }
              }}
            >
              State
            </Button>
            <Button
              id="competition-scope-country"
              size="small"
              onClick={() => handleScopeChange('country')}
              startIcon={<PublicIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                py: 0.4,
                px: 1.2,
                fontSize: '11px',
                fontWeight: scope === 'country' ? 800 : 600,
                borderRadius: isProf ? '0px !important' : '8px',
                bgcolor: scope === 'country' ? 'var(--accent-primary)' : 'transparent',
                color: scope === 'country' ? '#FFFFFF' : 'var(--text-secondary)',
                textTransform: 'none',
                minWidth: 'auto',
                boxShadow: scope === 'country' && !isProf ? '0 2px 8px rgba(255, 111, 38, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: scope === 'country' ? 'var(--accent-secondary)' : 'rgba(255, 111, 38, 0.08)'
                }
              }}
            >
              Country
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={32} sx={{ color: 'var(--accent-primary)', mb: 1.5 }} />
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Loading {scope} rankings...
            </Typography>
          </Box>
        ) : error && !data ? (
          <Box sx={{ textAlign: 'center', py: 3, px: 2 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 1.5 }}>
              Leaderboard temporarily unavailable.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => fetchLeaderboard(scope, page)}
              sx={{ borderRadius: isProf ? '0px !important' : '8px', textTransform: 'none' }}
            >
              Retry
            </Button>
          </Box>
        ) : data && !data.hasLocation ? (
          /* User has not completed location */
          <Box
            sx={{
              p: 2.5,
              textAlign: 'center',
              borderRadius: isProf ? '0px !important' : '14px',
              bgcolor: isDark ? 'rgba(255, 111, 38, 0.06)' : 'rgba(232, 90, 79, 0.04)',
              border: '1px dashed rgba(255, 111, 38, 0.3)',
              my: 1
            }}
          >
            <LocationOnIcon sx={{ color: 'var(--accent-primary)', fontSize: 32, mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
              {scope === 'city'
                ? 'City, State, and Country required for City Arena'
                : scope === 'state'
                ? 'State and Country required for State Arena'
                : 'Country required for Country Arena'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2 }}>
              {scope === 'city'
                ? 'Please complete your City, State, and Country in Profile to compete with users in your city.'
                : scope === 'state'
                ? 'Please complete your State and Country in Profile to compete with users in your state.'
                : 'Please complete your Country in Profile to compete with users in your country.'}
            </Typography>
            <Button
              id="btn-goto-profile-location"
              variant="contained"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/profile')}
              sx={{
                bgcolor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: isProf ? '0px !important' : '10px',
                px: 2.5,
                boxShadow: isProf ? 'none' : '0 2px 10px rgba(255, 111, 38, 0.3)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' }
              }}
            >
              Complete Location in Profile
            </Button>
          </Box>
        ) : data && data.topRankings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No eligible users in the selected scope.
            </Typography>
          </Box>
        ) : data ? (
          /* Top Rankings List */
          <Stack spacing={1} sx={{ width: '100%', mb: 1.5 }}>
            {data.topRankings.map((entry) => {
              const badge = getRankBadge(entry.rank);
              return (
                <Box
                  key={`${entry.rank}-${entry.displayName}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: '10px 14px',
                    borderRadius: isProf ? '0px !important' : '12px',
                    bgcolor: entry.isCurrentUser
                      ? (isDark ? 'rgba(255, 111, 38, 0.16)' : 'rgba(232, 90, 79, 0.1)')
                      : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                    backdropFilter: isProf ? 'none' : 'blur(8px)',
                    border: entry.isCurrentUser
                      ? '1px solid rgba(255, 111, 38, 0.45)'
                      : (isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)'),
                    boxShadow: !isProf && entry.isCurrentUser
                      ? '0 4px 14px rgba(255, 111, 38, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                      : 'none',
                    transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                    {/* Rank Number / Badge */}
                    <Avatar
                      sx={{
                        width: 26,
                        height: 26,
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border,
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {badge.label}
                    </Avatar>

                    {/* User Display Name */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: entry.isCurrentUser ? 800 : 600,
                            color: entry.isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '13px'
                          }}
                        >
                          {entry.displayName}
                        </Typography>
                        {entry.isCurrentUser && (
                          <Chip
                            label="You"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '10px',
                              fontWeight: 800,
                              bgcolor: 'var(--accent-primary)',
                              color: '#FFFFFF',
                              borderRadius: isProf ? '0px !important' : '6px'
                            }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </Stack>

                  {/* Cumulative Points */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      color: entry.isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '13px',
                      flexShrink: 0,
                      ml: 1.5
                    }}
                  >
                    {entry.totalLifeScore.toFixed(1)} <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>points</span>
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        ) : null}

        {/* Pagination Bar */}
        {data && data.hasLocation && data.totalPages > 1 && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              pt: 1,
              pb: 1.5
            }}
          >
            <Button
              id="btn-leaderboard-prev"
              size="small"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{
                fontSize: '11px',
                py: 0.25,
                px: 1.25,
                borderRadius: isProf ? '0px !important' : '8px',
                textTransform: 'none',
                minWidth: '60px'
              }}
            >
              Previous
            </Button>

            <Typography variant="caption" sx={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Page {data.page} of {data.totalPages}
            </Typography>

            <Button
              id="btn-leaderboard-next"
              size="small"
              variant="outlined"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              sx={{
                fontSize: '11px',
                py: 0.25,
                px: 1.25,
                borderRadius: isProf ? '0px !important' : '8px',
                textTransform: 'none',
                minWidth: '60px'
              }}
            >
              Next
            </Button>
          </Stack>
        )}
      </Box>

      {/* Bottom Summary Bar (Permanent user rank regardless of page) */}
      {data && data.hasLocation && (
        <Box
          sx={{
            pt: 1.5,
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '13px' }}>
              Your Rank: #{data.currentUserRank > 0 ? data.currentUserRank : '-'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
              Your Total Life Score: {data.currentUserTotalScore.toFixed(1)} points
            </Typography>
          </Stack>

          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize' }}>
            {scope} Scope: <strong>{data.scopeValue || 'Active Region'}</strong> ({data.totalParticipants} {data.totalParticipants === 1 ? 'user' : 'users'})
          </Typography>
        </Box>
      )}
    </TiltCard>
  );
};

export default LifeScoreCompetitionCard;
