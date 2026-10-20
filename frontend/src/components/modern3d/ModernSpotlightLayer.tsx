import React, { useEffect, useRef } from 'react';
import { useThemeSystem } from '../../context/ThemeContext';

/**
 * ModernSpotlightLayer — True Application-Wide Spotlight Reveal Mask
 * Reference: https://cursify.ui-layouts.com/components/spotlight-cursor
 *
 * Implements the exact Cursify Spotlight Cursor effect:
 * 1. Active ONLY in Modern 3D + Dark (Night) mode. In Modern Light & Professional modes, returns null.
 * 2. Everything in the application is almost completely hidden outside the spotlight (approx 0–3% visibility).
 * 3. Inside the spotlight, reveals the REAL underlying UI at 100% normal brightness and contrast.
 * 4. Broad, soft-edged, smoothly moving radial spotlight (420px radius / 840px diameter) with seamless falloff.
 * 5. Positioned as a fixed viewport overlay with pointer-events: none (zero interference with clicks, inputs, selection, scrolling).
 * 6. Uses lerp interpolation for silky smooth movement without coordinate jumps on scroll or route changes.
 * 7. Zero decorative grids, zero sparkling rings, zero orange blobs.
 */
export const ModernSpotlightLayer: React.FC = () => {
  const { designSystem, mode } = useThemeSystem();
  const isModernDark = designSystem === 'modern3d' && mode === 'dark';
  const overlayRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!isModernDark) return;

    // Accessibility & touch checks
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    let isVisible = true;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      isVisible = true;
    };

    const handlePointerLeave = () => {
      isVisible = false;
      targetX = -2000;
      targetY = -2000;
    };

    const animate = () => {
      // Fluid lerp tracking
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      const xPx = `${Math.round(currentX)}px`;
      const yPx = `${Math.round(currentY)}px`;

      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--spot-x', xPx);
        overlayRef.current.style.setProperty('--spot-y', yPx);
      }
      if (haloRef.current) {
        haloRef.current.style.setProperty('--spot-x', xPx);
        haloRef.current.style.setProperty('--spot-y', yPx);
        haloRef.current.style.opacity = isVisible ? '1' : '0';
      }

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave, { passive: true });
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isModernDark]);

  if (!isModernDark) return null;

  return (
    <>
      {/* 1. True Spotlight Visibility Mask Overlay:
          Outside the spotlight, the overlay is dimmed to ~67% darkness, leaving approximately
          30–35% of the underlying UI's normal appearance visible and readable.
          Inside the spotlight (center 0-160px), the REAL application UI shines through at 100% normal brightness! */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 900, // Sits over the application content but behind permanent logo (1100) and modals (1300)
          backgroundColor: '#07090F',
          opacity: 0.67, // Target: 30–35% visibility of underlying UI outside spotlight
          WebkitMaskImage: `radial-gradient(
            circle 440px at var(--spot-x, 50vw) var(--spot-y, 50vh),
            transparent 0%,
            transparent 160px,
            rgba(0, 0, 0, 0.22) 230px,
            rgba(0, 0, 0, 0.55) 320px,
            rgba(0, 0, 0, 0.88) 390px,
            black 440px
          )`,
          maskImage: `radial-gradient(
            circle 440px at var(--spot-x, 50vw) var(--spot-y, 50vh),
            transparent 0%,
            transparent 160px,
            rgba(0, 0, 0, 0.22) 230px,
            rgba(0, 0, 0, 0.55) 320px,
            rgba(0, 0, 0, 0.88) 390px,
            black 440px
          )`,
          transition: 'opacity 0.25s ease'
        }}
      />

      {/* 2. Delicate Cinematic Illumination Aura (Screen Blend):
          Soft subtle light accent across the revealed elements without obscuring them or adding orange shadow */}
      <div
        ref={haloRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 901,
          mixBlendMode: 'screen',
          background: `radial-gradient(
            circle 440px at var(--spot-x, 50vw) var(--spot-y, 50vh),
            rgba(255, 111, 38, 0.05) 0%,
            rgba(56, 189, 248, 0.03) 40%,
            transparent 70%
          )`,
          transition: 'opacity 0.25s ease'
        }}
      />
    </>
  );
};

