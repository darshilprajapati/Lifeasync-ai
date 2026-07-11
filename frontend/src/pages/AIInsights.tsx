import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, Alert, Stack, Paper } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoIcon from '@mui/icons-material/Info';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

interface AiRecommendation {
  id: number;
  insightText: string;
  category: string;
  createdAt: string;
}

const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/insights');
      if (res.data.isSuccess) {
        setInsights(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load AI insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleGenerateInsights = async () => {
    setError(null);
    setGenerating(true);
    try {
      const res = await apiClient.post('/api/insights/generate');
      if (res.data.isSuccess) {
        setInsights(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate AI insights.');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'finance':
        return {
          border: '4px solid #4CAF50',
          bg: 'rgba(76, 175, 80, 0.02)',
          tagBg: '#E8F5E9',
          tagColor: '#2E7D32'
        };
      case 'health':
        return {
          border: '4px solid #2196F3',
          bg: 'rgba(33, 150, 243, 0.02)',
          tagBg: '#E3F2FD',
          tagColor: '#1565C0'
        };
      case 'productivity':
        return {
          border: '4px solid #9C27B0',
          bg: 'rgba(156, 39, 176, 0.02)',
          tagBg: '#F3E5F5',
          tagColor: '#7B1FA2'
        };
      case 'career':
        return {
          border: '4px solid #FF9800',
          bg: 'rgba(255, 152, 0, 0.02)',
          tagBg: '#FFF3E0',
          tagColor: '#E65100'
        };
      default:
        return {
          border: '4px solid var(--accent-primary)',
          bg: 'rgba(232, 90, 79, 0.02)',
          tagBg: 'rgba(232, 90, 79, 0.08)',
          tagColor: 'var(--accent-secondary)'
        };
    }
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <PsychologyIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Personal AI Insights
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ThemeToggle />
            <ReportExporter module="AiInsights" />
            <Button
              variant="contained"
              disabled={generating || loading}
              onClick={handleGenerateInsights}
              startIcon={<AutorenewIcon className={generating ? 'spin-animation' : ''} />}
              sx={{
                bgcolor: 'var(--accent-primary)',
                borderRadius: '12px',
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                py: 1.2,
                boxShadow: 'var(--shadow-soft)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' }
              }}
            >
              {generating ? 'Analyzing habits...' : 'Regenerate Insights'}
            </Button>
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Analyze your calendar tasks, workout routines, water intakes, and expense balances to generate personalized, data-backed insights.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <LogoLoader />
        ) : insights.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: '16px', textAlign: 'center', border: '1px dashed #E0E0E0', boxShadow: 'none', bgcolor: 'transparent' }}>
            <PsychologyIcon sx={{ fontSize: 64, color: '#8D8D8D', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'var(--text-secondary)', mb: 1 }}>No Insights Available</Typography>
            <Typography variant="body2" sx={{ color: '#8D8D8D', mb: 3 }}>Record records inside your modules, then run the assessment tool to calculate recommendations.</Typography>
            <Button variant="outlined" onClick={handleGenerateInsights} sx={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', borderRadius: '10px' }}>
              Run Analysis Now
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {insights.map((insight) => {
              const theme = getCategoryTheme(insight.category);
              return (
                <Grid size={{ xs: 12, md: 6 }} key={insight.id}>
                  <Card
                    sx={{
                      borderRadius: '16px',
                      boxShadow: 'var(--shadow-soft)',
                      borderLeft: theme.border,
                      bgcolor: theme.bg,
                      height: '100%',
                      transition: '0.2s',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}
                  >
                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ bgcolor: theme.tagBg, color: theme.tagColor, px: 1.5, py: 0.4, borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                            {insight.category.toUpperCase()}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#8D8D8D' }}>
                            {new Date(insight.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
                          {insight.insightText}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: 'center', color: '#8D8D8D' }}>
                        <InfoIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption">Generated dynamically from your tracking logs</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Embedded Spin CSS Keyframe */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </PageWrapper>
  );
};

export default AIInsights;

