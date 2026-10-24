import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
  title?: string;
}

type ResizeDirection = 'corner' | 'bottom' | 'right';

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
  className,
  title
}) => {
  const { getDimension, setDimension, resetDimension } = usePageLayout(pageId);
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const savedDim = getDimension(componentId, { height: defaultHeight, width: defaultWidth });

  const [height, setHeight] = useState<number>(savedDim?.height ?? defaultHeight);
  const [width, setWidth] = useState<number | undefined>(savedDim?.width ?? defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [_activeDirection, setActiveDirection] = useState<ResizeDirection | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen to enforce full-width responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync state if stored dimensions change (e.g. page Reset Layout)
  useEffect(() => {
    const currentSaved = getDimension(componentId, { height: defaultHeight, width: defaultWidth });
    setHeight(currentSaved?.height ?? defaultHeight);
    setWidth(currentSaved?.width ?? defaultWidth);
  }, [componentId, defaultHeight, defaultWidth, getDimension]);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    direction: ResizeDirection;
  } | null>(null);

  const rafRef = useRef<number | null>(null);

  const isCustomized = height !== defaultHeight || (enableWidthResize && defaultWidth !== undefined && width !== defaultWidth);

  // Trigger chart re-renders smoothly
  const triggerChartResize = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, []);

  const handleResetSize = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      setHeight(defaultHeight);
      setWidth(defaultWidth);
      resetDimension(componentId);
      triggerChartResize();
    },
    [componentId, defaultHeight, defaultWidth, resetDimension, triggerChartResize]
  );

  // Global window listeners for reliable dragging
  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      e.preventDefault();

      const { startX, startY, startWidth, startHeight, direction } = dragStartRef.current;
      const deltaY = e.clientY - startY;
      const deltaX = e.clientX - startX;

      if (direction === 'bottom' || direction === 'corner') {
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, Math.round(startHeight + deltaY)));
        setHeight(nextHeight);
      }

      if (enableWidthResize && !isMobile && (direction === 'right' || direction === 'corner')) {
        const maxAllowedWidth = containerRef.current?.parentElement
          ? Math.min(maxWidth, containerRef.current.parentElement.clientWidth)
          : maxWidth;
        const nextWidth = Math.min(maxAllowedWidth, Math.max(minWidth, Math.round(startWidth + deltaX)));
        setWidth(nextWidth);
      }

      triggerChartResize();
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      setIsResizing(false);
      setActiveDirection(null);
      dragStartRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      // Persist dimensions
      setHeight((currentH) => {
        setWidth((currentW) => {
          setDimension(componentId, {
            height: currentH,
            ...(enableWidthResize && currentW && !isMobile ? { width: currentW } : {})
          });
          return currentW;
        });
        return currentH;
      });

      triggerChartResize();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isResizing, minHeight, maxHeight, minWidth, maxWidth, enableWidthResize, isMobile, componentId, setDimension, triggerChartResize]);

  const startResize = (e: React.PointerEvent<HTMLDivElement>, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();

    const currentHeight = containerRef.current ? containerRef.current.offsetHeight : height;
    const currentWidth = containerRef.current ? containerRef.current.offsetWidth : (width ?? 320);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      direction
    };

    document.body.style.userSelect = 'none';
    if (direction === 'corner') {
      document.body.style.cursor = enableWidthResize && !isMobile ? 'nwse-resize' : 'ns-resize';
    } else if (direction === 'bottom') {
      document.body.style.cursor = 'ns-resize';
    } else if (direction === 'right') {
      document.body.style.cursor = 'ew-resize';
    }

    setIsResizing(true);
    setActiveDirection(direction);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 50 : 20;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextH = Math.max(minHeight, height - step);
      setHeight(nextH);
      setDimension(componentId, { height: nextH, ...(width ? { width } : {}) });
      triggerChartResize();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextH = Math.min(maxHeight, height + step);
      setHeight(nextH);
      setDimension(componentId, { height: nextH, ...(width ? { width } : {}) });
      triggerChartResize();
    } else if (enableWidthResize && !isMobile && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const curW = width ?? (containerRef.current ? containerRef.current.offsetWidth : 400);
      const nextW = e.key === 'ArrowLeft'
        ? Math.max(minWidth, curW - step)
        : Math.min(maxWidth, curW + step);
      setWidth(nextW);
      setDimension(componentId, { height, width: nextW });
      triggerChartResize();
    } else if (e.key.toLowerCase() === 'r' || e.key === 'Home' || e.key === 'Escape') {
      e.preventDefault();
      handleResetSize();
    }
  };

  const effectiveWidth = enableWidthResize && !isMobile && width ? `${width}px` : '100%';

  return (
    <Box
      ref={containerRef}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
      sx={{
        position: 'relative',
        height: isMobile ? 'auto' : `${height}px`,
        width: effectiveWidth,
        maxWidth: '100%',
        transition: isResizing ? 'none' : 'height 0.15s ease-out, width 0.15s ease-out',
        display: 'flex',
        flexDirection: 'column',
        outline: isResizing
          ? isProf
            ? '2px solid var(--accent-primary)'
            : '2px solid rgba(255, 111, 38, 0.75)'
          : 'none',
        borderRadius: isProf ? '0px' : '18px',
        ...sx
      }}
    >
      {/* Content wrapper with pointer-events disabled during active drag to prevent accidental clicks */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          height: isMobile ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: isMobile ? 'visible' : 'hidden',
          pointerEvents: isResizing ? 'none' : 'auto'
        }}
      >
        {children}
      </Box>

      {/* Subtle Individual Reset Size Badge on top/bottom when customized (desktop only) */}
      {!isMobile && isCustomized && (isHovered || isResizing) && (
        <Tooltip title={`Reset ${title || componentId} size to default (or double click handle)`} arrow placement="top">
          <Box
            onClick={handleResetSize}
            sx={{
              position: 'absolute',
              bottom: 6,
              left: 10,
              zIndex: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: isProf ? 0 : '6px',
              bgcolor: isDark ? 'rgba(26, 29, 45, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              color: 'var(--accent-primary)',
              fontSize: '11px',
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'var(--accent-primary)',
                color: '#ffffff',
                borderColor: 'var(--accent-primary)'
              }
            }}
          >
            <RestartAltIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption" sx={{ fontSize: '10.5px', fontWeight: 700 }}>
              Reset Size
            </Typography>
          </Box>
        </Tooltip>
      )}

      {/* Desktop-only Resize Handles */}
      {!isMobile && (
        <>
          {/* Right Edge Handle (when width resize enabled) */}
          {enableWidthResize && (
            <Box
              role="separator"
              aria-label={`Resize width of ${title || componentId}`}
              onPointerDown={(e) => startResize(e, 'right')}
              sx={{
                position: 'absolute',
                top: 0,
                right: -3,
                width: 8,
                height: '100%',
                cursor: 'ew-resize',
                zIndex: 9,
                touchAction: 'none',
                '&:hover': {
                  bgcolor: isProf ? 'var(--accent-primary)' : 'rgba(255, 111, 38, 0.4)'
                }
              }}
            />
          )}

          {/* Bottom Edge Handle (height) */}
          <Box
            role="separator"
            aria-label={`Resize height of ${title || componentId}`}
            onPointerDown={(e) => startResize(e, 'bottom')}
            sx={{
              position: 'absolute',
              bottom: -3,
              left: 0,
              right: 24,
              height: 8,
              cursor: 'ns-resize',
              zIndex: 9,
              touchAction: 'none',
              '&:hover': {
                bgcolor: isProf ? 'var(--accent-primary)' : 'rgba(255, 111, 38, 0.3)'
              }
            }}
          />

          {/* Bottom-Right Corner Handle (2D / Corner) */}
          <Box
            role="separator"
            aria-label={`Resize ${title || componentId}`}
            aria-valuenow={height}
            aria-valuemin={minHeight}
            aria-valuemax={maxHeight}
            tabIndex={0}
            onPointerDown={(e) => startResize(e, 'corner')}
            onDoubleClick={handleResetSize}
            onKeyDown={handleKeyDown}
            title="Drag to resize card • Double-click to reset size • Arrow keys when focused"
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: enableWidthResize ? 'nwse-resize' : 'ns-resize',
              zIndex: 11,
              opacity: isHovered || isResizing ? 0.95 : 0.3,
              transition: 'opacity 0.2s ease, transform 0.15s ease',
              transform: isHovered || isResizing ? 'scale(1.1)' : 'scale(1)',
              userSelect: 'none',
              touchAction: 'none',
              borderRadius: isProf ? 0 : '6px',
              bgcolor: isHovered || isResizing
                ? isDark
                  ? 'rgba(255, 255, 255, 0.16)'
                  : 'rgba(0, 0, 0, 0.08)'
                : 'transparent',
          '&:focus-visible': {
            outline: '2px solid var(--accent-primary)',
            opacity: 1
          }
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: 'none' }}>
          <circle cx="10" cy="2" r="1.3" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="6" cy="6" r="1.3" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="10" cy="6" r="1.3" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="2" cy="10" r="1.3" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
          <circle cx="6" cy="10" r="1.3" fill={isProf ? 'var(--text-secondary)' : 'var(--accent-primary)'} />
        </svg>
      </Box>
        </>
      )}
    </Box>
  );
};

export default ResizablePanel;
