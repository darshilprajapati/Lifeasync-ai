import React, { useState, useEffect, Suspense, lazy } from 'react';
import './LampScene.css';

const LampSceneCanvas = lazy(() => import('./LampSceneCanvas'));

/* ------------------------------------------------------------------ */
/* Global In-Memory Lamp State Store (Preserved across Route Changes) */
/* ------------------------------------------------------------------ */
let sharedLampIsOn = true;
let sharedLampState: 'off' | 'turningOn' | 'on' | 'turningOff' = 'on';
const stateListeners = new Set<(state: 'off' | 'turningOn' | 'on' | 'turningOff', isOn: boolean) => void>();

function notifyListeners() {
  stateListeners.forEach((fn) => fn(sharedLampState, sharedLampIsOn));
}

export function toggleGlobalLamp() {
  if (sharedLampIsOn) {
    sharedLampIsOn = false;
    sharedLampState = 'turningOff';
    notifyListeners();

    setTimeout(() => {
      sharedLampState = 'off';
      notifyListeners();
    }, 450);
  } else {
    sharedLampIsOn = true;
    sharedLampState = 'turningOn';
    notifyListeners();

    setTimeout(() => {
      sharedLampState = 'on';
      notifyListeners();
    }, 450);
  }
}

/* ------------------------------------------------------------------ */
/* Check for WebGL capability safely                                  */
/* ------------------------------------------------------------------ */
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

interface LampAuthLayoutProps {
  children: (isFormActive: boolean, lampState: 'off' | 'turningOn' | 'on' | 'turningOff') => React.ReactNode;
  activeRoute?: 'login' | 'register' | 'forgot-password';
}

const LampAuthLayout: React.FC<LampAuthLayoutProps> = ({ children }) => {
  const [lampIsOn, setLampIsOn] = useState(sharedLampIsOn);
  const [lampState, setLampState] = useState(sharedLampState);
  const [hasWebGL] = useState(checkWebGLSupport);

  useEffect(() => {
    const listener = (newState: 'off' | 'turningOn' | 'on' | 'turningOff', newIsOn: boolean) => {
      setLampState(newState);
      setLampIsOn(newIsOn);
    };
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  const handleToggle = () => {
    toggleGlobalLamp();
  };

  const isFormActive = lampState === 'on' || lampState === 'turningOn';
  const isDarkRoom = !lampIsOn || lampState === 'off' || lampState === 'turningOff';

  return (
    <div
      className={`lamp-auth-page-root ${isDarkRoom ? 'state-dark-room' : 'state-light-room'}`}
      aria-label="LifeSync AI Authentication Experience"
    >
      {/* ========================================================= */}
      {/* LEFT SECTION (52% Desktop): 3D Lamp Environment           */}
      {/* ========================================================= */}
      <section className="lamp-left-panel" aria-label="Interactive Lamp Experience">
        {/* Brand Header */}
        <header className="lamp-brand-header">
          <div className="lamp-brand-badge">
            <img
              src="/logo.jpg"
              alt="LifeSync AI logo"
              className="lamp-brand-avatar"
              width={40}
              height={40}
            />
            <div className="lamp-brand-titles">
              <span className="lamp-brand-title">LIFESYNC AI</span>
              <span className="lamp-brand-tagline">Harmonize Health, Work & Life</span>
            </div>
          </div>
        </header>

        {/* 3D Lamp Scene Container */}
        <div className="lamp-visual-container">
          {hasWebGL ? (
            <Suspense
              fallback={
                <div className="lamp-loading-placeholder" aria-label="Loading 3D lamp visual...">
                  <div className="lamp-pulse-ring" />
                </div>
              }
            >
              <LampSceneCanvas
                isOn={lampIsOn}
                onToggle={handleToggle}
                lampState={lampState}
              />
            </Suspense>
          ) : (
            <div className="lamp-fallback-graphic" aria-label="LifeSync wellness illustration">
              <div className="lamp-fallback-glow" />
              <div className="lamp-fallback-ring">
                <div className="lamp-fallback-center-symbol" title="LifeSync AI Core">
                  ⚡
                </div>
                <div className="lamp-fallback-node node-health">❤️</div>
                <div className="lamp-fallback-node node-productivity">🎯</div>
                <div className="lamp-fallback-node node-security">🛡️</div>
                <div className="lamp-fallback-node node-schedule">📅</div>
                <div className="lamp-fallback-node node-finance">💳</div>
              </div>
            </div>
          )}

          {/* Interactive Floating Cord Label Callout matching the reference */}
          <div className="lamp-cord-indicator" onClick={handleToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}>
            <span className="lamp-cord-line" />
            <span className="lamp-cord-label">
              {lampIsOn ? 'PULL AGAIN FOR DARK' : 'PULL THE CORD'}
            </span>
          </div>
        </div>

        {/* Accessible Lamp Light Toggle Pill (Always usable in ON and OFF states) */}
        <div className="lamp-interactive-bar">
          <button
            type="button"
            className="lamp-toggle-pill"
            onClick={handleToggle}
            aria-pressed={lampIsOn}
            aria-label={`Toggle lamp illumination. Currently ${lampIsOn ? 'Illuminated' : 'Dark'}. Press to toggle.`}
          >
            <span className={`lamp-toggle-indicator ${lampIsOn ? 'is-active' : ''}`} />
            <span className="lamp-toggle-text">
              {lampIsOn ? 'Illumination ON' : 'Illumination OFF'} — Click cord or toggle
            </span>
          </button>
        </div>

        {/* Bottom Feature Badges */}
        <footer className="lamp-features-footer">
          <div className="lamp-feature-item">
            <span className="lamp-feature-bullet">✦</span>
            <span>Intelligent AI Workouts</span>
          </div>
          <div className="lamp-feature-item">
            <span className="lamp-feature-bullet">✦</span>
            <span>Holistic Life Balance</span>
          </div>
          <div className="lamp-feature-item">
            <span className="lamp-feature-bullet">✦</span>
            <span>Zero-Knowledge Privacy</span>
          </div>
        </footer>
      </section>

      {/* ========================================================= */}
      {/* RIGHT SECTION (48% Desktop): Light-Controlled Auth Panel  */}
      {/* ========================================================= */}
      <section
        className={`lamp-right-panel ${isDarkRoom ? 'panel-dark' : 'panel-illuminated'}`}
        aria-label="Authentication Form"
      >
        <div className="lamp-card-wrapper">
          {/* Form Card: Controlled by Lamp Lighting State */}
          <div
            className={`lamp-auth-card ${isFormActive ? 'card-revealed' : 'card-hidden'}`}
            aria-hidden={!isFormActive}
            style={{
              visibility: lampState === 'off' ? 'hidden' : 'visible',
              pointerEvents: isFormActive ? 'auto' : 'none',
            }}
          >
            <fieldset
              disabled={!isFormActive}
              style={{
                border: 'none',
                padding: 0,
                margin: 0,
                width: '100%',
              }}
            >
              {children(isFormActive, lampState)}
            </fieldset>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LampAuthLayout;
