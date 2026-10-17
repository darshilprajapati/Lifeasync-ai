import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackAction } from '../utils/analytics';
import LampAuthLayout from '../components/LampScene/LampAuthLayout';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent, isFormActive: boolean) => {
    e.preventDefault();
    if (!isFormActive || submitting) return;
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!emailIsValid) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSubmitting(true);
    trackAction('login_attempt', { email });

    try {
      const user = await login(email, password);
      trackAction('login_success', { role: user?.role });
      const destination = (location.state as any)?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid email or password. Please try again.';
      setErrorMessage(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LampAuthLayout activeRoute="login">
      {(isFormActive) => (
        <>
          <h1 className="lamp-card-title">Welcome Back</h1>
          <p className="lamp-card-subtitle">
            Enter your details to sign in and resume sync.
          </p>

          {errorMessage && (
            <div className="lamp-alert lamp-alert-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="lamp-form" onSubmit={(e) => handleSubmit(e, isFormActive)} noValidate>
            {/* Email Field */}
            <div className="lamp-field-group">
              <label htmlFor="login-email" className="lamp-field-label">
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
                  id="login-email"
                  type="email"
                  className={`lamp-input-field ${touched.email && (!email || !emailIsValid) ? 'has-error' : ''}`}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={!isFormActive}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                />
              </div>
              {touched.email && !email && (
                <span className="lamp-error-text">Email is required</span>
              )}
              {touched.email && email && !emailIsValid && (
                <span className="lamp-error-text">Enter a valid email address</span>
              )}
            </div>

            {/* Password Field */}
            <div className="lamp-field-group">
              <label htmlFor="login-password" className="lamp-field-label">
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
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`lamp-input-field ${touched.password && !password ? 'has-error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="lamp-actions-row">
              <Link to="/forgot-password" className="lamp-link-accent" tabIndex={isFormActive ? 0 : -1}>
                Forgot Password?
              </Link>
            </div>

            {/* Primary Coral-Red Sign In Button */}
            <button
              id="login-submit-btn"
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
                  <span>Signing In…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="lamp-switch-text">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="lamp-switch-link" tabIndex={isFormActive ? 0 : -1}>
              Sign Up
            </Link>
          </div>
        </>
      )}
    </LampAuthLayout>
  );
};

export default Login;
