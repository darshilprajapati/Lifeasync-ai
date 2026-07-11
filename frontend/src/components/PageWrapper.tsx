import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../animations';

interface PageWrapperProps {
  children: React.ReactNode;
}

/**
 * Higher-order or wrapper component to apply Framer Motion page transitions.
 * Ensures consistent animation behavior across all route views.
 */
const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;
