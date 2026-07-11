import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';

// Soft pulse animation representing the shimmer / wave effect
const pulse = keyframes`
  0% {
    opacity: 0.55;
    background-color: #F5F3EE;
  }
  50% {
    opacity: 0.95;
    background-color: #D8C3A5;
  }
  100% {
    opacity: 0.55;
    background-color: #F5F3EE;
  }
`;

interface ComponentLoaderProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  count?: number;
}

/**
 * Reusable Component skeleton loader.
 * Can render text blocks, cards, lists, circular icons.
 */
const ComponentLoader: React.FC<ComponentLoaderProps> = ({
  variant = 'rect',
  width = '100%',
  height = '100px',
  borderRadius,
  count = 1,
}) => {
  const getRadius = () => {
    if (borderRadius !== undefined) return borderRadius;
    if (variant === 'circle') return '50%';
    if (variant === 'text') return '4px';
    return '18px'; // var(--radius-card)
  };

  const renderSkeleton = (index: number) => (
    <Box
      key={index}
      sx={{
        width: width,
        height: variant === 'text' && height === '100px' ? '16px' : height,
        borderRadius: getRadius(),
        animation: `${pulse} 1.8s ease-in-out infinite`,
        marginBottom: index < count - 1 ? '12px' : 0,
      }}
    />
  );

  return (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => renderSkeleton(idx))}
    </Box>
  );
};

export default ComponentLoader;
