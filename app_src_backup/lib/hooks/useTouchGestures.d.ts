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
export declare function useTouchGestures(element: HTMLElement | null, options?: TouchGesturesOptions): void;
//# sourceMappingURL=useTouchGestures.d.ts.map