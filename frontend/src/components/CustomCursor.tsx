import React, { useEffect, useRef, useState } from 'react';
import { useThemeSystem } from '../context/ThemeContext';

/**
 * CustomCursor — Modern 3D Heartbeat Cursor
 *
 * Implements:
 * 1. Active ONLY in Modern 3D mode. In Professional mode, returns null (native cursor preserved).
 * 2. Clean, recognizable heart-shaped pointer with LifeSync coral/orange accent color.
 * 3. Natural heartbeat pulse animation inspired by an ECG heart monitor rhythm (lub-dub pulse followed by calm rest).
 * 4. Responsive pulse boost when hovering over interactive elements (buttons, links, triggers).
 * 5. Direct zero-lag pointer tracking updating in real-time on pointermove (no trailing offset or latency).
 * 6. Non-blocking (pointer-events: none), does not interfere with clicks, drags, or selection.
 * 7. Automatically hides over text inputs, textareas, and drag handles so native text/grab cursors function without clutter.
 * 8. Graceful fallback on touch devices and respects prefers-reduced-motion.
 */
const CustomCursor: React.FC = () => {
  const { designSystem, mode } = useThemeSystem();
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isOverNativeControl, setIsOverNativeControl] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isModern = designSystem === 'modern3d';

  useEffect(() => {
    if (!isModern) return;

    // Touch device detection: disable custom cursor on touch-only devices
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      // Direct transform update: instantaneous tracking with zero latency and zero offset
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        // Check if cursor is over a text input, textarea, select, contenteditable, or drag handle
        const isTextInput = !!target.closest(
          'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]'
        );
        const isDragControl = !!target.closest('.drag-handle, [data-draggable="true"], .resize-handle');
        setIsOverNativeControl(isTextInput || isDragControl);

        // Check if cursor is over an interactive button/link/action
        const interactiveEl = target.closest(
          'button, a, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], .interactive-hover'
        );
        setIsHovering(!!interactiveEl);
      }
    };

    const onPointerDown = () => setIsClicking(true);
    const onPointerUp = () => setIsClicking(false);
    const onPointerLeave = () => setIsVisible(false);
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
    };
  }, [isModern, isVisible]);

  // Professional mode retains native cursor completely
  if (!isModern) return null;

  const isDark = mode === 'dark';
  const showCursor = isVisible && !isOverNativeControl;

  return (
    <div
      ref={cursorRef}
      className={`heartbeat-cursor-container ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''} ${isDark ? 'is-dark' : 'is-light'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: showCursor ? 1 : 0,
        transition: 'opacity 0.12s ease',
        willChange: 'transform'
      }}
      aria-hidden="true"
    >
      <div className="heartbeat-cursor-inner">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>
    </div>
  );
};

export default CustomCursor;
