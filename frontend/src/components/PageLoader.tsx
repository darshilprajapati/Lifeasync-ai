import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PageLoaderProps {
  onComplete?: () => void;
}

/**
 * Premium Page Loader matching Apple/Linear design standards.
 * Features:
 * - Animated SVG logo (scaling and rotation glow)
 * - Brand text fade-in with tracking letter-spacing
 * - Smooth linear percentage loading bar
 * - Backdrop blur transition
 */
const PageLoader: React.FC<PageLoaderProps> = ({ onComplete }) => {
  useEffect(() => {
    if (!onComplete) return;

    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(234, 229, 220, 0.95)', // bg-primary with opacity
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '300px', width: '100%' }}>
        {/* Animated Brand Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ marginBottom: '24px' }}
        >
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              backgroundImage: 'url(/logo.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              border: '2.5px solid rgba(0, 230, 118, 0.35)',
              boxShadow: '0 8px 24px rgba(0, 230, 118, 0.2), 0 0 40px rgba(0, 230, 118, 0.1)',
            }}
          />
        </motion.div>

        {/* Brand Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            fontSize: '24px',
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: '#2D2D2D',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          LifeSync AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: '11px',
            color: '#6D6D6D',
            marginBottom: '32px',
            letterSpacing: '0.08em',
          }}
        >
          Personal Intelligence Platform
        </motion.p>

        {/* Premium Minimal Spinning Ring Loader */}
        <div style={{ position: 'relative', width: '28px', height: '28px', marginTop: '8px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2.5px solid rgba(232, 90, 79, 0.15)',
              borderTopColor: '#E85A4F',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default PageLoader;
