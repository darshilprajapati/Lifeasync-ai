import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Alert, InputAdornment, Step, Stepper, StepLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PinIcon from '@mui/icons-material/Pin';
import apiClient from '../api/apiClient';

const steps = ['Enter Email', 'Verify OTP', 'New Password'];

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Resend cooldown timer state
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e?: React.FormEvent, isResend: boolean = false) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!isResend) {
      setSuccessMsg(null);
    }

    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (response.data.isSuccess) {
        setSuccessMsg(response.data.message || 'OTP sent successfully.');
        setResendCooldown(30); // start 30s cooldown
        if (!isResend) {
          setActiveStep(1);
        }
      } else {
        setError(response.data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred while requesting OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await apiClient.post('/api/auth/verify-otp', { email, otp });
      if (response.data.isSuccess) {
        setSuccessMsg('OTP verified successfully. Please enter your new password.');
        setActiveStep(2);
      } else {
        setError(response.data.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await apiClient.post('/api/auth/reset-password', { email, otp, newPassword });
      if (response.data.isSuccess) {
        setSuccessMsg('Your password has been successfully reset. Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#EAE7DC', // Aligns with the default project background theme
        p: 3,
      }}
    >
      <Card
        component={motion.div}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        sx={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-soft)', // Aligns with project cards shadow
          bgcolor: '#FFFFFF', // Light theme card background
          p: 3,
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 1,
              color: 'var(--text-primary)',
              textAlign: 'center',
              fontFamily: '"Josefin Sans", sans-serif',
              letterSpacing: '0.04em'
            }}
          >
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 4, textAlign: 'center', fontFamily: '"Josefin Sans", sans-serif' }}>
            Sync your credentials securely.
          </Typography>

          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              mb: 4,
              '& .MuiStepLabel-label': { color: 'var(--text-secondary)', fontFamily: '"Josefin Sans", sans-serif' },
              '& .MuiStepLabel-label.Mui-active': { color: 'var(--text-primary)', fontWeight: 600 },
              '& .MuiStepLabel-label.Mui-completed': { color: 'var(--accent-primary)' }
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
              {successMsg}
            </Alert>
          )}

          {activeStep === 0 && (
            <form onSubmit={handleRequestOtp}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Email Address"
                  variant="outlined"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'var(--text-secondary)' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
                      '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    bgcolor: 'var(--accent-primary)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px 0 rgba(232, 90, 79, 0.25)',
                    '&:hover': {
                      bgcolor: 'var(--accent-secondary)',
                    }
                  }}
                >
                  {submitting ? 'Sending Request...' : 'Send Verification OTP'}
                </Button>
              </Box>
            </form>
          )}

          {activeStep === 1 && (
            <form onSubmit={handleVerifyOtp}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Enter 6-Digit OTP"
                  variant="outlined"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PinIcon sx={{ color: 'var(--text-secondary)' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    input: { letterSpacing: otp ? '8px' : 'normal', textAlign: otp ? 'center' : 'left', fontWeight: otp ? 700 : 'normal' },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
                      '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    bgcolor: 'var(--accent-primary)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px 0 rgba(232, 90, 79, 0.25)',
                    '&:hover': {
                      bgcolor: 'var(--accent-secondary)',
                    }
                  }}
                >
                  {submitting ? 'Verifying...' : 'Verify OTP Code'}
                </Button>
                
                {/* Resend OTP Button Container */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Button
                    variant="text"
                    onClick={() => setActiveStep(0)}
                    sx={{ color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600 }}
                  >
                    Change Email
                  </Button>
                  <Button
                    variant="text"
                    disabled={resendCooldown > 0 || submitting}
                    onClick={() => handleRequestOtp(undefined, true)}
                    sx={{ color: 'var(--accent-primary)', textTransform: 'none', fontWeight: 600 }}
                  >
                    {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                  </Button>
                </Box>
              </Box>
            </form>
          )}

          {activeStep === 2 && (
            <form onSubmit={handleResetPassword}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="New Password"
                  variant="outlined"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'var(--text-secondary)' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
                      '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                  }}
                />
                <TextField
                  label="Confirm New Password"
                  variant="outlined"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: 'var(--text-secondary)' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '& fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
                      '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  sx={{
                    borderRadius: '12px',
                    py: 1.5,
                    bgcolor: 'var(--accent-primary)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 4px 14px 0 rgba(232, 90, 79, 0.25)',
                    '&:hover': {
                      bgcolor: 'var(--accent-secondary)',
                    }
                  }}
                >
                  {submitting ? 'Resetting Password...' : 'Save New Password & Sync'}
                </Button>
              </Box>
            </form>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Typography
              variant="body2"
              onClick={() => navigate('/login')}
              sx={{
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Back to Sign In
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;

