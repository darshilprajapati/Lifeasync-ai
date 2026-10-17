import React, { useState, Suspense, lazy } from 'react';
import './LampScene.css';

const LampSceneCanvas = lazy(() => import('./LampSceneCanvas'));

/* ------------------------------------------------------------------ */
/* Check for WebGL capability with safe try-catch                     */
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
  children: (lampIsOn: boolean) => React.ReactNode;
  activeRoute?: 'login' | 'register' | 'forgot-password';
}

const LampAuthLayout: React.FC<LampAuthLayoutProps> = ({ children }) => {
  const [lampIsOn, setLampIsOn] = useState(true);
  const [hasWebGL] = useState(checkWebGLSupport);

  const toggleLamp = () => setLampIsOn((prev) => !prev);

  return (
    <div className="lamp-auth-page-root" aria-label="LifeSync AI Authentication">
      {/* ========================================================= */}
      {/* LEFT SECTION (52% Desktop): Warm Coral-Red Brand & 3D Scene */}
      {/* ========================================================= */}
      <section className="lamp-left-panel" aria-label="Interactive Experience">
        {/* Brand Header */}
        <header className="lamp-brand-header">
          <div className="lamp-brand-badge">
            <img
              src="/logo.jpg"
              alt="LifeSync AI logo"
              className="lamp-brand-avatar"
              width={42}
              height={42}
            />
            <div className="lamp-brand-titles">
              <span className="lamp-brand-title">LIFESYNC AI</span>
              <span className="lamp-brand-tagline">Harmonize Health, Work & Life</span>
            </div>
          </div>
        </header>

        {/* Central Visual: Interactive Three.js Scene OR Accessible Fallback */}
        <div className="lamp-visual-container">
          {hasWebGL ? (
            <Suspense
              fallback={
                <div className="lamp-loading-placeholder" aria-label="Loading interactive 3D visual...">
                  <div className="lamp-pulse-ring" />
                </div>
              }
            >
              <LampSceneCanvas isOn={lampIsOn} onToggle={toggleLamp} />
            </Suspense>
          ) : (
            <div className="lamp-fallback-graphic" aria-label="LifeSync wellness illustration">
              {/* Wellness-themed central illustration with lightning & wellness symbols */}
              <div className="lamp-fallback-glow" />
              <div className="lamp-fallback-ring">
                <div className="lamp-fallback-center-symbol" title="LifeSync AI Core">
                  ⚡
                </div>
                <div className="lamp-fallback-node node-health" title="Health & Wellness">❤️</div>
                <div className="lamp-fallback-node node-productivity" title="Focus & Productivity">🎯</div>
                <div className="lamp-fallback-node node-security" title="Security & Privacy">🛡️</div>
                <div className="lamp-fallback-node node-schedule" title="Adaptive Scheduling">📅</div>
                <div className="lamp-fallback-node node-finance" title="Financial Discipline">💳</div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Lighting Toggle Pill */}
        <div className="lamp-interactive-bar">
          <button
            type="button"
            className="lamp-toggle-pill"
            onClick={toggleLamp}
            aria-pressed={lampIsOn}
            aria-label={`Toggle ambient lamp lighting. Currently ${lampIsOn ? 'on' : 'off'}.`}
          >
            <span className={`lamp-toggle-indicator ${lampIsOn ? 'is-active' : ''}`} />
            <span className="lamp-toggle-text">
              {lampIsOn ? 'Warm Illumination Active' : 'Illumination Dimmed'} (Click to toggle)
            </span>
          </button>
        </div>

        {/* Bottom Feature Highlights */}
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
      {/* RIGHT SECTION (48% Desktop): Warm Off-White Auth Card     */}
      {/* ========================================================= */}
      <section className="lamp-right-panel" aria-label="Authentication Form">
        <main className="lamp-card-wrapper">
          <div className="lamp-auth-card">
            {children(lampIsOn)}
          </div>
        </main>
      </section>
    </div>
  );
};

export default LampAuthLayout;
