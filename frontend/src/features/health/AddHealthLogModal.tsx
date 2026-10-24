import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '../../api/apiClient';
import { useNotification } from '../../context/NotificationContext';
import { useThemeSystem } from '../../context/ThemeContext';
import { trackAction } from '../../utils/analytics';

interface AddHealthLogModalProps {
  open: boolean;
  onClose: () => void;
  onLogAdded: () => void;
  currentTotals: {
    water: number;
    sleep: number;
    steps: number;
    calories: number;
    workout: number;
  };
}

export const AddHealthLogModal: React.FC<AddHealthLogModalProps> = ({
  open,
  onClose,
  onLogAdded,
  currentTotals
}) => {
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [logType, setLogType] = useState<'Water' | 'Sleep' | 'Steps' | 'Calories' | 'Workout'>('Water');
  const [logValue, setLogValue] = useState('');
  const [logDetails, setLogDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUnit = (type: string) => {
    switch (type) {
      case 'Water': return 'ml';
      case 'Sleep': return 'hours';
      case 'Steps': return 'steps';
      case 'Calories': return 'kcal';
      case 'Workout': return 'mins';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(logValue);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive number.');
      return;
    }

    // Daily ceiling validations
    if (logType === 'Water' && currentTotals.water + val > 10000) {
      setError(`Daily water limit exceeded (maximum 10,000 ml per day, currently at ${currentTotals.water} ml).`);
      return;
    }
    if (logType === 'Sleep' && currentTotals.sleep + val > 24) {
      setError(`Daily sleep limit exceeded (maximum 24 hours per day, currently at ${currentTotals.sleep} hours).`);
      return;
    }
    if (logType === 'Steps' && currentTotals.steps + val > 100000) {
      setError(`Daily steps limit exceeded (maximum 100,000 steps per day, currently at ${currentTotals.steps.toLocaleString()} steps).`);
      return;
    }
    if (logType === 'Calories' && currentTotals.calories + val > 10000) {
      setError(`Daily calories limit exceeded (maximum 10,000 kcal per day, currently at ${currentTotals.calories} kcal).`);
      return;
    }
    if (logType === 'Workout' && currentTotals.workout + val > 360) {
      setError(`Daily workout limit exceeded (maximum 360 minutes per day, currently at ${currentTotals.workout} mins).`);
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const res = await apiClient.post('/api/health', {
        logType,
        logValue: val,
        details: logDetails || `Manual ${logType} entry`,
        logDate: localDateTime
      });

      if (res.data.isSuccess) {
        trackAction('health_log_created', { module: 'health', action: 'create_log', item_type: logType.toLowerCase() });
        notify.success(`${logType} log recorded successfully!`, 'Health Activity Saved');
        setLogValue('');
        setLogDetails('');
        onLogAdded();
        onClose();
      } else {
        setError(res.data.message || `Failed to record ${logType} log.`);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Failed to save ${logType} log.`;
      setError(errMsg);
      notify.error(errMsg, 'Save Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isProf ? '0px' : '20px',
            bgcolor: isProf
              ? 'var(--card-bg)'
              : isDark
              ? 'rgba(26, 29, 45, 0.95)'
              : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: isProf ? 'none' : 'blur(16px)',
            border: isProf
              ? '1px solid var(--card-border)'
              : isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 111, 38, 0.2)',
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: isProf ? 0 : '10px',
              bgcolor: 'rgba(255, 111, 38, 0.12)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AddIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Add Health Log
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Record hydration, sleep, steps, calories, or workout activity.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: '8px !important' }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: isProf ? 0 : '10px' }}>
            {error}
          </Alert>
        )}

        <form id="health-log-form" onSubmit={handleSubmit}>
          <Stack spacing={2.2}>
            <FormControl fullWidth size="small">
              <InputLabel id="health-category-label">Category</InputLabel>
              <Select
                labelId="health-category-label"
                value={logType}
                label="Category"
                onChange={(e) => setLogType(e.target.value as any)}
              >
                <MenuItem value="Water">💧 Water (ml)</MenuItem>
                <MenuItem value="Sleep">🌙 Sleep (hours)</MenuItem>
                <MenuItem value="Steps">🚶 Steps (count)</MenuItem>
                <MenuItem value="Calories">🍽️ Calories (kcal)</MenuItem>
                <MenuItem value="Workout">🏋️ Workout (mins)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={`Amount / Value (${getUnit(logType)})`}
              type="number"
              required
              fullWidth
              size="small"
              value={logValue}
              onChange={(e) => setLogValue(e.target.value)}
              slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
              placeholder={`e.g. ${logType === 'Water' ? '500' : logType === 'Sleep' ? '7.5' : logType === 'Steps' ? '6500' : logType === 'Calories' ? '650' : '45'}`}
            />

            <TextField
              label="Log details / Note"
              required
              fullWidth
              size="small"
              value={logDetails}
              onChange={(e) => setLogDetails(e.target.value)}
              placeholder={`e.g. ${logType === 'Water' ? 'Glass of cold water' : logType === 'Sleep' ? 'Deep restful sleep' : logType === 'Steps' ? 'Evening jog in park' : logType === 'Calories' ? 'High-protein lunch' : 'Upper body dumbbell set'}`}
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="health-log-form"
          variant="contained"
          disabled={submitting || !logValue}
          sx={{
            borderRadius: isProf ? 0 : '10px',
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: 'var(--accent-primary)',
            color: '#fff',
            px: 3,
            '&:hover': { bgcolor: 'var(--accent-secondary)' }
          }}
        >
          {submitting ? 'Saving...' : `Save ${logType} Log`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
