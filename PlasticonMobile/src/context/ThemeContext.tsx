import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'plasticon_theme';

export type ThemeMode = 'light' | 'dark';

export const lightColors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentLight: '#FEF3C7',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  tabBar: '#0D1321',
  tabActive: '#F59E0B',
  tabInactive: '#4B5563',
  roleWorker: '#6366F1',
  roleEngineer: '#0EA5E9',
  roleAccountant: '#F59E0B',
  roleAdmin: '#7C3AED',
};

export const darkColors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#1E3A5F',
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentLight: '#2D1F00',
  success: '#22C55E',
  successLight: '#052E16',
  warning: '#FBBF24',
  warningLight: '#2D1F00',
  danger: '#EF4444',
  dangerLight: '#2D0000',
  info: '#38BDF8',
  infoLight: '#0C2D3F',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  background: '#0D1117',
  surface: '#161B27',
  surfaceAlt: '#1C2233',
  border: '#1E2A3A',
  borderStrong: '#2E3A52',
  tabBar: '#0D1321',
  tabActive: '#F59E0B',
  tabInactive: '#4B5563',
  roleWorker: '#818CF8',
  roleEngineer: '#38BDF8',
  roleAccountant: '#FCD34D',
  roleAdmin: '#A78BFA',
};

type ThemeContextValue = {
  theme: ThemeMode;
  colors: typeof lightColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'dark' || v === 'light') setTheme(v);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const value: ThemeContextValue = {
    theme,
    colors: theme === 'dark' ? darkColors : lightColors,
    isDark: theme === 'dark',
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
}
