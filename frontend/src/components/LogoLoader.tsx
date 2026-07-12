import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const LogoLoader: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        width: '100%',
        minHeight: '260px',
        flex: 1,
        position: 'relative',
      }}
    >
      {/* Outer Loader Wrapper */}
      <Box sx={{ position: 'relative', width: 94, height: 94, mb: 3 }}>
        
        {/* Soft coral radial backing glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232, 90, 79, 0.15) 0%, rgba(232, 90, 79, 0) 70%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Rotating outer ring of trailing orbital dots matching the uploaded design */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 22.5 * Math.PI) / 180;
              // Orbit path radius is 42
              const cx = 50 + 42 * Math.cos(angle);
              const cy = 50 + 42 * Math.sin(angle);
              // Fade trailing dots from 0.15 to 1.0 opacity
              const opacity = 0.15 + (i / 15) * 0.85;
              // Scale trailing dots from 1.5px to 3px radius
              const radius = 1.5 + (i / 15) * 1.5;

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="#E85A4F"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(232, 90, 79, 0.6))',
                    opacity: opacity,
                  }}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* Pulsing inner logo emblem */}
        <motion.div
          animate={{ scale: [0.93, 1.05, 0.93] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 15,
            left: 15,
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundImage: 'url(/logo.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: '2px solid rgba(232, 90, 79, 0.3)',
            boxShadow: '0 8px 24px rgba(232, 90, 79, 0.25)',
            zIndex: 2,
          }}
        />
      </Box>

      {/* Pulsing text */}
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        style={{ zIndex: 1 }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'var(--neutral-secondary)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
          }}
        >
          Syncing module data...
        </Typography>
      </motion.div>
    </Box>
  );
};

export default LogoLoader;
