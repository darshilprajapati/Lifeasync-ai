import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackAction } from '../utils/analytics';
import { useLampAuthContext } from '../components/LampScene';

// In-memory cache preserved across form switching and lamp toggles
let cachedRegisterFullName = '';
let cachedRegisterEmail = '';

const Register: React.FC = () => {
  const { isFormActive } = useLampAuthContext();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState(cachedRegisterFullName);
  const [email, setEmail] = useState(cachedRegisterEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormActive || submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !emailIsValid) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please create a secure password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    trackAction('register_attempt', { email });

    try {
      await register(fullName.trim(), email.trim(), password);
      trackAction('register_success');
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please check your details and try again.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="lamp-card-title">Create Account</h1>
      <p className="lamp-card-subtitle">
        Start your unified wellness & productivity journey.
      </p>

      {errorMessage && (
        <div className="lamp-alert lamp-alert-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="lamp-alert lamp-alert-success" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      <form className="lamp-form" onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div className="lamp-field-group">
          <label htmlFor="register-name" className="lamp-field-label">
            Full Name
          </label>
          <div className="lamp-input-container">
            <span className="lamp-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="register-name"
              type="text"
              className={`lamp-input-field ${touched.fullName && !fullName.trim() ? 'has-error' : ''}`}
              placeholder="John Doe"
              autoComplete="name"
              required
              disabled={!isFormActive}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                cachedRegisterFullName = e.target.value;
              }}
              onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
            />
          </div>
          {touched.fullName && !fullName.trim() && (
            <span className="lamp-error-text">Full name is required</span>
          )}
        </div>

        {/* Email Address */}
        <div className="lamp-field-group">
          <label htmlFor="register-email" className="lamp-field-label">
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
              id="register-email"
              type="email"
              className={`lamp-input-field ${touched.email && (!email.trim() || !emailIsValid) ? 'has-error' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={!isFormActive}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                cachedRegisterEmail = e.target.value;
              }}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            />
          </div>
          {touched.email && !email.trim() && (
            <span className="lamp-error-text">Email is required</span>
          )}
          {touched.email && email.trim() && !emailIsValid && (
            <span className="lamp-error-text">Enter a valid email address</span>
          )}
        </div>

        {/* Password */}
        <div className="lamp-field-group">
          <label htmlFor="register-password" className="lamp-field-label">
            Password
          </label>
          <div className="lamp-input-container">
            <span className="lamp-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className={`lamp-input-field ${touched.password && (!password || password.length < 6) ? 'has-error' : ''}`}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
              disabled={!isFormActive}
              style={{ paddingRight: '46px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
            />
            <button
              type="button"
              className="lamp-eye-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={isFormActive ? 0 : -1}
              disabled={!isFormActive}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {touched.password && !password && (
            <span className="lamp-error-text">Password is required</span>
          )}
          {touched.password && password && password.length < 6 && (
            <span className="lamp-error-text">Password must be at least 6 characters</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="lamp-field-group">
          <label htmlFor="register-confirm-password" className="lamp-field-label">
            Confirm Password
          </label>
          <div className="lamp-input-container">
            <span className="lamp-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className={`lamp-input-field ${touched.confirmPassword && (!confirmPassword || !passwordsMatch) ? 'has-error' : ''}`}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              disabled={!isFormActive}
              style={{ paddingRight: '46px' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
            />
            <button
              type="button"
              className="lamp-eye-button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              tabIndex={isFormActive ? 0 : -1}
              disabled={!isFormActive}
            >
              {showConfirmPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {touched.confirmPassword && !confirmPassword && (
            <span className="lamp-error-text">Please confirm your password</span>
          )}
          {touched.confirmPassword && confirmPassword && !passwordsMatch && (
            <span className="lamp-error-text">Passwords do not match</span>
          )}
        </div>

        {/* Primary Coral-Red Create Account Button */}
        <button
          id="register-submit-btn"
          type="submit"
          className="lamp-primary-button"
          disabled={submitting || !isFormActive}
          tabIndex={isFormActive ? 0 : -1}
        >
          {submitting ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spinRing 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              <span>Creating Account…</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="lamp-switch-text">
        Already have an account?{' '}
        <Link to="/login" className="lamp-switch-link" tabIndex={isFormActive ? 0 : -1}>
          Sign In
        </Link>
      </div>
    </>
  );
};

export default Register;
