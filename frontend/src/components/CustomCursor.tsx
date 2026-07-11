import React, { useEffect, useState } from 'react';

/**
 * CustomCursor - Premium minimal magnetic custom cursor.
 * Features:
 * - Center dot (6px)
 * - Thin outer ring (32px) following with smooth lag transition
 * - Hover state: Ring scales up, dot scales up
 * - Click state: Ring scales down
 * - Touch device safety (auto-hidden)
 */
const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (hidden) setHidden(false);
    };

    const handleMouseLeave = () => {
      setHidden(true);
    };

    const handleMouseEnter = () => {
      setHidden(false);
    };

    const handleMouseDown = () => {
      document.body.classList.add('cursor-clicking');
    };

    const handleMouseUp = () => {
      document.body.classList.remove('cursor-clicking');
    };

    // Handlers for hover behaviors on interactive elements
    const addHoverClass = () => document.body.classList.add('cursor-hovering');
    const removeHoverClass = () => document.body.classList.remove('cursor-hovering');

    const updateHoverListeners = () => {
      const interactiveElements = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], .interactive-hover'
      );
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', addHoverClass);
        el.removeEventListener('mouseleave', removeHoverClass);
        el.addEventListener('mouseenter', addHoverClass);
        el.addEventListener('mouseleave', removeHoverClass);
      });
    };

    // Observe DOM changes to re-apply hover listeners on newly rendered elements
    const observer = new MutationObserver(updateHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Initial setup
    updateHoverListeners();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      observer.disconnect();

      // Clean up hover listeners from all interactive elements
      const interactiveElements = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], .interactive-hover'
      );
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', addHoverClass);
        el.removeEventListener('mouseleave', removeHoverClass);
      });
      document.body.classList.remove('cursor-hovering', 'cursor-clicking');
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <>
      {/* 1. Thin Outer Ring */}
      <div
        className="custom-cursor-ring"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />

      {/* 2. Center Dot */}
      <div
        className="custom-cursor-dot"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />
    </>
  );
};

export default CustomCursor;
