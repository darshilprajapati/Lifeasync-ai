import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Alert
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export interface ExerciseDemonstrationMediaProps {
  exerciseName: string;
  category: string;
  targetMuscles?: string;
  secondaryMuscles?: string;
  instructions?: string;
  description?: string;
  postureTips?: string;
  commonMistakes?: string;
  safetyTips?: string;
  difficultyLevel?: string;
  equipmentType?: string;
  requiresEquipment?: boolean;
  defaultSets?: number;
  defaultReps?: number;
  defaultRestSeconds?: number;
  animationUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isCustom?: boolean;
  size?: 'compact' | 'medium' | 'large';
  autoPlay?: boolean;
}

export const ExerciseDemonstrationMedia: React.FC<ExerciseDemonstrationMediaProps> = ({
  exerciseName,
  category,
  targetMuscles,
  secondaryMuscles,
  instructions,
  description,
  postureTips,
  commonMistakes,
  safetyTips,
  difficultyLevel,
  equipmentType,
  requiresEquipment,
  defaultSets,
  defaultReps,
  defaultRestSeconds,
  animationUrl,
  thumbnailUrl,
  videoUrl,
  isCustom,
  size = 'medium',
  autoPlay = true
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [videoPlayerError, setVideoPlayerError] = useState<boolean>(false);

  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        const v = parsed.searchParams.get('v');
        if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
        const pathParts = parsed.pathname.split('/');
        if (pathParts[1] === 'embed' && pathParts[2]) return url;
      }
      if (parsed.hostname === 'youtu.be') {
        const v = parsed.pathname.replace(/^\//, '');
        if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      }
    } catch {
      return null;
    }
    return null;
  };

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

    // 1. Chair Tricep Dips
    if (name.includes('dip')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
          {/* Floor Plane */}
          <line x1="10" y1="86" x2="90" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Chair/Bench behind torso */}
          <rect x="22" y="52" width="16" height="34" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <line x1="38" y1="52" x2="38" y2="86" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          {/* Head */}
          <circle cx="48" cy="32" r="5.5" fill={themeColor} />
          {/* Vertical Torso dipping down */}
          <line x1="48" y1="38" x2="48" y2="64" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Arm gripping chair edge with elbow flexed 90 deg behind */}
          <path d="M 48,43 L 36,46 L 38,52" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Active Tricep Contraction Node */}
          <circle cx="36" cy="46" r="3.5" fill="#ef4444" />
          {/* Anterior Deltoid node */}
          <circle cx="48" cy="43" r="3" fill="#f59e0b" />
          {/* Thighs extending forward from hips */}
          <line x1="48" y1="64" x2="68" y2="64" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Shins to floor */}
          <line x1="68" y1="64" x2="68" y2="86" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Motion Vector (Vertical extension arrow) */}
          <line x1="56" y1="58" x2="56" y2="44" stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" />
          <polygon points="56,40 53,46 59,46" fill={themeColor} />
        </svg>
      );
    }

    // 2. Bodyweight Tricep Extensions
    if (name.includes('extension') && !name.includes('overhead')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
          {/* Floor Plane */}
          <line x1="10" y1="84" x2="90" y2="84" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Raised Surface/Bench */}
          <rect x="70" y="56" width="20" height="28" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="68" cy="40" r="5.5" fill={themeColor} />
          {/* Straight Plank Line (Feet at floor to Shoulders) */}
          <line x1="22" y1="80" x2="64" y2="46" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Tricep Extension Arms: Forearms lowering to surface */}
          <path d="M 64,46 L 68,54 L 72,56" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Tricep Brachii Contraction Node */}
          <circle cx="68" cy="54" r="3.5" fill="#ef4444" />
          {/* Core Stability Node */}
          <circle cx="44" cy="62" r="3" fill="#f59e0b" />
          {/* Kinetic Arc for Tricep Press */}
          <path d="M 64,36 Q 72,32 78,38" fill="none" stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    }

    // 3. Dumbbell Overhead Tricep Extension / Skull Crushers
    if (name.includes('overhead') && name.includes('tricep')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
          {/* Ground */}
          <line x1="15" y1="86" x2="85" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="50" cy="36" r="5.5" fill={themeColor} />
          {/* Torso */}
          <line x1="50" y1="42" x2="50" y2="68" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Upper arms pointing vertical */}
          <line x1="50" y1="46" x2="48" y2="24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          {/* Forearm bent backward behind head holding dumbbell */}
          <path d="M 48,24 L 44,38" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* Triceps Long Head Node */}
          <circle cx="48" cy="24" r="3.5" fill="#ef4444" />
          {/* Dumbbell behind head */}
          <rect x="40" y="36" width="8" height="6" rx="1.5" fill="rgba(255,255,255,0.8)" />
          {/* Legs */}
          <line x1="50" y1="68" x2="44" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="68" x2="56" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }

    // 4. Dumbbell Bicep Curls / Hammer Curls
    if (name.includes('curl') || name.includes('bicep')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
          {/* Ground */}
          <line x1="15" y1="86" x2="85" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="45" cy="30" r="5.5" fill={themeColor} />
          {/* Torso */}
          <line x1="45" y1="36" x2="45" y2="68" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Upper Arm stationary vertical along ribs */}
          <line x1="45" y1="42" x2="45" y2="56" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          {/* Forearm curling upward toward shoulder */}
          <path d="M 45,56 L 58,40" stroke={themeColor} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* Bicep Brachii Contraction Node */}
          <circle cx="50" cy="46" r="4" fill="#ef4444" />
          {/* Dumbbell at top of curl */}
          <circle cx="58" cy="40" r="4.5" fill="rgba(255,255,255,0.85)" />
          {/* Curling Trajectory Arc */}
          <path d="M 52,58 Q 62,54 58,42" fill="none" stroke={themeColor} strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Legs */}
          <line x1="45" y1="68" x2="40" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="68" x2="52" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }

    // 5. Horizontal Push / Chest Press / Pushups
    if (cat === 'chest' || name.includes('push') || name.includes('bench') || name.includes('chest') || name.includes('flye')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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
            d="M 66,50 L 64,62 L 65,75"
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

    // 6. Vertical / Horizontal Pull (Back, Pull-ups, Rows, Lat Pulldowns)
    if (cat === 'back' || name.includes('pull') || name.includes('row') || name.includes('lat')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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

    // 7. Squat & Knee Flexion (Legs, Squat, Lunge, Split Squat)
    if (name.includes('squat') || name.includes('lunge') || name.includes('split') || name.includes('calf') || cat === 'legs') {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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

    // 8. Posterior Chain & Hip Hinge (Deadlift, Glute Bridge, Hamstrings)
    if (name.includes('bridge') || name.includes('deadlift') || name.includes('hinge')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
          {/* Floor */}
          <line x1="15" y1="78" x2="85" y2="78" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          {/* Supine Glute Bridge Pose */}
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

    // 9. Overhead Shoulder Press & Deltoids (Shoulders, Press, Pike)
    if (cat === 'shoulders' || name.includes('shoulder') || name.includes('press') || name.includes('pike') || name.includes('raise')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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

    // 10. Core Stabilization & Flexion (Core, Plank, Crunch, Abdominals)
    if (cat === 'core' || name.includes('plank') || name.includes('crunch') || name.includes('bicycle')) {
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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

    // 11. Cardio & Explosive Locomotion (Cardio, Burpees, Jumping, Running)
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 10px ${themeColor}55)` }}>
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
        /* Biomechanical Movement Anatomy Vector Guide - Clean, Static, Accurate */
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

          {/* Biomechanical Anatomy Vector - Truly Static, No Zoom In/Out Animation */}
          <Box
            sx={{
              position: 'relative',
              width: size === 'large' ? 140 : size === 'compact' ? 88 : 105,
              height: size === 'large' ? 140 : size === 'compact' ? 88 : 105,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'none'
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
            {targetMuscles || `${category} Form Guide`}
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
          icon={hasValidMedia ? <PlayArrowIcon sx={{ fontSize: '12px !important', color: '#10b981 !important' }} /> : <FitnessCenterIcon sx={{ fontSize: '12px !important', color: `${themeColor} !important` }} />}
          label={hasValidMedia ? (isPlaying ? 'Video Playing' : 'Video Paused') : 'Technique Form Guide'}
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

      {/* Bottom Floating Controls */}
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
        {hasValidMedia ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Tooltip title={isPlaying ? 'Pause Video' : 'Play Video'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
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
              Video Demo
            </Typography>
          </Stack>
        ) : (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '9.5px',
              fontWeight: 600,
              bgcolor: 'rgba(15, 23, 42, 0.75)',
              px: 0.8,
              py: 0.25,
              borderRadius: '6px',
              backdropFilter: 'blur(4px)'
            }}
          >
            {requiresEquipment !== false && equipmentType ? equipmentType : 'Bodyweight Movement'}
          </Typography>
        )}

        <Tooltip title="View exercise details and demonstration" arrow placement="top">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setVideoPlayerError(false);
              setDetailsOpen(true);
            }}
            sx={{
              bgcolor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              color: 'rgba(255, 255, 255, 0.9)',
              width: 26,
              height: 26,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              '&:hover': {
                bgcolor: themeColor,
                color: '#ffffff'
              }
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Exercise Details & Demonstration Modal */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              bgcolor: 'var(--bg-card, #ffffff)',
              backgroundImage: 'none',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              p: 0.5
            }
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.8, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={category}
                size="small"
                sx={{
                  bgcolor: `${themeColor}18`,
                  color: themeColor,
                  fontWeight: 700,
                  fontSize: '11px',
                  height: 22
                }}
              />
              {difficultyLevel && (
                <Chip
                  label={difficultyLevel}
                  size="small"
                  sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
                />
              )}
              <Chip
                label={requiresEquipment !== false && equipmentType ? equipmentType : 'Bodyweight'}
                size="small"
                sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
              />
              {isCustom && (
                <Chip
                  label="Custom Exercise"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: 'rgba(236, 72, 153, 0.12)',
                    color: '#ec4899',
                    border: '1px solid rgba(236, 72, 153, 0.3)'
                  }}
                />
              )}
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {exerciseName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setDetailsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, pt: 1 }}>
          {/* Demonstration Media Area */}
          <Box sx={{ mb: 2.5 }}>
            {videoUrl && !videoPlayerError ? (
              <Box sx={{ borderRadius: '14px', overflow: 'hidden', bgcolor: '#000000', mb: 1 }}>
                {getYouTubeEmbedUrl(videoUrl) ? (
                  <Box sx={{ position: 'relative', pt: '56.25%' }}>
                    <iframe
                      src={getYouTubeEmbedUrl(videoUrl)!}
                      title={exerciseName}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 0
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </Box>
                ) : (
                  <video
                    controls
                    src={videoUrl}
                    onError={() => setVideoPlayerError(true)}
                    style={{ width: '100%', maxHeight: 280, display: 'block' }}
                  />
                )}
              </Box>
            ) : animationUrl && !mediaError ? (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  bgcolor: '#0f172a',
                  borderRadius: '14px',
                  mb: 1
                }}
              >
                <img
                  src={animationUrl}
                  alt={exerciseName}
                  onError={() => setMediaError(true)}
                  style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '14px',
                  bgcolor: 'rgba(0, 0, 0, 0.03)',
                  border: '1px dashed rgba(0, 0, 0, 0.15)',
                  textAlign: 'center',
                  mb: 1
                }}
              >
                <FitnessCenterIcon sx={{ fontSize: 36, color: 'var(--text-secondary)', mb: 1, opacity: 0.6 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                  Embedded Video Demonstration Unavailable
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 1.5, maxWidth: '420px', mx: 'auto' }}>
                  A direct video file is not embedded for this movement. Review the verified step-by-step instructions and posture guidance below, or watch verified demonstration videos online.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise proper form technique')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  Watch Demo on YouTube
                </Button>
              </Box>
            )}

            {/* If video URL was provided, also offer Find Demonstration link for more angles */}
            {videoUrl && !videoPlayerError && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' proper form')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontSize: '11px', textTransform: 'none', color: 'var(--text-secondary)' }}
                >
                  Find More Demonstrations
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Description & Step-by-Step Instructions */}
          <Stack spacing={2}>
            {description && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {description}
                </Typography>
              </Box>
            )}

            {instructions && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                  Step-by-Step Instructions
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                    p: 1.5,
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {instructions}
                </Typography>
              </Box>
            )}

            {/* Target Muscles */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.8 }}>
                Target Anatomy
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                {targetMuscles && (
                  <Chip
                    label={`Primary: ${targetMuscles}`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary, #6366f1)'
                    }}
                  />
                )}
                {secondaryMuscles && (
                  <Chip
                    label={`Secondary: ${secondaryMuscles}`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981'
                    }}
                  />
                )}
              </Stack>
            </Box>

            {/* Recommended Sets / Reps Guidance */}
            {(defaultSets || defaultReps || defaultRestSeconds) && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.8 }}>
                  Recommended Guidance
                </Typography>
                <Stack direction="row" spacing={2} sx={{ bgcolor: 'rgba(0, 0, 0, 0.02)', p: 1.2, borderRadius: '10px' }}>
                  {defaultSets !== undefined && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Sets</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{defaultSets}</Typography>
                    </Box>
                  )}
                  {defaultReps !== undefined && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Reps / Duration</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{defaultReps}</Typography>
                    </Box>
                  )}
                  {defaultRestSeconds !== undefined && (
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Rest</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{defaultRestSeconds}s</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            {/* Posture & Form Technique */}
            {postureTips && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                  Posture & Form Technique
                </Typography>
                <Alert severity="info" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                  {postureTips}
                </Alert>
              </Box>
            )}

            {/* Common Mistakes & Safety Tips */}
            {(commonMistakes || safetyTips) && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                  Safety & Form Cues
                </Typography>
                <Stack spacing={1}>
                  {commonMistakes && (
                    <Alert severity="warning" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                      <strong>Avoid:</strong> {commonMistakes}
                    </Alert>
                  )}
                  {safetyTips && (
                    <Alert severity="success" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                      <strong>Tip:</strong> {safetyTips}
                    </Alert>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Button onClick={() => setDetailsOpen(false)} sx={{ fontWeight: 700, borderRadius: '10px' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
