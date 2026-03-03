import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
describe('useMediaQuery', () => {
    const originalMatchMedia = window.matchMedia;
    beforeEach(() => {
        // Reset window.matchMedia before each test
        window.matchMedia = vi.fn();
    });
    afterEach(() => {
        // Restore original window.matchMedia
        window.matchMedia = originalMatchMedia;
    });
    it('returns true when media query matches', () => {
        const mockMatchMedia = {
            matches: true,
            media: '(max-width: 768px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia).mockReturnValue(mockMatchMedia);
        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(true);
        expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
    });
    it('returns false when media query does not match', () => {
        const mockMatchMedia = {
            matches: false,
            media: '(max-width: 768px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia).mockReturnValue(mockMatchMedia);
        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(false);
    });
    it('updates when media query changes', async () => {
        const listeners = [];
        const mockMatchMedia = {
            matches: false,
            media: '(max-width: 768px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((event, listener) => {
                if (event === 'change') {
                    listeners.push(listener);
                }
            }),
            removeEventListener: vi.fn((event, listener) => {
                if (event === 'change') {
                    const index = listeners.indexOf(listener);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            }),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia).mockReturnValue(mockMatchMedia);
        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(false);
        expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        // Simulate media query change
        act(() => {
            listeners[0]({ matches: true, media: '(max-width: 768px)' });
        });
        expect(result.current).toBe(true);
    });
    it('cleans up event listener on unmount', () => {
        const mockMatchMedia = {
            matches: false,
            media: '(max-width: 768px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia).mockReturnValue(mockMatchMedia);
        const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(mockMatchMedia.addEventListener).toHaveBeenCalled();
        unmount();
        expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
    it('supports common breakpoint queries', () => {
        const mockMatchMedia = {
            matches: true,
            media: '',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia).mockReturnValue(mockMatchMedia);
        renderHook(() => useMediaQuery('(min-width: 640px)'));
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 640px)');
        renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
        renderHook(() => useMediaQuery('(min-width: 1024px)'));
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
        renderHook(() => useMediaQuery('(min-width: 1280px)'));
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1280px)');
    });
    it('handles multiple media query instances independently', () => {
        const listeners1 = [];
        const listeners2 = [];
        const mockMatchMedia1 = {
            matches: false,
            media: '(max-width: 768px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((event, listener) => {
                if (event === 'change')
                    listeners1.push(listener);
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        const mockMatchMedia2 = {
            matches: true,
            media: '(min-width: 1024px)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((event, listener) => {
                if (event === 'change')
                    listeners2.push(listener);
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
        vi.mocked(window.matchMedia)
            .mockReturnValueOnce(mockMatchMedia1)
            .mockReturnValueOnce(mockMatchMedia2);
        const { result: result1 } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        const { result: result2 } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
        expect(result1.current).toBe(false);
        expect(result2.current).toBe(true);
        // Change first media query
        act(() => {
            listeners1[0]({ matches: true, media: '(max-width: 768px)' });
        });
        expect(result1.current).toBe(true);
        expect(result2.current).toBe(true);
        // Change second media query
        act(() => {
            listeners2[0]({ matches: false, media: '(min-width: 1024px)' });
        });
        expect(result1.current).toBe(true);
        expect(result2.current).toBe(false);
    });
});
//# sourceMappingURL=useMediaQuery.test.js.map