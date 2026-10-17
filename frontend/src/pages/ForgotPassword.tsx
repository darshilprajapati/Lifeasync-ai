import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import LampAuthLayout from '../components/LampScene/LampAuthLayout';

const steps = ['Enter Email', 'Verify OTP', 'New Password'];

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    if (!isResend) {
      setSuccessMsg(null);
    }

    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (response.data.isSuccess) {
        setSuccessMsg(response.data.message || 'OTP sent successfully.');
        setResendCooldown(30); // 30s cooldown
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
    if (!otp || otp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }
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
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
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
        trackAction('password_reset', { method: 'otp' });
        setSuccessMsg('Your password has been successfully reset. Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
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
    <LampAuthLayout activeRoute="forgot-password">
      {(isFormActive) => (
        <>
          <h1 className="lamp-card-title">Reset Password</h1>
          <p className="lamp-card-subtitle">
            Sync your credentials securely.
          </p>

          {/* Stepper Header */}
          <div className="lamp-stepper" aria-label="Password reset progress">
            {steps.map((label, index) => {
              const isActive = activeStep === index;
              const isCompleted = activeStep > index;
              return (
                <div
                  key={label}
                  className={`lamp-step-node ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
                >
                  <div className="lamp-step-badge">
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className="lamp-step-name">{label}</span>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="lamp-alert lamp-alert-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="lamp-alert lamp-alert-success" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 0: REQUEST OTP */}
          {activeStep === 0 && (
            <form className="lamp-form" onSubmit={(e) => isFormActive && handleRequestOtp(e)}>
              <div className="lamp-field-group">
                <label htmlFor="forgot-email" className="lamp-field-label">
                  Email Address
                </label>
                <div className="lamp-input-container">
                  <span className="lamp-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="lamp-input-field"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    disabled={!isFormActive}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="lamp-primary-button"
                disabled={submitting || !isFormActive}
                tabIndex={isFormActive ? 0 : -1}
              >
                {submitting ? 'Sending Request…' : 'Send Verification OTP'}
              </button>
            </form>
          )}

          {/* STEP 1: VERIFY OTP */}
          {activeStep === 1 && (
            <form className="lamp-form" onSubmit={(e) => isFormActive && handleVerifyOtp(e)}>
              <div className="lamp-field-group">
                <label htmlFor="forgot-otp" className="lamp-field-label">
                  Enter 6-Digit OTP
                </label>
                <div className="lamp-input-container">
                  <span className="lamp-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                      <line x1="10" y1="3" x2="8" y2="21" />
                      <line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  </span>
                  <input
                    id="forgot-otp"
                    type="text"
                    className="lamp-input-field"
                    placeholder="123456"
                    maxLength={6}
                    required
                    disabled={!isFormActive}
                    style={{ letterSpacing: '0.25em', fontWeight: 600 }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="lamp-primary-button"
                disabled={submitting || !isFormActive || otp.length !== 6}
                tabIndex={isFormActive ? 0 : -1}
              >
                {submitting ? 'Verifying OTP…' : 'Verify Code'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleRequestOtp(undefined, true)}
                  disabled={resendCooldown > 0 || submitting || !isFormActive}
                  tabIndex={isFormActive ? 0 : -1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#8E8D8A' : '#E85A4F',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP Code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER NEW PASSWORD */}
          {activeStep === 2 && (
            <form className="lamp-form" onSubmit={(e) => isFormActive && handleResetPassword(e)}>
              <div className="lamp-field-group">
                <label htmlFor="new-password" className="lamp-field-label">
                  New Password
                </label>
                <div className="lamp-input-container">
                  <span className="lamp-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="lamp-input-field"
                    placeholder="Minimum 6 characters"
                    required
                    disabled={!isFormActive}
                    style={{ paddingRight: '46px' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lamp-eye-button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    tabIndex={isFormActive ? 0 : -1}
                    disabled={!isFormActive}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="lamp-field-group">
                <label htmlFor="confirm-new-password" className="lamp-field-label">
                  Confirm New Password
                </label>
                <div className="lamp-input-container">
                  <span className="lamp-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="lamp-input-field"
                    placeholder="Confirm new password"
                    required
                    disabled={!isFormActive}
                    style={{ paddingRight: '46px' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lamp-eye-button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={isFormActive ? 0 : -1}
                    disabled={!isFormActive}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="lamp-primary-button"
                disabled={submitting || !isFormActive}
                tabIndex={isFormActive ? 0 : -1}
              >
                {submitting ? 'Resetting Password…' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to Sign In Link */}
          <div className="lamp-switch-text">
            Remembered your credentials?{' '}
            <Link to="/login" className="lamp-switch-link" tabIndex={isFormActive ? 0 : -1}>
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </LampAuthLayout>
  );
};

export default ForgotPassword;
