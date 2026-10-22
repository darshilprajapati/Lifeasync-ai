import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { useThemeSystem } from '../../context/ThemeContext';
import { useCornerPress } from './useCornerPress';

export interface IconSlideButtonProps extends ButtonProps {
  slideDirection?: 'right' | 'left' | 'up';
}

/**
 * IconSlideButton
 * Section 9: Modern 3D Icon Slide Buttons with tactile corner-press depth.
 * - Displays button icon and label in normal position.
 * - On hover, animates icon with a controlled slide and transitions depth/edge highlight.
 * - Subtle corner-press responsive to cursor position.
 * - In Professional mode, renders sharp 0px corners, flat background, no slide.
 * - Preserves original onClick, disabled, loading, tooltips, and accessibility.
 */
export const IconSlideButton: React.FC<IconSlideButtonProps> = ({
  children,
  startIcon,
  endIcon,
  slideDirection = 'right',
  sx,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  disabled,
  ...rest
}) => {
  const { designSystem } = useThemeSystem();
  const isProf = designSystem === 'professional';

  const { transform, handlers } = useCornerPress({
    maxTilt: 3.5,
    perspective: 600,
    translateZ: 3,
    disabled: isProf || disabled,
  });

  if (isProf) {
    return (
      <Button
        startIcon={startIcon}
        endIcon={endIcon}
        disabled={disabled}
        sx={{
          borderRadius: '0px !important',
          boxShadow: 'none !important',
          textTransform: 'none',
          fontWeight: 650,
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease !important',
          transform: 'none !important',
          '&:hover': {
            boxShadow: 'none !important',
            transform: 'none !important',
          },
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
      </Button>
    );
  }

  // Modern 3D Icon Slide
  const slideTranslate =
    slideDirection === 'right'
      ? 'translateX(4px)'
      : slideDirection === 'left'
      ? 'translateX(-4px)'
      : 'translateY(-3px)';

  return (
    <Button
      disabled={disabled}
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
      startIcon={
        startIcon ? (
          <span
            className="icon-slide-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {startIcon}
          </span>
        ) : undefined
      }
      endIcon={
        endIcon ? (
          <span
            className="icon-slide-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {endIcon}
          </span>
        ) : undefined
      }
      sx={{
        borderRadius: '12px',
        textTransform: 'none',
        fontWeight: 700,
        letterSpacing: '0.2px',
        transform: transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.1s ease-out, box-shadow 0.25s ease',
        '&:hover': {
          '& .icon-slide-target': {
            transform: slideTranslate,
          },
        },
        '&:active': {
          transform: 'scale(0.975)',
        },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default IconSlideButton;
