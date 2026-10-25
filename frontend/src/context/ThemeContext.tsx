import { createContext } from 'react';

export type DesignSystem = 'professional' | 'modern3d';
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  designSystem: DesignSystem;
  setDesignSystem: (ds: DesignSystem) => void;
  toggleDesignSystem: () => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export { useThemeSystem } from './useThemeSystem';
