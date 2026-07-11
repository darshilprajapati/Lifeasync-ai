import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, RadioGroup, FormControlLabel, Radio, Box, Typography, CircularProgress, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import apiClient from '../api/apiClient';

interface ReportExporterProps {
  module: 'Planner' | 'Finance' | 'Health' | 'Career' | 'Vault' | 'AiInsights' | 'All';
  buttonVariant?: 'contained' | 'outlined' | 'text';
  buttonColor?: 'primary' | 'secondary' | 'inherit' | 'success';
}

const ReportExporter: React.FC<ReportExporterProps> = ({
  module,
  buttonVariant = 'outlined',
  buttonColor = 'primary',
}) => {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  
  // Asynchronous Generation States
  const [status, setStatus] = useState<'idle' | 'requesting' | 'processing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setStatus('idle');
    setError(null);
  };

  const handleClose = () => {
    if (status === 'requesting' || status === 'processing') return; // prevent closing during generation
    setOpen(false);
  };

  const handleStartExport = async () => {
    setError(null);
    setStatus('requesting');

    try {
      // 1. Send asynchronous generation request to API
      const res = await apiClient.post('/api/reports/request', {
        module: module,
        frequency: frequency
      });

      if (res.data.isSuccess) {
        const requestId = res.data.data.id;
        pollReportStatus(requestId);
      } else {
        setError('Failed to queue report request.');
        setStatus('failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report request.');
      setStatus('failed');
    }
  };

  const pollReportStatus = async (requestId: string) => {
    setStatus('processing');
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/reports/status/${requestId}`);
        if (res.data.isSuccess) {
          const requestInfo = res.data.data;
          
          if (requestInfo.status === 'Completed') {
            clearInterval(interval);
            setStatus('completed');
            
            // Trigger download of the completed report text file
            const baseURL = apiClient.defaults.baseURL || window.location.origin;
            const downloadUrl = `${baseURL}/api/reports/download/${requestId}`;
            
            // Create hidden anchor to force download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${module}_Report_${frequency}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
              setOpen(false);
            }, 1000);
          } else if (requestInfo.status === 'Failed') {
            clearInterval(interval);
            setError('The background processor service failed to compile the report data.');
            setStatus('failed');
          }
        }
      } catch (err) {
        clearInterval(interval);
        setError('Connection lost while polling report generation status.');
        setStatus('failed');
      }
    }, 1000);
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        color={buttonColor}
        startIcon={<DownloadIcon />}
        onClick={handleOpen}
        sx={{
          borderRadius: '10px',
          fontWeight: 600,
          textTransform: 'none',
          px: 2,
          py: 0.8
        }}
      >
        Export Report
      </Button>

      <Dialog open={open} onClose={handleClose} slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {module === 'All' ? 'Export Common Master Report' : `Export ${module} Activity Report`}
        </DialogTitle>
        <DialogContent sx={{ minWidth: '340px' }}>
          {status === 'idle' && (
            <>
              <Typography variant="body2" sx={{ color: '#6D6D6D', mb: 3 }}>
                Select the time-frame for your generated report. The background worker service will aggregate your metrics and build a downloadable summary file.
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
                  <FormControlLabel value="Daily" control={<Radio color="primary" />} label="Daily (Last 24 Hours)" />
                  <FormControlLabel value="Weekly" control={<Radio color="primary" />} label="Weekly (Last 7 Days)" />
                  <FormControlLabel value="Monthly" control={<Radio color="primary" />} label="Monthly (Last 30 Days)" />
                  <FormControlLabel value="Yearly" control={<Radio color="primary" />} label="Yearly (Last 365 Days)" />
                </RadioGroup>
              </FormControl>
            </>
          )}

          {(status === 'requesting' || status === 'processing') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={44} sx={{ color: 'var(--accent-primary)' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#37474F', textAlign: 'center' }}>
                {status === 'requesting' ? 'Queuing request...' : 'Background worker is compiling report details...'}
              </Typography>
            </Box>
          )}

          {status === 'completed' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: '#4CAF50' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                Report compiled! Starting download...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {status === 'idle' || status === 'failed' ? (
            <>
              <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
              <Button onClick={handleStartExport} variant="contained" sx={{ bgcolor: 'var(--accent-primary)', fontWeight: 600, '&:hover': { bgcolor: 'var(--accent-secondary)' } }}>
                Generate Report
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportExporter;
