import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export const useThemeSystem = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeSystem must be used within a ThemeProvider');
  }
  return context;
};
