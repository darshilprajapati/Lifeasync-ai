import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface NodeData {
  id: number;
  name: string;
  icon: string;
  description: string;
  color: string;
  angle: number; // in degrees
}

const LIFE_AREAS: NodeData[] = [
  { id: 1, name: 'Planner', icon: '📅', description: 'Schedule & Tasks', color: '#42A5F5', angle: 0 },
  { id: 2, name: 'Finance', icon: '💰', description: 'Budget & Assets', color: '#66BB6A', angle: 60 },
  { id: 3, name: 'Health', icon: '❤️', description: 'Vitals & Habit tracker', color: '#EF5350', angle: 120 },
  { id: 4, name: 'Career', icon: '🚀', description: 'Milestones & Growth', color: '#FFA726', angle: 180 },
  { id: 5, name: 'Vault', icon: '🔒', description: 'Secure documents', color: '#AB47BC', angle: 240 },
  { id: 6, name: 'AI Insights', icon: '🧠', description: 'Intelligent summaries', color: '#26C6DA', angle: 300 },
];

export const LifeSyncConstellation: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  // Mouse coordinates for interactive gravity effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for mouse movements
  const springConfig = { damping: 25, stiffness: 120 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Normalize coordinates relative to center of container (0, 0)
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Limit maximum pull distance
    mouseX.set(x * 0.15);
    mouseY.set(y * 0.15);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setHoveredNode(null);
  };

  const radius = 130; // Radius of orbit

  return (
    <Box
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        width: '100%',
        height: '420px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        mb: 4,
        zIndex: 2,
      }}
    >
      {/* Ambient contrast backing to make the white lines and glowing nodes pop against the background */}
      <Box
        sx={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0) 75%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Constellation background container containing all lines and nodes */}
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          x: smoothMouseX,
          y: smoothMouseY,
          zIndex: 1,
        }}
      >
        {/* SVG overlay to render connection lines & data packets */}
        <svg
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <defs>
            <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Hub background glowing circle */}
          <circle cx="50%" cy="50%" r="70" fill="url(#hub-glow)" />

          {/* Orbit Line circles representing standard synchronization routes */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
            strokeDasharray="5 7"
          />

          {/* Render connection lines from Center to Orbiting Nodes */}
          {LIFE_AREAS.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            // Target coordinates relative to center (50%, 50%)
            const targetX = 50 + (radius / 3.6) * Math.cos(rad); // Convert to % roughly
            const targetY = 50 + (radius / 3.6) * Math.sin(rad);

            return (
              <g key={`lines-${node.id}`}>
                {/* Connecting Line */}
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${targetX}%`}
                  y2={`${targetY}%`}
                  stroke={hoveredNode?.id === node.id ? node.color : 'rgba(255, 255, 255, 0.45)'}
                  strokeWidth={hoveredNode?.id === node.id ? 3.5 : 2}
                  style={{
                    transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                    filter: hoveredNode?.id === node.id 
                      ? `drop-shadow(0 0 4px ${node.color})` 
                      : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))'
                  }}
                />

                {/* Animated syncing data packet dot */}
                <motion.circle
                  r="5"
                  fill={node.color}
                  animate={{
                    cx: ['50%', `${targetX}%`],
                    cy: ['50%', `${targetY}%`],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 1.8 + node.id * 0.25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: node.id * 0.35,
                  }}
                  style={{
                    filter: `drop-shadow(0 0 8px ${node.color})`,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Central Core Hub Node */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              '0 0 25px rgba(255, 255, 255, 0.45), inset 0 0 10px rgba(255,255,255,0.2)',
              '0 0 45px rgba(255, 255, 255, 0.75), inset 0 0 15px rgba(255,255,255,0.3)',
              '0 0 25px rgba(255, 255, 255, 0.45), inset 0 0 10px rgba(255,255,255,0.2)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.98)',
            border: '3px solid rgba(255, 255, 255, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            color: '#E85A4F',
            fontSize: '36px',
            fontWeight: 'bold',
          }}
        >
          <span style={{ filter: 'drop-shadow(0 2px 4px rgba(232, 90, 79, 0.3))' }}>⚡</span>
        </motion.div>

        {/* Orbiting Nodes representing Life Areas */}
        {LIFE_AREAS.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const xPos = radius * Math.cos(rad);
          const yPos = radius * Math.sin(rad);
          const isHovered = hoveredNode?.id === node.id;

          return (
            <motion.div
              key={node.id}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              animate={{
                x: xPos,
                y: yPos,
                scale: isHovered ? 1.3 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 140,
                damping: 13,
              }}
              style={{
                position: 'absolute',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: isHovered ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.16)',
                border: isHovered ? `2.5px solid ${node.color}` : '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: isHovered 
                  ? `0 0 25px ${node.color}, 0 8px 20px rgba(0,0,0,0.25)` 
                  : `0 0 10px ${node.color}40, 0 4px 10px rgba(0,0,0,0.15)`,
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                zIndex: 4,
                cursor: 'pointer',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
              }}
            >
              <span style={{ filter: isHovered ? `drop-shadow(0 0 4px ${node.color})` : 'none' }}>
                {node.icon}
              </span>
            </motion.div>
          );
        })}

        {/* Dynamic description cards positioned relative to constellation center */}
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'absolute',
              bottom: '-70px',
              background: 'rgba(20, 20, 20, 0.88)',
              border: `1.5px solid ${hoveredNode.color}`,
              boxShadow: `0 0 18px ${hoveredNode.color}50, 0 10px 30px rgba(0, 0, 0, 0.35)`,
              backdropFilter: 'blur(12px)',
              padding: '12px 20px',
              borderRadius: '14px',
              textAlign: 'center',
              width: '280px',
              zIndex: 5,
              color: 'white',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: hoveredNode.color, lineHeight: 1.2, fontSize: '0.95rem' }}>
              {hoveredNode.name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.95, fontSize: '0.78rem', display: 'block', mt: 0.5, fontWeight: 500 }}>
              {hoveredNode.description}
            </Typography>
          </motion.div>
        )}
      </motion.div>
    </Box>
  );
};
