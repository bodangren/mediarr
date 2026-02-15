import { useEffect, useRef } from 'react';

export interface TouchGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

/**
 * Hook for detecting touch gestures (swipe) on an element.
 *
 * @param ref - The DOM element to attach gesture listeners to
 * @param options - Configuration options for gesture detection
 * @param options.onSwipeLeft - Callback when left swipe is detected
 * @param options.onSwipeRight - Callback when right swipe is detected
 * @param options.onSwipeUp - Callback when up swipe is detected
 * @param options.onSwipeDown - Callback when down swipe is detected
 * @param options.threshold - Minimum distance (in pixels) to trigger a swipe (default: 50)
 *
 * @example
 * ```tsx
 * const sidebarRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 *
 * useTouchGestures(sidebarRef.current, {
 *   onSwipeLeft: () => setIsOpen(false),
 *   onSwipeRight: () => setIsOpen(true),
 *   threshold: 50,
 * });
 *
 * return <div ref={sidebarRef}>...</div>;
 * ```
 */
export function useTouchGestures(
  element: HTMLElement | null,
  options: TouchGesturesOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!element) {
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Optional: Prevent default behavior if needed
      // e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchStart = touchStartRef.current;
      if (!touchStart) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine the dominant direction of the gesture
      const isHorizontal = absDeltaX > absDeltaY;

      if (isHorizontal) {
        // Horizontal swipe
        if (absDeltaX >= threshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (absDeltaY >= threshold) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      // Reset touch start position
      touchStartRef.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}
