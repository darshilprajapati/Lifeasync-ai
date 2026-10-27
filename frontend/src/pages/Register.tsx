import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackAction } from '../utils/analytics';
import { useLampAuthContext } from '../components/LampScene';
import { getAllCountries, getStatesOfCountry, normalizeCity } from '../utils/locationData';
import { useNotification } from '../context/NotificationContext';
import { useThemeSystem, type DesignSystem, type ThemeMode } from '../context/ThemeContext';

// In-memory cache preserved across form switching and lamp toggles
let cachedRegisterFullName = '';
let cachedRegisterEmail = '';

const Register: React.FC = () => {
  const { isFormActive } = useLampAuthContext();
  const navigate = useNavigate();
  const { register } = useAuth();
  const { notify } = useNotification();
  const { designSystem, setDesignSystem, mode, setMode } = useThemeSystem();

  // Appearance Selection during registration (client-side only; applied upon successful registration)
  const [selectedDesign, setSelectedDesign] = useState<DesignSystem>(() => {
    const saved = localStorage.getItem('lifesync_design_system');
    return (saved === 'professional' || saved === 'modern3d') ? saved : (designSystem || 'modern3d');
  });
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('lifesync_theme');
    return (saved === 'light' || saved === 'dark') ? saved : (mode || 'dark');
  });

  // Multi-step registration flow: Step 1 (Credentials) -> Step 2 (Optional Location)
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Required Account Credentials
  const [fullName, setFullName] = useState(cachedRegisterFullName);
  const [email, setEmail] = useState(cachedRegisterEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Optional Location
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  const allCountries = useMemo(() => getAllCountries(), []);
  const availableStates = useMemo(() => getStatesOfCountry(country), [country]);

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

  // Validate Step 1 credentials before advancing to Step 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      notify.warning('Please enter your full name.');
      return;
    }
    if (!email.trim() || !emailIsValid) {
      setErrorMessage('Please provide a valid email address.');
      notify.warning('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please create a secure password.');
      notify.warning('Please create a secure password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      notify.warning('Password must be at least 6 characters.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      notify.warning('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setStep(2);
  };

  const handleBackStep = () => {
    setErrorMessage(null);
    setStep(1);
  };

  // Submit account registration (with optional location or skipped)
  const executeRegistration = async (includeLocation: boolean) => {
    if (!isFormActive || submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedCountry = country.trim();
    const trimmedState = state.trim();
    const normalizedCity = normalizeCity(city);

    // If user filled in location, validate state match if applicable
    if (includeLocation && trimmedCountry && trimmedState && availableStates.length > 0) {
      const stateValid = availableStates.some(
        (s) => s.name.toLowerCase() === trimmedState.toLowerCase() || s.isoCode.toLowerCase() === trimmedState.toLowerCase()
      );
      if (!stateValid) {
        setErrorMessage('Selected state does not belong to the selected country.');
        notify.warning('Selected state does not belong to the selected country.');
        return;
      }
    }

    setSubmitting(true);
    trackAction('register_attempt', { email, step: 2, includeLocation });

    try {
      const locationPayload = includeLocation && (trimmedCountry || trimmedState || normalizedCity) ? {
        country: trimmedCountry || undefined,
        state: trimmedState || undefined,
        city: normalizedCity || undefined
      } : undefined;

      await register(fullName.trim(), email.trim(), password, locationPayload);

      // Apply chosen appearance immediately after successful registration
      try {
        setDesignSystem(selectedDesign);
        setMode(selectedMode);
        localStorage.setItem('lifesync_design_system', selectedDesign);
        localStorage.setItem('lifesync_theme', selectedMode);
      } catch (err) {
        console.error('Failed to set appearance preference:', err);
      }

      trackAction('register_success');
      notify.success('Account created successfully! Redirecting...');
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
      notify.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Header and Step Progress Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {step === 2 && (
            <button
              id="register-back-arrow-btn"
              type="button"
              onClick={handleBackStep}
              aria-label="Back to account details"
              title="Back to account details"
              disabled={submitting || !isFormActive}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer',
                marginTop: '1px',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.borderColor = 'rgba(255, 94, 77, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="lamp-card-title" style={{ fontSize: '22px', marginBottom: '2px' }}>
              {step === 1 ? 'Create Account' : 'Location'}
            </h1>
            <p className="lamp-card-subtitle" style={{ fontSize: '13px', marginBottom: '14px' }}>
              {step === 1
                ? 'Start your wellness & productivity journey.'
                : 'You can skip this and add or edit your location anytime from Profile.'}
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.85)',
            background: 'rgba(255, 94, 77, 0.22)',
            border: '1px solid rgba(255, 94, 77, 0.45)',
            padding: '3px 10px',
            borderRadius: '20px',
            whiteSpace: 'nowrap'
          }}
        >
          Step {step} of 2
        </span>
      </div>

      {errorMessage && (
        <div className="lamp-alert lamp-alert-error" role="alert" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '12.5px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="lamp-alert lamp-alert-success" role="alert" style={{ marginBottom: '14px', padding: '10px 14px', fontSize: '12.5px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Required Account Credentials (4 Fields Only)                      */}
      {/* ========================================================================= */}
      {step === 1 && (
        <form className="lamp-form" onSubmit={handleNextStep} noValidate style={{ gap: '12px' }}>
          {/* Full Name */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-name" className="lamp-field-label" style={{ fontSize: '12px' }}>
              Full Name
            </label>
            <div className="lamp-input-container">
              <span className="lamp-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                style={{ height: '42px', fontSize: '13px' }}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  cachedRegisterFullName = e.target.value;
                }}
                onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
              />
            </div>
            {touched.fullName && !fullName.trim() && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Full name is required</span>
            )}
          </div>

          {/* Email Address */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-email" className="lamp-field-label" style={{ fontSize: '12px' }}>
              Email Address
            </label>
            <div className="lamp-input-container">
              <span className="lamp-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                style={{ height: '42px', fontSize: '13px' }}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  cachedRegisterEmail = e.target.value;
                }}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              />
            </div>
            {touched.email && !email.trim() && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Email is required</span>
            )}
            {touched.email && email.trim() && !emailIsValid && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Enter a valid email address</span>
            )}
          </div>

          {/* Password */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-password" className="lamp-field-label" style={{ fontSize: '12px' }}>
              Password
            </label>
            <div className="lamp-input-container">
              <span className="lamp-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                style={{ height: '42px', fontSize: '13px', paddingRight: '44px' }}
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {touched.password && !password && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Password is required</span>
            )}
            {touched.password && password && password.length < 6 && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Password must be at least 6 characters</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-confirm-password" className="lamp-field-label" style={{ fontSize: '12px' }}>
              Confirm Password
            </label>
            <div className="lamp-input-container">
              <span className="lamp-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                style={{ height: '42px', fontSize: '13px', paddingRight: '44px' }}
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {touched.confirmPassword && !confirmPassword && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Please confirm your password</span>
            )}
            {touched.confirmPassword && confirmPassword && !passwordsMatch && (
              <span className="lamp-error-text" style={{ fontSize: '11px' }}>Passwords do not match</span>
            )}
          </div>

          {/* ========================================================================= */}
          {/* Choose Your Appearance (Design System & Theme Mode)                       */}
          {/* ========================================================================= */}
          <div className="lamp-field-group" style={{ gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="lamp-field-label" style={{ fontSize: '12px', margin: 0, fontWeight: 600 }}>
                Choose Your Appearance
              </label>
              <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.55)' }}>
                Configurable anytime in Profile
              </span>
            </div>

            {/* Design System: Professional vs Modern 3D */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Professional Card */}
              <button
                id="register-pref-professional"
                type="button"
                role="radio"
                aria-checked={selectedDesign === 'professional'}
                onClick={() => setSelectedDesign('professional')}
                disabled={!isFormActive}
                tabIndex={isFormActive ? 0 : -1}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '9px 11px',
                  borderRadius: '10px',
                  background: selectedDesign === 'professional'
                    ? 'rgba(255, 94, 77, 0.16)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedDesign === 'professional'
                    ? '1.5px solid #FF5E4D'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: selectedDesign === 'professional'
                    ? '0 0 12px rgba(255, 94, 77, 0.25)'
                    : 'none',
                  cursor: isFormActive ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  color: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={selectedDesign === 'professional' ? '#FF5E4D' : 'rgba(255, 255, 255, 0.7)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="1" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>Professional</span>
                  </div>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: selectedDesign === 'professional' ? '4px solid #FF5E4D' : '1.5px solid rgba(255, 255, 255, 0.35)',
                      background: selectedDesign === 'professional' ? '#FFFFFF' : 'transparent',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.68)', lineHeight: 1.3 }}>
                  Clean, flat, minimal interface.
                </span>
              </button>

              {/* Modern 3D Card */}
              <button
                id="register-pref-modern3d"
                type="button"
                role="radio"
                aria-checked={selectedDesign === 'modern3d'}
                onClick={() => setSelectedDesign('modern3d')}
                disabled={!isFormActive}
                tabIndex={isFormActive ? 0 : -1}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '9px 11px',
                  borderRadius: '10px',
                  background: selectedDesign === 'modern3d'
                    ? 'rgba(255, 94, 77, 0.16)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedDesign === 'modern3d'
                    ? '1.5px solid #FF5E4D'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: selectedDesign === 'modern3d'
                    ? '0 0 12px rgba(255, 94, 77, 0.25)'
                    : 'none',
                  cursor: isFormActive ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  color: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={selectedDesign === 'modern3d' ? '#FF5E4D' : 'rgba(255, 255, 255, 0.7)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>Modern 3D</span>
                  </div>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: selectedDesign === 'modern3d' ? '4px solid #FF5E4D' : '1.5px solid rgba(255, 255, 255, 0.35)',
                      background: selectedDesign === 'modern3d' ? '#FFFFFF' : 'transparent',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.68)', lineHeight: 1.3 }}>
                  Glassmorphism, dimensional surfaces, and enhanced visual effects.
                </span>
              </button>
            </div>

            {/* Theme Mode Selector: Light vs Dark */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '1px' }}>
              {/* Light Mode Button */}
              <button
                id="register-mode-light"
                type="button"
                role="radio"
                aria-checked={selectedMode === 'light'}
                onClick={() => setSelectedMode('light')}
                disabled={!isFormActive}
                tabIndex={isFormActive ? 0 : -1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: selectedMode === 'light'
                    ? 'rgba(255, 94, 77, 0.22)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedMode === 'light'
                    ? '1.5px solid #FF5E4D'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  color: selectedMode === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                  cursor: isFormActive ? 'pointer' : 'default',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <span>Light Mode</span>
                {selectedMode === 'light' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5E4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {/* Dark Mode Button */}
              <button
                id="register-mode-dark"
                type="button"
                role="radio"
                aria-checked={selectedMode === 'dark'}
                onClick={() => setSelectedMode('dark')}
                disabled={!isFormActive}
                tabIndex={isFormActive ? 0 : -1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: selectedMode === 'dark'
                    ? 'rgba(255, 94, 77, 0.22)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedMode === 'dark'
                    ? '1.5px solid #FF5E4D'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  color: selectedMode === 'dark' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                  cursor: isFormActive ? 'pointer' : 'default',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Dark Mode</span>
                {selectedMode === 'dark' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5E4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Step 1 Submit / Next Button */}
          <button
            id="register-next-btn"
            type="submit"
            className="lamp-primary-button lamp-signup-submit-button"
            disabled={!isFormActive}
            style={{ height: '44px', marginTop: '6px' }}
            tabIndex={isFormActive ? 0 : -1}
          >
            <span>Next</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Location (Country, State, City)                                   */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Country Selection */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-country" className="lamp-field-label" style={{ fontSize: '12px' }}>
              Country
            </label>
            <div className="lamp-input-container">
              <select
                id="register-country"
                className="lamp-input-field"
                style={{
                  backgroundColor: 'rgba(20, 24, 38, 0.75)',
                  color: country ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  height: '42px'
                }}
                disabled={!isFormActive}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setState(''); // Reset state on country change
                }}
              >
                <option value="" style={{ background: '#1A1D2D', color: '#FFF' }}>Select Country</option>
                {allCountries.map((c) => (
                  <option key={c.isoCode} value={c.name} style={{ background: '#1A1D2D', color: '#FFF' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* State / Region Selection */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-state" className="lamp-field-label" style={{ fontSize: '12px' }}>
              State / Region
            </label>
            <div className="lamp-input-container">
              {availableStates.length > 0 ? (
                <select
                  id="register-state"
                  className="lamp-input-field"
                  style={{
                    backgroundColor: 'rgba(20, 24, 38, 0.75)',
                    color: state ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    height: '42px'
                  }}
                  disabled={!isFormActive || !country}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="" style={{ background: '#1A1D2D', color: '#FFF' }}>
                    {country ? 'Select State / Region' : 'Select country first'}
                  </option>
                  {availableStates.map((s) => (
                    <option key={s.isoCode || s.name} value={s.name} style={{ background: '#1A1D2D', color: '#FFF' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="register-state"
                  type="text"
                  className="lamp-input-field"
                  style={{ fontSize: '12.5px', height: '42px' }}
                  placeholder={country ? "Enter State / Region" : "Select country first"}
                  disabled={!isFormActive || !country}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* City Free-text Field */}
          <div className="lamp-field-group" style={{ gap: '4px' }}>
            <label htmlFor="register-city" className="lamp-field-label" style={{ fontSize: '12px' }}>
              City
            </label>
            <div className="lamp-input-container">
              <input
                id="register-city"
                type="text"
                className="lamp-input-field"
                style={{ fontSize: '12.5px', height: '42px' }}
                placeholder="e.g. Ahmedabad"
                disabled={!isFormActive}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Skip location text link above primary button */}
          <div className="lamp-actions-row" style={{ marginTop: '2px', marginBottom: '2px', justifyContent: 'flex-end' }}>
            <button
              id="register-skip-link"
              type="button"
              onClick={() => executeRegistration(false)}
              className="lamp-link-accent"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                cursor: isFormActive && !submitting ? 'pointer' : 'default',
              }}
              disabled={submitting || !isFormActive}
              tabIndex={isFormActive ? 0 : -1}
            >
              Skip location and create account
            </button>
          </div>

          {/* Primary Create Account Button */}
          <button
            id="register-submit-btn"
            type="button"
            onClick={() => executeRegistration(true)}
            className="lamp-primary-button lamp-signup-submit-button"
            style={{
              width: '100%',
              height: '46px',
              fontSize: '14.5px',
              marginTop: '4px'
            }}
            disabled={submitting || !isFormActive}
            tabIndex={isFormActive ? 0 : -1}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spinRing 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <span>Creating…</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      )}

      {/* Switch to Login Link */}
      <div className="lamp-switch-text" style={{ marginTop: '16px', fontSize: '13px' }}>
        Already have an account?{' '}
        <Link to="/login" className="lamp-switch-link" tabIndex={isFormActive ? 0 : -1}>
          Sign In
        </Link>
      </div>
    </>
  );
};

export default Register;
