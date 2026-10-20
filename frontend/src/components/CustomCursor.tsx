import React, { useEffect, useRef, useState } from 'react';
import { useThemeSystem } from '../context/ThemeContext';

/**
 * CustomCursor — Modern 3D Magnetic Cursor
 *
 * Requirements:
 * 1. Active ONLY in Modern 3D mode. In Professional mode, returns null.
 * 2. Subtle, smooth magnetic attraction effect on eligible interactive elements
 *    (buttons, links, navigation items, interactive cards).
 * 3. Element translates subtly towards cursor on approach and returns smoothly on leave.
 * 4. Elegant magnetic cursor ring (no heartbeat, no heart icon, no duplicate cursor).
 * 5. Respects prefers-reduced-motion and touch devices (auto-disabled).
 * 6. Non-blocking (pointer-events: none), does not interfere with clicks, drags, or selection.
 * 7. Automatically hides over text inputs so native text cursors function cleanly.
 */
const CustomCursor: React.FC = () => {
  const { designSystem, mode } = useThemeSystem();
  const ringRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  const [isOverTextInput, setIsOverTextInput] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isModern = designSystem === 'modern3d';

  useEffect(() => {
    if (!isModern) {
      // Clean up any remaining magnetic transform if user switched to professional
      if (activeTargetRef.current) {
        activeTargetRef.current.style.transform = '';
        activeTargetRef.current = null;
      }
      return;
    }

    // Touch device detection: disable on touch-only devices
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const resetMagnet = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.transform = '';
      el.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)';
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if cursor is over a text input or editable field
      const isTextInput = !!target.closest(
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]'
      );
      setIsOverTextInput(isTextInput);

      // Check for eligible interactive magnetic target
      const interactiveEl = target.closest(
        'button, a, [role="button"], .MuiButton-root, .MuiIconButton-root, .MuiChip-root, .lifesync-nav-link, .interactive-magnetic'
      ) as HTMLElement | null;

      if (interactiveEl) {
        setIsHovering(true);

        // Apply subtle magnetic pull to the element
        const rect = interactiveEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (x - centerX) * 0.18;
        const deltaY = (y - centerY) * 0.18;

        interactiveEl.style.transform = `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0)`;
        interactiveEl.style.transition = 'transform 0.1s ease-out';

        if (activeTargetRef.current && activeTargetRef.current !== interactiveEl) {
          resetMagnet(activeTargetRef.current);
        }
        activeTargetRef.current = interactiveEl;
      } else {
        setIsHovering(false);
        if (activeTargetRef.current) {
          resetMagnet(activeTargetRef.current);
          activeTargetRef.current = null;
        }
      }
    };

    const onPointerDown = () => setIsClicking(true);
    const onPointerUp = () => setIsClicking(false);
    const onPointerLeave = () => {
      setIsVisible(false);
      if (activeTargetRef.current) {
        resetMagnet(activeTargetRef.current);
        activeTargetRef.current = null;
      }
    };
    const onPointerEnter = () => setIsVisible(true);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('mouseleave', onPointerLeave);
    document.addEventListener('mouseenter', onPointerEnter);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('mouseleave', onPointerLeave);
      document.removeEventListener('mouseenter', onPointerEnter);
      if (activeTargetRef.current) {
        resetMagnet(activeTargetRef.current);
        activeTargetRef.current = null;
      }
    };
  }, [isModern, isVisible]);

  // Professional mode retains native cursor with zero custom rendering
  if (!isModern) return null;

  const isDark = mode === 'dark';
  const showRing = isVisible && !isOverTextInput;

  return (
    <div
      ref={ringRef}
      className={`magnetic-cursor-ring ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''} ${isDark ? 'is-dark' : 'is-light'}`}
      style={{
        opacity: showRing ? 1 : 0,
      }}
      aria-hidden="true"
    />
  );
};

export default CustomCursor;
