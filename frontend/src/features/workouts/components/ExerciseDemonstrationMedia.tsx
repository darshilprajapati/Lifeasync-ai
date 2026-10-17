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

  // Category-accurate biomechanical movement vector renderer
  const renderBiomechanicalPose = () => {
    const cat = category.toLowerCase();
    const name = exerciseName.toLowerCase();

    // 1. Horizontal Push / Plank (Chest, Pushups, Bench, Tricep Extensions, Dips)
    if (cat === 'chest' || name.includes('push') || name.includes('dip') || name.includes('bench') || name.includes('extension')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Ground Floor Plane */}
          <line x1="10" y1="76" x2="90" y2="76" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* Head */}
          <circle cx="75" cy="45" r="5.5" fill={themeColor} />
          {/* Prone Spine/Torso Line */}
          <line x1="72" y1="48" x2="35" y2="58" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Legs to Floor */}
          <line x1="35" y1="58" x2="20" y2="75" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Arms: Flexing Elbow down to Palm on Floor */}
          <path
            d={isPlaying ? 'M 66,50 L 64,62 L 65,75' : 'M 66,50 L 68,60 L 65,75'}
            stroke={themeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Active Chest & Tricep Contraction Nodes */}
          <circle cx="64" cy="52" r="3.5" fill="#ef4444" />
          <circle cx="67" cy="62" r="3" fill="#f59e0b" />
          {/* Movement Vector Arc */}
          <path d="M 62,42 Q 68,36 74,42" fill="none" stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    }

    // 2. Vertical / Horizontal Pull (Back, Pull-ups, Rows, Lat Pulldowns)
    if (cat === 'back' || name.includes('pull') || name.includes('row') || name.includes('lat')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Overhead Grip Bar */}
          <line x1="20" y1="20" x2="80" y2="20" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Head */}
          <circle cx="50" cy="36" r="6" fill={themeColor} />
          {/* Torso V-Taper */}
          <line x1="50" y1="42" x2="50" y2="68" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Pulling Arms (Elbows tucked driving downward) */}
          <path
            d="M 32,20 L 38,36 L 46,45 M 68,20 L 62,36 L 54,45"
            stroke={themeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Legs hanging in hollow body */}
          <line x1="50" y1="68" x2="44" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="68" x2="56" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          {/* Latissimus & Scapular Contraction Nodes */}
          <circle cx="44" cy="46" r="3.5" fill="#ef4444" />
          <circle cx="56" cy="46" r="3.5" fill="#ef4444" />
        </svg>
      );
    }

    // 3. Squat & Knee Flexion (Legs, Squat, Lunge, Split Squat)
    if (name.includes('squat') || name.includes('lunge') || name.includes('split') || name.includes('calf')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Floor Plane */}
          <line x1="15" y1="84" x2="85" y2="84" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="42" cy="30" r="5.5" fill={themeColor} />
          {/* Upright/Hinged Torso */}
          <line x1="43" y1="36" x2="47" y2="54" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Thigh: Hips to Knee parallel */}
          <line x1="47" y1="54" x2="68" y2="56" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" />
          {/* Shin: Knee to Foot on Floor */}
          <line x1="68" y1="56" x2="68" y2="82" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Counterbalance Arms */}
          <line x1="44" y1="40" x2="65" y2="44" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Quad & Glute Muscle Contraction Nodes */}
          <circle cx="58" cy="55" r="4" fill="#ef4444" />
          <circle cx="46" cy="54" r="3.5" fill="#f59e0b" />
          {/* Kinetic Depth Arc */}
          <path d="M 46,62 Q 58,68 68,62" fill="none" stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    }

    // 4. Posterior Chain & Hip Hinge (Deadlift, Glute Bridge, Hamstrings)
    if (name.includes('bridge') || name.includes('deadlift') || name.includes('hinge')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Floor */}
          <line x1="15" y1="78" x2="85" y2="78" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Supine Glute Bridge Pose: Head on floor, Hips elevated */}
          <circle cx="28" cy="74" r="5" fill={themeColor} />
          <path d="M 33,74 L 50,56 L 68,76" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="68" y1="76" x2="78" y2="76" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Glute & Hamstring Apex Nodes */}
          <circle cx="50" cy="56" r="4" fill="#ef4444" />
          <circle cx="58" cy="66" r="3.5" fill="#f59e0b" />
          {/* Upward Extension Force Vector */}
          <line x1="50" y1="52" x2="50" y2="38" stroke={themeColor} strokeWidth="2" strokeDasharray="3 2" />
          <polygon points="50,34 46,40 54,40" fill={themeColor} />
        </svg>
      );
    }

    // 5. Overhead Shoulder Press & Deltoids (Shoulders, Press, Pike)
    if (cat === 'shoulders' || name.includes('shoulder') || name.includes('press') || name.includes('pike') || name.includes('raise')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Head */}
          <circle cx="50" cy="38" r="6" fill={themeColor} />
          {/* Torso */}
          <line x1="50" y1="44" x2="50" y2="70" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Overhead Pressing Arms in V-trajectory */}
          <path d="M 50,48 L 34,36 L 28,18 M 50,48 L 66,36 L 72,18" stroke={themeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Deltoid Acromion Nodes */}
          <circle cx="34" cy="46" r="3.5" fill="#ef4444" />
          <circle cx="66" cy="46" r="3.5" fill="#ef4444" />
          {/* Dumbbell / Barbell Bar overhead */}
          <line x1="20" y1="18" x2="36" y2="18" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
          <line x1="64" y1="18" x2="80" y2="18" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
          {/* Legs */}
          <line x1="50" y1="70" x2="42" y2="88" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="70" x2="58" y2="88" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }

    // 6. Arm Isolation: Biceps / Triceps (Curl, Dips)
    if (cat === 'arms' || name.includes('curl') || name.includes('bicep') || name.includes('tricep')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Head */}
          <circle cx="45" cy="30" r="5.5" fill={themeColor} />
          {/* Torso */}
          <line x1="45" y1="36" x2="45" y2="68" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Upper Arm Vertical */}
          <line x1="45" y1="42" x2="48" y2="56" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Forearm Curling Articulation Arc */}
          <path d="M 48,56 L 62,42" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* Bicep / Tricep Muscle Bellies */}
          <circle cx="54" cy="48" r="4" fill="#ef4444" />
          <circle cx="46" cy="48" r="3" fill="#f59e0b" />
          {/* Dumbbell Weight */}
          <circle cx="64" cy="40" r="4.5" fill="rgba(255,255,255,0.7)" />
          {/* Legs */}
          <line x1="45" y1="68" x2="40" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="68" x2="52" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }

    // 7. Core Stabilization & Flexion (Core, Plank, Crunch, Abdominals)
    if (cat === 'core' || name.includes('plank') || name.includes('crunch') || name.includes('bicycle')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
          {/* Floor */}
          <line x1="15" y1="74" x2="85" y2="74" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Prone Plank Line: Straight rigid line from head to heels */}
          <circle cx="75" cy="50" r="5" fill={themeColor} />
          <line x1="72" y1="52" x2="26" y2="60" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Grounded Forearms */}
          <line x1="68" y1="53" x2="68" y2="73" stroke={themeColor} strokeWidth="3" strokeLinecap="round" />
          {/* Toes on Floor */}
          <line x1="26" y1="60" x2="20" y2="73" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Rectus Abdominis / Core Brace Highlight Nodes */}
          <circle cx="52" cy="56" r="4" fill="#ef4444" />
          <circle cx="44" cy="57" r="3" fill="#f59e0b" />
          <circle cx="60" cy="55" r="3" fill="#f59e0b" />
        </svg>
      );
    }

    // 8. Cardio & Explosive Locomotion (Cardio, Burpees, Jumping, Running)
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 12px ${themeColor}66)` }}>
        {/* Head */}
        <circle cx="56" cy="28" r="6" fill={themeColor} />
        {/* Dynamic Forward-Leaning Torso */}
        <line x1="55" y1="34" x2="48" y2="56" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        {/* High Driving Knee */}
        <path d="M 48,56 L 65,58 L 60,78" stroke={themeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Trailing Extended Leg */}
        <path d="M 48,56 L 36,66 L 26,82" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Pumping Runner Arms */}
        <line x1="53" y1="40" x2="68" y2="48" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="53" y1="40" x2="38" y2="38" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Cardiac/Full Body Kinetic Nodes */}
        <circle cx="53" cy="44" r="4" fill="#ef4444" />
        <circle cx="65" cy="58" r="3.5" fill="#f59e0b" />
      </svg>
    );
  };

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
          autoPlay={isPlaying}
          loop
          muted
          playsInline
          preload="none"
          onError={() => setMediaError(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        /* Biomechanical Kinetic Demonstration Vector Guide */
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
          {/* Grid Matrix Background */}
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
              width: size === 'large' ? 140 : size === 'compact' ? 88 : 105,
              height: size === 'large' ? 140 : size === 'compact' ? 88 : 105,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isPlaying ? 'pulseContraction 2.4s ease-in-out infinite' : 'none',
              '@keyframes pulseContraction': {
                '0%': { transform: 'scale(0.96)', opacity: 0.88 },
                '50%': { transform: 'scale(1.04)', opacity: 1 },
                '100%': { transform: 'scale(0.96)', opacity: 0.88 }
              }
            }}
          >
            {renderBiomechanicalPose()}
          </Box>

          {/* Exercise Name & Primary Muscle Focus */}
          <Typography
            variant="caption"
            sx={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: size === 'compact' ? '11.5px' : '13.5px',
              mt: 0.8,
              letterSpacing: '0.3px',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              zIndex: 1,
              maxWidth: '92%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {exerciseName}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: size === 'compact' ? '9.5px' : '10.5px',
              textAlign: 'center',
              zIndex: 1,
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {targetMuscles || `${category} Biomechanics`}
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
          icon={<SpeedIcon sx={{ fontSize: '12px !important', color: '#10b981 !important' }} />}
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
                width: 26,
                height: 26,
                '&:hover': { bgcolor: themeColor, borderColor: themeColor }
              }}
            >
              {isPlaying ? <PauseIcon sx={{ fontSize: 15 }} /> : <PlayArrowIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Tooltip>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '9.5px',
              fontWeight: 600,
              bgcolor: 'rgba(15, 23, 42, 0.75)',
              px: 0.8,
              py: 0.25,
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
