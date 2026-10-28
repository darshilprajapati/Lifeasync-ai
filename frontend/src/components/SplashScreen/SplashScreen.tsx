import React, { useEffect, useRef, useState } from 'react';
import './SplashScreen.css';

export interface SplashScreenProps {
  /** Optional callback fired when the logo transition finishes and the splash overlay unmounts. */
  onComplete?: () => void;
  /** Optional freeze flag for visual inspection of Stage A. */
  isFrozen?: boolean;
}

interface TransitionCoords {
  avatarDx: number;
  avatarDy: number;
  avatarScale: number;
  titlesDx: number;
  titlesDy: number;
  titlesScale: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isFrozen = false,
}) => {
  const [stage, setStage] = useState<'stageA' | 'stageB' | 'stageC'>('stageA');
  const [coords, setCoords] = useState<TransitionCoords | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const avatarRef = useRef<HTMLDivElement>(null);
  const titlesRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (isFrozen) return;

    const STAGE_A_MS = prefersReducedMotion ? 400 : 1800;
    const STAGE_B_MS = prefersReducedMotion ? 250 : 850;

    let stageBTimer: ReturnType<typeof setTimeout>;
    let completeTimer: ReturnType<typeof setTimeout>;

    stageBTimer = setTimeout(() => {
      // Stage A ended, calculate target navbar geometry
      if (!prefersReducedMotion) {
        const targetAvatar = document.querySelector('.lamp-brand-avatar-frame') as HTMLElement | null;
        const targetTitles = document.querySelector('.lamp-brand-titles') as HTMLElement | null;

        const splashAvatar = avatarRef.current;
        const splashTitles = titlesRef.current;

        if (targetAvatar && targetTitles && splashAvatar && splashTitles) {
          const navAvatarRect = targetAvatar.getBoundingClientRect();
          const navTitlesRect = targetTitles.getBoundingClientRect();

          const splashAvatarRect = splashAvatar.getBoundingClientRect();
          const splashTitlesRect = splashTitles.getBoundingClientRect();

          // Centers of avatar circles
          const startAvatarCX = splashAvatarRect.left + splashAvatarRect.width / 2;
          const startAvatarCY = splashAvatarRect.top + splashAvatarRect.height / 2;
          const targetAvatarCX = navAvatarRect.left + navAvatarRect.width / 2;
          const targetAvatarCY = navAvatarRect.top + navAvatarRect.height / 2;

          const avatarDx = targetAvatarCX - startAvatarCX;
          const avatarDy = targetAvatarCY - startAvatarCY;
          const avatarScale = navAvatarRect.width / splashAvatarRect.width;

          // Centers of titles group
          const startTitlesCX = splashTitlesRect.left + splashTitlesRect.width / 2;
          const startTitlesCY = splashTitlesRect.top + splashTitlesRect.height / 2;
          const targetTitlesCX = navTitlesRect.left + navTitlesRect.width / 2;
          const targetTitlesCY = navTitlesRect.top + navTitlesRect.height / 2;

          const titlesDx = targetTitlesCX - startTitlesCX;
          const titlesDy = targetTitlesCY - startTitlesCY;
          const titlesScale = navTitlesRect.height / splashTitlesRect.height;

          setCoords({
            avatarDx,
            avatarDy,
            avatarScale,
            titlesDx,
            titlesDy,
            titlesScale,
          });
        }
      }

      setStage('stageB');

      completeTimer = setTimeout(() => {
        setStage('stageC');
        onCompleteRef.current?.();
      }, STAGE_B_MS);
    }, STAGE_A_MS);

    return () => {
      clearTimeout(stageBTimer);
      clearTimeout(completeTimer);
    };
  }, [isFrozen, prefersReducedMotion]);

  const isAnimating = stage === 'stageB';
  const isDone = stage === 'stageC';

  // Dynamic transform styles when animating
  const avatarStyle: React.CSSProperties =
    isAnimating && coords
      ? {
          transform: `translate3d(${coords.avatarDx}px, ${coords.avatarDy}px, 0) scale(${coords.avatarScale})`,
        }
      : {};

  const titlesStyle: React.CSSProperties =
    isAnimating && coords
      ? {
          transform: `translate3d(${coords.titlesDx}px, ${coords.titlesDy}px, 0) scale(${coords.titlesScale})`,
        }
      : {};

  // If there are no navbar targets (e.g. authenticated dashboard view), fade out the whole container
  const containerFallbackStyle: React.CSSProperties =
    isAnimating && !coords
      ? {
          opacity: 0,
          transform: 'scale(1.02)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }
      : {};

  if (isDone) {
    return null;
  }

  return (
    <div
      className={`lifesync-splash-root ${isAnimating ? 'splash-stage-animating' : 'splash-stage-initial'}`}
      role="region"
      aria-label="LifeSync AI Splash Screen"
    >
      {/* Background Atmosphere Layer (Fades to 0 in Stage B to reveal Login Page / 3D Lamp without flash) */}
      <div className="splash-backdrop-container" aria-hidden="true">
        <div className="splash-background-layer" />
        <div className="splash-light-beams" />

        {/* Floating Ambient Light Motes */}
        <div className="splash-ambient-motes">
          <span className="splash-mote mote-1" />
          <span className="splash-mote mote-2" />
          <span className="splash-mote mote-3" />
          <span className="splash-mote mote-4" />
          <span className="splash-mote mote-5" />
        </div>

        {/* Radiant Flowing Floor Glow Waves */}
        <div className="splash-waves-container">
          <svg
            className="splash-waves-svg"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="splashCoralGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFA043" stopOpacity="0.1" />
                <stop offset="35%" stopColor="#FF5E4D" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#FF2E63" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFA043" stopOpacity="0.1" />
              </linearGradient>

              <linearGradient id="splashMagentaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.05" />
                <stop offset="45%" stopColor="#E040FB" stopOpacity="0.5" />
                <stop offset="75%" stopColor="#FF5E4D" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.05" />
              </linearGradient>

              <linearGradient id="splashCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
                <stop offset="50%" stopColor="#7C4DFF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.05" />
              </linearGradient>

              <filter id="splashGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <path
              d="M 0,270 C 380,240 720,290 1080,250 C 1260,230 1380,260 1440,265"
              stroke="url(#splashCyanGrad)"
              strokeWidth="2.5"
              className="splash-wave splash-wave-bg"
            />
            <path
              d="M 0,250 C 320,280 640,220 960,270 C 1200,310 1350,240 1440,250"
              stroke="url(#splashMagentaGrad)"
              strokeWidth="3"
              filter="url(#splashGlow)"
              className="splash-wave splash-wave-mid"
            />
            <path
              d="M 0,260 C 360,220 720,280 1080,230 C 1240,210 1360,250 1440,245"
              stroke="url(#splashCoralGrad)"
              strokeWidth="3.5"
              filter="url(#splashGlow)"
              className="splash-wave splash-wave-fore"
            />
          </svg>
        </div>
      </div>

      {/* Central Brand Container (Animates and travels to navbar in Stage B) */}
      <div
        className="splash-content-container"
        style={containerFallbackStyle}
      >
        {/* Glowing Logo Emblem */}
        <div className="splash-logo-wrapper">
          <div className="splash-logo-halo" aria-hidden="true" />
          <div
            ref={avatarRef}
            className="splash-logo-circle"
            style={avatarStyle}
          >
            <img
              src="/logo.jpg"
              alt="LifeSync AI emblem"
              className="splash-logo-image"
              width={120}
              height={120}
            />
          </div>
        </div>

        {/* Brand Application Title & Tagline Group */}
        <div
          ref={titlesRef}
          className="splash-brand-titles-group"
          style={titlesStyle}
        >
          <h1 className="splash-brand-title">
            <span className="splash-title-life">LIFESYNC</span>
            <span className="splash-title-ai">AI</span>
          </h1>

          <p className="splash-tagline">Harmonize Health, Work &amp; Life</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
