import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './SplashScreen.css';

export interface SplashScreenProps {
  /** Optional explicit progress percentage (0-100). When omitted, a smooth time-based visual progress indicator is calculated internally. */
  progress?: number;
  /** Optional custom status caption displayed during loading. Defaults to 'Initializing LifeSync AI...' */
  statusText?: string;
  /** Optional readiness signal from app initialization (e.g. auth check resolved). Defaults to true when autonomous. */
  isReady?: boolean;
  /** Optional callback fired when progress reaches 100% and 'Ready!' has been displayed. */
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  progress: externalProgress,
  statusText,
  isReady = true,
  onComplete,
}) => {
  // If external progress is provided, use it directly (controlled mode).
  // Otherwise, run a smooth time-based visual progress tied to the application initialization lifecycle.
  const isControlled = externalProgress !== undefined;
  const [internalProgress, setInternalProgress] = useState(0);
  const [isReadyText, setIsReadyText] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isReadyRef = useRef(isReady);
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // Respect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (isControlled) return;

    // In reduced motion mode, advance immediately or in a single clean step
    if (prefersReducedMotion) {
      if (isReady) {
        setInternalProgress(100);
        setIsReadyText(true);
        const timer = setTimeout(() => {
          onCompleteRef.current?.();
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setInternalProgress(50);
        return;
      }
    }

    let animationFrameId: number;
    let completeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime = performance.now();
    const BASE_DURATION = 1200; // ms for the visual progress timeline
    let hasCompleted = false;

    const animate = (currentTime: number) => {
      if (hasCompleted) return;

      const elapsed = currentTime - startTime;
      const readyNow = isReadyRef.current;

      let currentVal: number;

      if (!readyNow) {
        // While initialization is pending (e.g., auth check in-flight),
        // smoothly advance up to ~90% and gently creep towards ~94%.
        // Never stall artificially at 99%.
        if (elapsed < BASE_DURATION) {
          const ratio = elapsed / BASE_DURATION;
          currentVal = (1 - Math.pow(1 - ratio, 2)) * 90;
        } else {
          const extraRatio = Math.min(1, (elapsed - BASE_DURATION) / 2000);
          currentVal = 90 + extraRatio * 4;
        }
      } else {
        // Initialization ready:
        // Progress smoothly to 100% over the base window, or quickly sweep to 100% if base window has passed
        if (elapsed < BASE_DURATION) {
          const ratio = elapsed / BASE_DURATION;
          currentVal = (1 - Math.pow(1 - ratio, 2)) * 100;
        } else {
          currentVal = 100;
        }
      }

      const clampedVal = Math.min(100, Math.max(0, currentVal));
      setInternalProgress(clampedVal);

      if (clampedVal >= 99.8 && readyNow) {
        hasCompleted = true;
        setInternalProgress(100);
        setIsReadyText(true);
        completeTimeoutId = setTimeout(() => {
          onCompleteRef.current?.();
        }, 220); // Present 100% and "Ready!" clearly before dismissing
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (completeTimeoutId) clearTimeout(completeTimeoutId);
    };
  }, [isControlled, isReady, prefersReducedMotion]);

  // Derive display values
  const currentProgress = isControlled ? externalProgress! : internalProgress;
  const roundedProgress = Math.min(100, Math.max(0, Math.round(currentProgress)));
  const isDone = roundedProgress >= 100 || isReadyText;

  const currentStatus = isDone
    ? 'Ready!'
    : (statusText || 'Initializing LifeSync AI...');

  return (
    <div
      className="lifesync-splash-root"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
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

        {/* Clear Animated 0-100% Progress Bar with Numerical Percentage */}
        <div className="splash-progress-container">
          {/* Status Label (e.g. Initializing LifeSync AI... -> Ready!) */}
          <p
            className={`splash-status-label ${isDone ? 'is-ready' : ''}`}
            aria-live="polite"
          >
            {currentStatus}
          </p>

          <div className="splash-progress-row">
            <div
              className="splash-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={roundedProgress}
              aria-label="Initialization progress"
            >
              <div
                className="splash-progress-fill"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            <span className="splash-progress-percent" aria-hidden="true">
              {roundedProgress}%
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
