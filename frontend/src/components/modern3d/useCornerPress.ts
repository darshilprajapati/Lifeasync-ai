import React, { useState, useCallback } from 'react';
import { useThemeSystem } from '../../context/ThemeContext';

export interface UseCornerPressOptions {
  /** Maximum tilt rotation in degrees. Default 4.5. Bounded for subtle ergonomics. */
  maxTilt?: number;
  /** Perspective distance in px. Default 800. */
  perspective?: number;
  /** translateZ depth on hover in px. Default 5. */
  translateZ?: number;
  /** Whether to depress surface on pointer down. Default true. */
  enablePress?: boolean;
  /** Whether effect is disabled. Default false. */
  disabled?: boolean;
}

export interface CornerPressReturn {
  isHovered: boolean;
  isPressed: boolean;
  transform: string;
  refractionPos: { x: number; y: number; opacity: number };
  isDark: boolean;
  isProf: boolean;
  handlers: {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onPointerDown: () => void;
    onPointerUp: () => void;
  };
}

/**
 * useCornerPress
 * Shared hook providing pointer-aware 3D perspective and corner-press response.
 * - When cursor hovers near a corner, that corner subtly tilts inward.
 * - Dynamic refraction highlight moves relative to pointer position.
 * - In Professional mode, touch-only devices, or prefers-reduced-motion, returns 'none'.
 */
export function useCornerPress(options: UseCornerPressOptions = {}): CornerPressReturn {
  const {
    maxTilt = 4.5,
    perspective = 800,
    translateZ = 5,
    enablePress = true,
    disabled = false,
  } = options;

  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const [transform, setTransform] = useState<string>('perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [refractionPos, setRefractionPos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (isProf || disabled) return;
      if (typeof window !== 'undefined') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;
      }

      const el = e.currentTarget;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // -1 to 1 relative to center
      const percentX = Math.max(-1, Math.min(1, (x - centerX) / (centerX || 1)));
      const percentY = Math.max(-1, Math.min(1, (y - centerY) / (centerY || 1)));

      // Corner press physics:
      // When cursor is top-left (percentX < 0, percentY < 0):
      // rotX > 0 tilts top backward (inward); rotY < 0 tilts left backward (inward).
      const rotX = -percentY * maxTilt;
      const rotY = percentX * maxTilt;
      const tz = isPressed ? 1 : translateZ;
      const scale = isPressed ? 0.985 : 1.0;

      setTransform(
        `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(${tz}px) scale(${scale})`
      );
      setRefractionPos({
        x: (x / (rect.width || 1)) * 100,
        y: (y / (rect.height || 1)) * 100,
        opacity: 0.65,
      });
    },
    [isProf, disabled, maxTilt, perspective, translateZ, isPressed]
  );

  const handlePointerEnter = useCallback(() => {
    if (isProf || disabled) return;
    setIsHovered(true);
  }, [isProf, disabled]);

  const handlePointerLeave = useCallback(() => {
    if (isProf || disabled) return;
    setIsHovered(false);
    setIsPressed(false);
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)`);
    setRefractionPos((p) => ({ ...p, opacity: 0 }));
  }, [isProf, disabled, perspective]);

  const handlePointerDown = useCallback(() => {
    if (isProf || disabled || !enablePress) return;
    setIsPressed(true);
  }, [isProf, disabled, enablePress]);

  const handlePointerUp = useCallback(() => {
    if (isProf || disabled || !enablePress) return;
    setIsPressed(false);
  }, [isProf, disabled, enablePress]);

  return {
    isHovered,
    isPressed,
    transform: isProf || disabled ? 'none' : transform,
    refractionPos,
    isDark,
    isProf,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
    },
  };
}
