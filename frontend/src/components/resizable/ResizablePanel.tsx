import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { usePageLayout } from './usePageLayout';
import { useThemeSystem } from '../../context/ThemeContext';

export interface ResizablePanelProps {
  pageId: string;
  componentId: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  enableWidthResize?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  pageId,
  componentId,
  defaultHeight = 320,
  minHeight = 180,
  maxHeight = 900,
  defaultWidth,
  minWidth = 240,
  maxWidth = 1400,
  enableWidthResize = false,
  children,
  sx,
  className
}) => {
  const { getDimension, setDimension } = usePageLayout(pageId);
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const savedDim = getDimension(componentId, { height: defaultHeight, width: defaultWidth });

  const [height, setHeight] = useState<number>(savedDim?.height ?? defaultHeight);
  const [width, setWidth] = useState<number | undefined>(savedDim?.width ?? defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Sync with storage updates (e.g., when Reset Layout occurs)
  useEffect(() => {
    const currentSaved = getDimension(componentId, { height: defaultHeight, width: defaultWidth });
    setHeight(currentSaved?.height ?? defaultHeight);
    setWidth(currentSaved?.width ?? defaultWidth);
  }, [componentId, defaultHeight, defaultWidth, getDimension]);

  const dragStartRef = useRef<{ startY: number; startHeight: number; startX: number; startWidth: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const currentHeight = containerRef.current ? containerRef.current.offsetHeight : height;
    const currentWidth = containerRef.current ? containerRef.current.offsetWidth : (width ?? 300);

    dragStartRef.current = {
      startY: e.clientY,
      startHeight: currentHeight,
      startX: e.clientX,
      startWidth: currentWidth
    };

    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing || !dragStartRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const deltaY = e.clientY - dragStartRef.current.startY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, Math.round(dragStartRef.current.startHeight + deltaY)));
      setHeight(newHeight);

      if (enableWidthResize) {
        const deltaX = e.clientX - dragStartRef.current.startX;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, Math.round(dragStartRef.current.startWidth + deltaX)));
        setWidth(newWidth);
      }
    },
    [isResizing, minHeight, maxHeight, enableWidthResize, minWidth, maxWidth]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing) return;
      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }

      setIsResizing(false);
      dragStartRef.current = null;

      // Persist to user layout preferences
      setDimension(componentId, {
        height,
        ...(enableWidthResize && width ? { width } : {})
      });
    },
    [isResizing, componentId, height, width, enableWidthResize, setDimension]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let nextHeight = height;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextHeight = Math.max(minHeight, height - 20);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextHeight = Math.min(maxHeight, height + 20);
    }

    if (nextHeight !== height) {
      setHeight(nextHeight);
      setDimension(componentId, { height: nextHeight });
    }
  };

  return (
    <Box
      ref={containerRef}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
      sx={{
        position: 'relative',
        height: `${height}px`,
        width: width && enableWidthResize ? `${width}px` : '100%',
        transition: isResizing ? 'none' : 'height 0.15s ease-out',
        display: 'flex',
        flexDirection: 'column',
        outline: isResizing
          ? isProf
            ? '2px solid var(--accent-primary)'
            : '2px solid rgba(255, 111, 38, 0.6)'
          : 'none',
        borderRadius: isProf ? '0px' : '16px',
        ...sx
      }}
    >
      {/* Content wrapper with internal scroll overflow */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {children}
      </Box>

      {/* Resize Handle at Bottom-Right Corner */}
      <Box
        role="separator"
        aria-label={`Resize ${componentId}`}
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        sx={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: enableWidthResize ? 'nwse-resize' : 'ns-resize',
          zIndex: 10,
          opacity: isHovered || isResizing ? 0.9 : 0.25,
          transition: 'opacity 0.2s ease, transform 0.15s ease',
          transform: isHovered || isResizing ? 'scale(1.1)' : 'scale(1)',
          userSelect: 'none',
          touchAction: 'none',
          borderRadius: isProf ? 0 : '4px',
          bgcolor: isHovered || isResizing
            ? isDark
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.08)'
            : 'transparent',
          '&:focus-visible': {
            outline: '2px solid var(--accent-primary)',
            opacity: 1
          }
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none' }}>
          <circle cx="8" cy="2" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="4" cy="6" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="8" cy="6" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="2" cy="10" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="6" cy="10" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="10" cy="10" r="1.2" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
        </svg>
      </Box>
    </Box>
  );
};
