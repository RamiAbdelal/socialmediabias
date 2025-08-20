"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Central theme color config
export const themeColors = {
  light: {
    background: 'bg-white',
    foreground: 'text-gray-900',
    card: 'bg-gray-100',
    border: 'border-gray-200',
    accent: 'text-primary',
    accentBg: 'bg-primary-50',
    muted: 'text-gray-500',
    link: 'text-primary-700',
    button: 'bg-primary text-white hover:bg-primary-700',
    shadow: 'shadow-md',
    primary: 'text-blue-700',
    primaryBg: 'bg-blue-600',
    secondary: 'text-gray-300',
    secondaryBg: 'bg-gray-900/80',
    cta: 'bg-blue-600 text-white hover:bg-blue-700',
    ctaText: 'text-blue-700',
    ctaBorder: 'border-blue-600',
    ctaSecondary: 'bg-red-400 text-gray-900 hover:bg-red-500',
    ctaSecondaryText: 'text-red-700',
    ctaSecondaryBorder: 'border-red-400',
  },
  dark: {
    background: 'bg-gray-950',
    foreground: 'text-gray-100',
    card: 'bg-gray-900',
    border: 'border-gray-800',
    accent: 'text-primary',
    accentBg: 'bg-primary-900',
    muted: 'text-gray-400',
    link: 'text-primary-300',
    button: 'bg-blue-500 text-white hover:bg-blue-400',
    shadow: 'shadow-lg',
    primary: 'text-blue-300',
    primaryBg: 'bg-blue-500',
    secondary: 'text-emerald-300',
    secondaryBg: 'bg-emerald-600',
    cta: 'bg-blue-500 text-white hover:bg-blue-400',
    ctaText: 'text-blue-300',
    ctaBorder: 'border-blue-600',
    ctaSecondary: 'bg-red-500 text-gray-900 hover:bg-red-500',
    ctaSecondaryText: 'text-red-700',
    ctaSecondaryBorder: 'border-red-400',
  },
};

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: typeof themeColors.light;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Try to use system preference on first load
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(systemDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode, colors: themeColors[mode] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
