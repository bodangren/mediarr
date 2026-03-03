'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { COLOR_IMPAIRED_KEY, loadColorImpairedMode, toggleColorImpairedMode } from './colorImpaired';
const ThemeContext = createContext(null);
/**
 * Resolves the effective theme based on preference and system setting.
 */
function resolveThemePreference(theme, doc) {
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
function applyThemeToDocument(theme, doc) {
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
function loadThemePreference(storageKey, defaultTheme) {
    if (typeof window === 'undefined') {
        return defaultTheme;
    }
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
            return stored;
        }
    }
    catch {
        // Ignore storage errors
    }
    return defaultTheme;
}
/**
 * Saves the theme preference to localStorage.
 */
function saveThemePreference(theme, storageKey) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(storageKey, theme);
    }
    catch {
        // Ignore storage errors
    }
}
/**
 * Provider for theme context.
 * Manages theme state, persistence, and application to the document.
 */
export function ThemeProvider({ children, defaultTheme = 'dark', storageKey = 'mediarr.ui.theme', }) {
    const [theme, setThemeState] = useState(() => loadThemePreference(storageKey, defaultTheme));
    const [colorImpairedMode, setColorImpairedMode] = useState(() => loadColorImpairedMode());
    useEffect(() => {
        applyThemeToDocument(theme);
    }, [theme]);
    useEffect(() => {
        setColorImpairedMode(loadColorImpairedMode());
    }, []);
    const setTheme = (nextTheme) => {
        setThemeState(nextTheme);
        saveThemePreference(nextTheme, storageKey);
    };
    const toggleTheme = () => {
        const resolved = resolveThemePreference(theme);
        const nextTheme = resolved === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    };
    const toggleColorImpaired = () => {
        const nextMode = toggleColorImpairedMode();
        setColorImpairedMode(nextMode);
    };
    const value = {
        theme,
        setTheme,
        toggleTheme,
        colorImpairedMode,
        toggleColorImpairedMode: toggleColorImpaired,
    };
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
}
export { ThemeContext };
//# sourceMappingURL=ThemeProvider.js.map