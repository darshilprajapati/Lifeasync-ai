import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getSharedLampState, subscribeLampState, toggleGlobalLamp } from './lampState';
import LampSceneCanvas from './LampSceneCanvas';
import './LampScene.css';

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
  children?: (isFormActive: boolean, lampState: 'off' | 'turningOn' | 'on' | 'turningOff') => React.ReactNode;
}

const LampAuthLayout: React.FC<LampAuthLayoutProps> = ({ children }) => {
  const initialState = getSharedLampState();
  const [lampIsOn, setLampIsOn] = useState(initialState.isOn);
  const [lampState, setLampState] = useState(initialState.state);
  const [hasWebGL] = useState(checkWebGLSupport);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = subscribeLampState((newState, newIsOn) => {
      setLampState(newState);
      setLampIsOn(newIsOn);
    });
    return unsubscribe;
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
      {/* Contains strictly LifeSync AI branding & interactive lamp */}
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

        {/* 3D Lamp Scene Container: Mounts once and persists across route navigation */}
        <div className="lamp-visual-container">
          {hasWebGL ? (
            <LampSceneCanvas
              isOn={lampIsOn}
              onToggle={handleToggle}
              lampState={lampState}
            />
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
        </div>

        {/* Accessible screen-reader control */}
        <button
          type="button"
          onClick={handleToggle}
          className="lamp-sr-only-toggle"
          aria-pressed={lampIsOn}
          aria-label={`Toggle lamp illumination. Currently ${lampIsOn ? 'Illuminated' : 'Dark'}.`}
        >
          Toggle Lamp Illumination
        </button>
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
              {/* Only the inner form card animates during Login/Signup navigation */}
              <div key={location.pathname} className="lamp-card-content-transition">
                {children
                  ? children(isFormActive, lampState)
                  : <Outlet context={{ isFormActive, lampState, lampIsOn, toggleLamp: handleToggle }} />
                }
              </div>
            </fieldset>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LampAuthLayout;
