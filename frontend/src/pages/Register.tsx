import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trackAction } from '../utils/analytics';
import { useLampAuthContext } from '../components/LampScene';
import { getAllCountries, getStatesOfCountry, normalizeCity } from '../utils/locationData';

// In-memory cache preserved across form switching and lamp toggles
let cachedRegisterFullName = '';
let cachedRegisterEmail = '';

const Register: React.FC = () => {
  const { isFormActive } = useLampAuthContext();
  const navigate = useNavigate();
  const { register } = useAuth();

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
      {/* Header and Step Progress Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h1 className="lamp-card-title" style={{ fontSize: '22px', marginBottom: '2px' }}>
            {step === 1 ? 'Create Account' : 'Location (Optional)'}
          </h1>
          <p className="lamp-card-subtitle" style={{ fontSize: '13px', marginBottom: '14px' }}>
            {step === 1
              ? 'Start your wellness & productivity journey.'
              : 'Add your location to unlock LifeSync Arena leaderboards.'}
          </p>
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

          {/* Step 1 Next Button */}
          <button
            id="register-next-btn"
            type="submit"
            className="lamp-primary-button"
            disabled={!isFormActive}
            style={{ height: '44px', marginTop: '6px' }}
            tabIndex={isFormActive ? 0 : -1}
          >
            <span>Next: Location (Optional)</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Optional Location (Country, State, City)                          */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 4px 0' }}>
            Optional — add your location to join LifeSync Arena rankings. You can skip this and update it later in Profile.
          </p>

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

          {/* Actions: Back, Skip for now, Create Account */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              id="register-back-btn"
              type="button"
              onClick={handleBackStep}
              className="lamp-primary-button"
              style={{
                flex: '0 0 28%',
                height: '44px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                boxShadow: 'none',
                fontSize: '13px'
              }}
              disabled={submitting || !isFormActive}
            >
              Back
            </button>

            <button
              id="register-skip-btn"
              type="button"
              onClick={() => executeRegistration(false)}
              className="lamp-primary-button"
              style={{
                flex: 1,
                height: '44px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                boxShadow: 'none',
                fontSize: '13px'
              }}
              disabled={submitting || !isFormActive}
            >
              Skip for now
            </button>

            <button
              id="register-submit-btn"
              type="button"
              onClick={() => executeRegistration(true)}
              className="lamp-primary-button"
              style={{
                flex: 1.2,
                height: '44px',
                fontSize: '13.5px'
              }}
              disabled={submitting || !isFormActive}
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
