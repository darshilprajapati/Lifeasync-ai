import React, { useRef, useState, useCallback } from 'react';
import { Card, type CardProps } from '@mui/material';
import { useThemeSystem, type DesignSystem, type ThemeMode } from '../../context/ThemeContext';

export interface TiltCardProps extends CardProps {
  /** Maximum tilt rotation in degrees. Default 4.5. Bounded for subtle ergonomics. */
  maxTilt?: number;
  /** Whether to show subtle holographic edge refraction highlight on hover. Default true. */
  enableRefraction?: boolean;
  /** Optional design system override (e.g. for Profile preview) */
  overrideDesignSystem?: DesignSystem;
  /** Optional theme mode override (e.g. for Profile preview) */
  overrideMode?: ThemeMode;
  children: React.ReactNode;
}

/**
 * TiltCard
 * Sections 7 & 8:
 * - Subtle 3D tilt with depth in Modern 3D mode.
 * - Consistent perspective, max 4-5 deg rotation, smooth return on pointer leave.
 * - Holographic refraction highlight reacting to pointer position.
 * - Falls back to standard sharp 0px flat Card in Professional mode.
 * - Respects prefers-reduced-motion and touch devices.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  maxTilt = 4.5,
  enableRefraction = true,
  overrideDesignSystem,
  overrideMode,
  children,
  sx,
  ...rest
}) => {
  const { designSystem, mode } = useThemeSystem();
  const effectiveDesignSystem = overrideDesignSystem || designSystem;
  const effectiveMode = overrideMode || mode;
  const isProf = effectiveDesignSystem === 'professional';
  const isDark = effectiveMode === 'dark';

  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  const [refractionPos, setRefractionPos] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isProf) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX; // -1 to 1
    const percentY = (y - centerY) / centerY; // -1 to 1

    const rotX = -percentY * maxTilt;
    const rotY = percentX * maxTilt;

    setTransformStyle(`perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(6px)`);
    setRefractionPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.65
    });
  }, [isProf, maxTilt]);

  const handlePointerEnter = useCallback(() => {
    if (isProf) return;
    setIsHovered(true);
  }, [isProf]);

  const handlePointerLeave = useCallback(() => {
    if (isProf) return;
    setIsHovered(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setRefractionPos((prev) => ({ ...prev, opacity: 0 }));
  }, [isProf]);

  if (isProf) {
    return (
      <Card
        ref={cardRef}
        sx={{
          borderRadius: '0px !important',
          bgcolor: 'var(--card-bg)',
          border: '1px solid var(--card-border) !important',
          boxShadow: 'none !important',
          backgroundImage: 'none !important',
          backdropFilter: 'none !important',
          WebkitBackdropFilter: 'none !important',
          transform: 'none !important',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
          ...sx
        }}
        {...rest}
      >
        {children}
      </Card>
    );
  }

  // Modern 3D Dimensional Card
  return (
    <Card
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      sx={{
        borderRadius: '18px',
        bgcolor: isDark ? 'rgba(16, 22, 36, 0.72)' : 'rgba(255, 255, 255, 0.76)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(255, 255, 255, 0.75)',
        boxShadow: isDark
          ? (isHovered ? '0 16px 36px -6px rgba(0, 0, 0, 0.65), 0 0 24px rgba(255, 111, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)' : '0 10px 28px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)')
          : (isHovered ? '0 16px 36px -6px rgba(232, 90, 79, 0.22), 0 4px 14px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)' : '0 8px 28px -4px rgba(142, 141, 138, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.9)'),
        backdropFilter: 'blur(16px)',
        position: 'relative',
        transform: transformStyle,
        transformStyle: 'preserve-3d',
        transition: isHovered
          ? 'transform 0.08s ease-out, box-shadow 0.25s ease'
          : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
        willChange: 'transform',
        overflow: 'hidden',
        ...sx
      }}
      {...rest}
    >
      {/* Holographic Refraction Layer */}
      {enableRefraction && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            opacity: refractionPos.opacity,
            transition: 'opacity 0.25s ease',
            background: isDark
              ? `radial-gradient(circle 280px at ${refractionPos.x}% ${refractionPos.y}%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 111, 38, 0.1) 30%, rgba(56, 189, 248, 0.06) 60%, transparent 80%)`
              : `radial-gradient(circle 280px at ${refractionPos.x}% ${refractionPos.y}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 111, 38, 0.12) 35%, rgba(74, 144, 226, 0.08) 65%, transparent 80%)`
          }}
        />
      )}

      {/* Card Content (isolated from refraction overlay) */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </Card>
  );
};

export default TiltCard;
