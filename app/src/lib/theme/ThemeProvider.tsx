'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { COLOR_IMPAIRED_KEY, loadColorImpairedMode, toggleColorImpairedMode } from './colorImpaired';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  colorImpairedMode: boolean;
  toggleColorImpairedMode: () => void;
}

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemePreference;
  storageKey?: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Resolves the effective theme based on preference and system setting.
 */
function resolveThemePreference(
  theme: ThemePreference,
  doc?: Document
): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  if (typeof window !== 'undefined') {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (prefersLight) {
      return 'light';
    }
  }

  return 'dark';
}

/**
 * Applies the theme to the document root element.
 */
function applyThemeToDocument(theme: ThemePreference, doc?: Document): void {
  if (!doc) {
    if (typeof document === 'undefined') {
      return;
    }
    doc = document;
  }

  const resolvedTheme = resolveThemePreference(theme, doc);
  doc.documentElement.dataset.theme = resolvedTheme;
}

/**
 * Loads the theme preference from localStorage.
 */
function loadThemePreference(
  storageKey: string,
  defaultTheme: ThemePreference
): ThemePreference {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  return defaultTheme;
}

/**
 * Saves the theme preference to localStorage.
 */
function saveThemePreference(
  theme: ThemePreference,
  storageKey: string
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Provider for theme context.
 * Manages theme state, persistence, and application to the document.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'mediarr.ui.theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    loadThemePreference(storageKey, defaultTheme)
  );
  const [colorImpairedMode, setColorImpairedMode] = useState(() =>
    loadColorImpairedMode()
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    setColorImpairedMode(loadColorImpairedMode());
  }, []);

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    saveThemePreference(nextTheme, storageKey);
  };

  const toggleTheme = () => {
    const resolved = resolveThemePreference(theme);
    const nextTheme: ThemePreference = resolved === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const toggleColorImpaired = () => {
    const nextMode = toggleColorImpairedMode();
    setColorImpairedMode(nextMode);
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
    colorImpairedMode,
    toggleColorImpairedMode: toggleColorImpaired,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext };
