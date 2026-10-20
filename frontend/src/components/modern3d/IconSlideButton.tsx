import React from 'react';
import { Button, type ButtonProps } from '@mui/material';
import { useThemeSystem } from '../../context/ThemeContext';

export interface IconSlideButtonProps extends ButtonProps {
  slideDirection?: 'right' | 'left' | 'up';
}

/**
 * IconSlideButton
 * Section 9: Modern 3D Icon Slide Buttons.
 * - Displays button icon and label in normal position.
 * - On hover, animates icon with a controlled slide and transitions depth/edge highlight.
 * - Subtle pressed-state movement on click.
 * - In Professional mode, renders sharp 0px corners, flat background, no slide.
 * - Preserves original onClick, disabled, loading, tooltips, and accessibility.
 */
export const IconSlideButton: React.FC<IconSlideButtonProps> = ({
  children,
  startIcon,
  endIcon,
  slideDirection = 'right',
  sx,
  ...rest
}) => {
  const { designSystem } = useThemeSystem();
  const isProf = designSystem === 'professional';

  if (isProf) {
    return (
      <Button
        startIcon={startIcon}
        endIcon={endIcon}
        sx={{
          borderRadius: '0px !important',
          boxShadow: 'none !important',
          textTransform: 'none',
          fontWeight: 650,
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease !important',
          transform: 'none !important',
          '&:hover': {
            boxShadow: 'none !important',
            transform: 'none !important'
          },
          ...sx
        }}
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
      startIcon={
        startIcon ? (
          <span
            className="icon-slide-target"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
              transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
        transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          '& .icon-slide-target': {
            transform: slideTranslate
          }
        },
        '&:active': {
          transform: 'translateY(1px) scale(0.98)'
        },
        ...sx
      }}
      {...rest}
    >
      {children}
    </Button>
  );
};
