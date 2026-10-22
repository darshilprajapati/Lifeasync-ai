import React, { forwardRef } from 'react';
import { Card, type CardProps } from '@mui/material';
import { useThemeSystem, type DesignSystem, type ThemeMode } from '../../context/ThemeContext';
import { useCornerPress } from './useCornerPress';

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
 * - Subtle 3D tilt with depth and corner-press in Modern 3D mode.
 * - Consistent perspective, max 4.5 deg rotation, smooth return on pointer leave.
 * - Holographic refraction highlight reacting to pointer position.
 * - Falls back to standard sharp 0px flat Card in Professional mode.
 * - Respects prefers-reduced-motion and touch devices.
 */
export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      maxTilt = 4.5,
      enableRefraction = true,
      overrideDesignSystem,
      overrideMode,
      children,
      sx,
      onPointerMove,
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      ...rest
    },
    ref
  ) => {
    const { designSystem, mode } = useThemeSystem();
    const effectiveDesignSystem = overrideDesignSystem || designSystem;
    const effectiveMode = overrideMode || mode;
    const isProf = effectiveDesignSystem === 'professional';
    const isDark = effectiveMode === 'dark';

    const { isHovered, transform, refractionPos, handlers } = useCornerPress({
      maxTilt,
      perspective: 1000,
      translateZ: 6,
      disabled: isProf,
    });

    if (isProf) {
      return (
        <Card
          ref={ref}
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
            ...sx,
          }}
          onPointerMove={onPointerMove}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          {...rest}
        >
          {children}
        </Card>
      );
    }

    // Modern 3D Dimensional Card
    return (
      <Card
        ref={ref}
        onPointerMove={(e) => {
          handlers.onPointerMove(e);
          onPointerMove?.(e);
        }}
        onPointerEnter={(e) => {
          handlers.onPointerEnter();
          onPointerEnter?.(e);
        }}
        onPointerLeave={(e) => {
          handlers.onPointerLeave();
          onPointerLeave?.(e);
        }}
        onPointerDown={(e) => {
          handlers.onPointerDown();
          onPointerDown?.(e);
        }}
        onPointerUp={(e) => {
          handlers.onPointerUp();
          onPointerUp?.(e);
        }}
        sx={{
          borderRadius: '18px',
          bgcolor: isDark ? 'rgba(16, 22, 36, 0.72)' : 'rgba(255, 255, 255, 0.76)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(255, 255, 255, 0.75)',
          boxShadow: isDark
            ? isHovered
              ? '0 16px 36px -6px rgba(0, 0, 0, 0.65), 0 0 24px rgba(255, 111, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
              : '0 10px 28px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
            : isHovered
            ? '0 16px 36px -6px rgba(232, 90, 79, 0.22), 0 4px 14px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)'
            : '0 8px 28px -4px rgba(142, 141, 138, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          position: 'relative',
          transform: transform,
          transformStyle: 'preserve-3d',
          transition: isHovered
            ? 'transform 0.08s ease-out, box-shadow 0.25s ease'
            : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
          willChange: 'transform',
          overflow: 'hidden',
          ...sx,
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
                : `radial-gradient(circle 280px at ${refractionPos.x}% ${refractionPos.y}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 111, 38, 0.12) 35%, rgba(74, 144, 226, 0.08) 65%, transparent 80%)`,
            }}
          />
        )}

        {/* Card Content (isolated from refraction overlay) */}
        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </Card>
    );
  }
);

TiltCard.displayName = 'TiltCard';
export default TiltCard;
