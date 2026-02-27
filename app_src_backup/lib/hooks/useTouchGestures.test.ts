import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTouchGestures } from './useTouchGestures';

describe('useTouchGestures', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);
  });

  it('detects left swipe gesture', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeLeft,
        threshold: 50,
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 40, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 30, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('detects right swipe gesture', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeRight,
        threshold: 50,
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 0, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 60, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 70, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('does not trigger swipe below threshold', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeLeft,
        threshold: 50,
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 80, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 75, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('ignores vertical swipes (not configured)', () => {
    const onSwipeUp = vi.fn();
    const onSwipeDown = vi.fn();
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 50, clientY: 100 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 50, clientY: 40 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 30 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeUp).not.toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(mockElement, 'removeEventListener');

    const { unmount } = renderHook(() => useTouchGestures(mockElement, { threshold: 50 }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('resets swipe state after gesture completes', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeLeft,
        threshold: 50,
      })
    );

    // First swipe
    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 40, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 30, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);

    // Second swipe
    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 40, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 30, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(2);
  });

  it('handles diagonal swipes correctly based on dominant direction', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeLeft,
        threshold: 50,
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 40, clientY: 70 } as Touch], // Moves left and slightly down
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 30, clientY: 75 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    // Should detect as left swipe since horizontal movement is larger
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('supports custom threshold values', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures(mockElement, {
        onSwipeRight,
        threshold: 100, // Higher threshold
      })
    );

    act(() => {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 0, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 60, clientY: 50 } as Touch], // Only 60px movement
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchMoveEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 70, clientY: 50 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(touchEndEvent);
    });

    // Should not trigger due to high threshold
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
