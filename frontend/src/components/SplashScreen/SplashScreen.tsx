import React from 'react';
import { motion } from 'framer-motion';
import './SplashScreen.css';

interface SplashScreenProps {
  /** Optional explicit progress percentage (0-100). If omitted, an indeterminate progress bar is displayed. */
  progress?: number;
  /** Optional custom status caption displayed underneath the progress bar. */
  statusText?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  progress,
  statusText,
}) => {
  const isIndeterminate = progress === undefined;

  return (
    <div
      className="lifesync-splash-root"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress !== undefined ? Math.round(progress) : undefined}
      aria-label="LifeSync AI is loading"
    >
      {/* Background Room Atmosphere with Soft Vertical Light Beams */}
      <div className="splash-background-layer" aria-hidden="true" />
      <div className="splash-light-beams" aria-hidden="true" />

      {/* Floating Ambient Light Motes */}
      <div className="splash-ambient-motes" aria-hidden="true">
        <span className="splash-mote mote-1" />
        <span className="splash-mote mote-2" />
        <span className="splash-mote mote-3" />
        <span className="splash-mote mote-4" />
        <span className="splash-mote mote-5" />
      </div>

      {/* Flowing Floor Glow Waves (SVGs with radiant glowing coral/magenta/cyan paths) */}
      <div className="splash-waves-container" aria-hidden="true">
        <svg
          className="splash-waves-svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            {/* Primary Coral-Orange Neon Glow Gradient */}
            <linearGradient id="splashCoralGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFA043" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#FF5E4D" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#FF2E63" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFA043" stopOpacity="0.1" />
            </linearGradient>

            {/* Accent Magenta Glow Gradient */}
            <linearGradient id="splashMagentaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.05" />
              <stop offset="45%" stopColor="#E040FB" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#FF5E4D" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.05" />
            </linearGradient>

            {/* Subtle Cyan / Blue Ambient Gradient */}
            <linearGradient id="splashCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#7C4DFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="splashGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Soft Wave 3 (Cyan/Blue) */}
          <path
            d="M 0,270 C 380,240 720,290 1080,250 C 1260,230 1380,260 1440,265"
            stroke="url(#splashCyanGrad)"
            strokeWidth="2.5"
            className="splash-wave splash-wave-bg"
          />

          {/* Middle Wave 2 (Magenta/Pink) */}
          <path
            d="M 0,250 C 320,280 640,220 960,270 C 1200,310 1350,240 1440,250"
            stroke="url(#splashMagentaGrad)"
            strokeWidth="3"
            filter="url(#splashGlow)"
            className="splash-wave splash-wave-mid"
          />

          {/* Foreground Primary Wave 1 (Coral-Orange) */}
          <path
            d="M 0,260 C 360,220 720,280 1080,230 C 1240,210 1360,250 1440,245"
            stroke="url(#splashCoralGrad)"
            strokeWidth="3.5"
            filter="url(#splashGlow)"
            className="splash-wave splash-wave-fore"
          />
        </svg>
      </div>

      {/* Central Brand & Loading Container */}
      <motion.div
        className="splash-content-container"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Glowing Logo Emblem */}
        <div className="splash-logo-wrapper">
          <div className="splash-logo-halo" aria-hidden="true" />
          <div className="splash-logo-circle">
            <img
              src="/logo.jpg"
              alt="LifeSync AI emblem"
              className="splash-logo-image"
              width={120}
              height={120}
            />
          </div>
        </div>

        {/* Brand Application Title */}
        <h1 className="splash-brand-title">
          <span className="splash-title-life">LIFESYNC</span>
          <span className="splash-title-ai">AI</span>
        </h1>

        {/* Official Tagline */}
        <p className="splash-tagline">Harmonize Health, Work &amp; Life</p>

        {/* Slim Animated Progress Indicator */}
        <div className="splash-progress-container">
          <div
            className={`splash-progress-track ${isIndeterminate ? 'is-indeterminate' : ''}`}
            aria-hidden="true"
          >
            <div
              className={`splash-progress-fill ${isIndeterminate ? 'fill-indeterminate' : ''}`}
              style={
                !isIndeterminate && progress !== undefined
                  ? { width: `${Math.min(100, Math.max(0, progress))}%` }
                  : undefined
              }
            />
          </div>

          {/* Status / Percentage Label */}
          <p className="splash-status-label">
            {progress !== undefined
              ? `Loading... ${Math.round(progress)}%`
              : statusText || 'Initializing...'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
