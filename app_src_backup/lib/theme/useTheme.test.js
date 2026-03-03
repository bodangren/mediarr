import { jsx as _jsx } from "react/jsx-runtime";
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';
import { ThemeProvider } from './ThemeProvider';
function createMockStorage() {
    const store = new Map();
    return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        clear: () => store.clear(),
    };
}
describe('useTheme', () => {
    const mockLocalStorage = createMockStorage();
    beforeEach(() => {
        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    });
    it('should throw error when used outside ThemeProvider', () => {
        expect(() => {
            renderHook(() => useTheme());
        }).toThrow('useTheme must be used within a ThemeProvider');
    });
    it('should return theme context when used inside ThemeProvider', () => {
        const wrapper = function Wrapper({ children }) {
            return _jsx(ThemeProvider, { children: children });
        };
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current).toMatchObject({
            theme: expect.any(String),
            setTheme: expect.any(Function),
            toggleTheme: expect.any(Function),
        });
    });
    it('should allow changing theme', () => {
        const wrapper = function Wrapper({ children }) {
            return _jsx(ThemeProvider, { children: children });
        };
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme('light');
        });
        expect(result.current.theme).toBe('light');
        act(() => {
            result.current.setTheme('dark');
        });
        expect(result.current.theme).toBe('dark');
    });
});
//# sourceMappingURL=useTheme.test.js.map