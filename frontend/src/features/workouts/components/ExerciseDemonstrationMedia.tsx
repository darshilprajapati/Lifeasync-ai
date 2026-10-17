import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SpeedIcon from '@mui/icons-material/Speed';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface ExerciseDemonstrationMediaProps {
  exerciseName: string;
  category: string;
  targetMuscles?: string;
  instructions?: string;
  animationUrl?: string;
  thumbnailUrl?: string;
  size?: 'compact' | 'medium' | 'large';
  autoPlay?: boolean;
}

export const ExerciseDemonstrationMedia: React.FC<ExerciseDemonstrationMediaProps> = ({
  exerciseName,
  category,
  targetMuscles,
  instructions,
  animationUrl,
  thumbnailUrl,
  size = 'medium',
  autoPlay = true
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [mediaError, setMediaError] = useState<boolean>(false);

  // Height mappings based on size
  const heightMap = {
    compact: 140,
    medium: 220,
    large: 320
  };

  const containerHeight = heightMap[size];

  // Palette based on category
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'chest':
        return '#3b82f6';
      case 'back':
        return '#8b5cf6';
      case 'legs':
        return '#10b981';
      case 'shoulders':
        return '#f59e0b';
      case 'arms':
        return '#ec4899';
      case 'core':
        return '#06b6d4';
      case 'cardio':
        return '#ef4444';
      default:
        return '#6366f1';
    }
  };

  const themeColor = getCategoryColor(category);

  // If a valid media URL is provided and has not errored
  const hasValidMedia = Boolean(animationUrl && !mediaError);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: containerHeight,
        borderRadius: size === 'compact' ? '12px' : '16px',
        overflow: 'hidden',
        bgcolor: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        userSelect: 'none'
      }}
    >
      {hasValidMedia ? (
        <Box
          component="video"
          src={animationUrl}
          poster={thumbnailUrl}
          autoPlay={autoPlay}
          loop
          muted
          playsInline
          onError={() => setMediaError(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        /* Biomechanical Kinetic Demonstration SVG */
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: `radial-gradient(circle at 50% 40%, ${themeColor}22 0%, #090d16 80%)`,
            px: 2
          }}
        >
          {/* Subtle Grid Matrix Background */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              opacity: 0.6,
              pointerEvents: 'none'
            }}
          />

          {/* Kinetic Anatomy Vector Motion */}
          <Box
            sx={{
              position: 'relative',
              width: size === 'large' ? 140 : 100,
              height: size === 'large' ? 140 : 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPlaying ? 'pulseContraction 2.4s ease-in-out infinite' : 'none',
              '@keyframes pulseContraction': {
                '0%': { transform: 'scale(0.96)', opacity: 0.85 },
                '50%': { transform: 'scale(1.05)', opacity: 1 },
                '100%': { transform: 'scale(0.96)', opacity: 0.85 }
              }
            }}
          >
            <svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              style={{ filter: `drop-shadow(0 0 16px ${themeColor}66)` }}
            >
              {/* Outer Biomechanical Orbital Rings */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={themeColor}
                strokeWidth="1.5"
                strokeDasharray="6 4"
                strokeOpacity="0.4"
                style={{
                  transformOrigin: 'center',
                  animation: isPlaying ? 'spinSlow 12s linear infinite' : 'none'
                }}
              />
              <circle
                cx="50"
                cy="50"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />

              {/* Kinetic Movement Trajectory Arc */}
              <path
                d="M 25,50 A 25,25 0 0,1 75,50"
                fill="none"
                stroke={themeColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="50"
                style={{
                  strokeDashoffset: isPlaying ? 0 : 50,
                  transition: 'stroke-dashoffset 0.6s ease'
                }}
              />

              {/* Central Biomechanical Avatar Symbol */}
              <circle cx="50" cy="30" r="7" fill={themeColor} />
              <path
                d="M 50,38 L 50,65 M 34,48 L 66,48 M 50,65 L 38,84 M 50,65 L 62,84"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Muscle Contraction Nodes */}
              <circle cx="43" cy="48" r="3" fill="#ef4444" />
              <circle cx="57" cy="48" r="3" fill="#ef4444" />
            </svg>
          </Box>

          {/* Exercise Name & Primary Muscle Focus */}
          <Typography
            variant="caption"
            sx={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: size === 'compact' ? '12px' : '14px',
              mt: 1,
              letterSpacing: '0.3px',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              zIndex: 1
            }}
          >
            {exerciseName}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: size === 'compact' ? '10px' : '11px',
              textAlign: 'center',
              zIndex: 1,
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {targetMuscles || `${category} Anatomy`}
          </Typography>
        </Box>
      )}

      {/* Top Overlay Badges */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      >
        <Chip
          icon={<FitnessCenterIcon sx={{ fontSize: '12px !important', color: `${themeColor} !important` }} />}
          label={category}
          size="small"
          sx={{
            height: 22,
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '10px',
            border: `1px solid ${themeColor}44`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'auto'
          }}
        />

        <Chip
          icon={<SpeedIcon sx={{ fontSize: '12px !important', color: '#10b981 !important`' }} />}
          label={isPlaying ? 'Kinetic Guide Active' : 'Paused'}
          size="small"
          sx={{
            height: 22,
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 600,
            fontSize: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'auto'
          }}
        />
      </Box>

      {/* Bottom Floating Play/Pause & Form Cue Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title={isPlaying ? 'Pause Movement' : 'Play Movement'}>
            <IconButton
              size="small"
              onClick={() => setIsPlaying(!isPlaying)}
              sx={{
                bgcolor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                width: 28,
                height: 28,
                '&:hover': { bgcolor: themeColor, borderColor: themeColor }
              }}
            >
              {isPlaying ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '10px',
              fontWeight: 600,
              bgcolor: 'rgba(15, 23, 42, 0.75)',
              px: 1,
              py: 0.3,
              borderRadius: '6px',
              backdropFilter: 'blur(4px)'
            }}
          >
            Tempo: 3s Ecc · 1s Iso · 1s Con
          </Typography>
        </Stack>

        {instructions && (
          <Tooltip title={instructions} arrow placement="top">
            <IconButton
              size="small"
              sx={{
                bgcolor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                color: 'rgba(255, 255, 255, 0.8)',
                width: 26,
                height: 26,
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};
