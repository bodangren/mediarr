import { jsx as _jsx } from "react/jsx-runtime";
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';
function createMockStorage() {
    const store = new Map();
    return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        clear: () => store.clear(),
    };
}
describe('ThemeProvider', () => {
    beforeEach(() => {
        const mockLocalStorage = createMockStorage();
        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });
    it('should provide default theme context', () => {
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current).toBeDefined();
        expect(result.current.theme).toBe('dark');
    });
    it('should load theme from localStorage', () => {
        localStorage.setItem('mediarr.ui.theme', 'light');
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('light');
    });
    it('should set theme and update document', () => {
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme('light');
        });
        expect(result.current.theme).toBe('light');
        expect(document.documentElement.dataset.theme).toBe('light');
    });
    it('should toggle between light and dark themes', () => {
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.toggleTheme();
        });
        expect(result.current.theme).toBe('light');
        act(() => {
            result.current.toggleTheme();
        });
        expect(result.current.theme).toBe('dark');
    });
    it('should persist theme to localStorage', () => {
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme('light');
        });
        const stored = localStorage.getItem('mediarr.ui.theme');
        expect(stored).toBeDefined();
        expect(stored).toBe('light');
    });
    it('should use system theme when theme is "auto"', () => {
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
        localStorage.setItem('mediarr.ui.theme', 'auto');
        const wrapper = ({ children }) => (_jsx(ThemeProvider, { children: children }));
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('auto');
        expect(document.documentElement.dataset.theme).toBe('light');
    });
});
//# sourceMappingURL=ThemeProvider.test.js.map