import { useState, useEffect } from 'react';
/**
 * Hook to detect if a media query matches the current viewport.
 *
 * @param query - The media query string to test (e.g., '(max-width: 768px)')
 * @returns Boolean indicating whether the media query currently matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
 * const isDesktop = useMediaQuery('(min-width: 1025px)');
 * ```
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        // Get the initial match state
        const mediaQueryList = window.matchMedia(query);
        setMatches(mediaQueryList.matches);
        // Define event handler for media query changes
        const handleChange = (event) => {
            setMatches(event.matches);
        };
        // Add event listener for modern browsers
        mediaQueryList.addEventListener('change', handleChange);
        // Cleanup function to remove event listener
        return () => {
            mediaQueryList.removeEventListener('change', handleChange);
        };
    }, [query]);
    return matches;
}
/**
 * Common breakpoint queries for responsive design.
 */
export const breakpoints = {
    sm: '(min-width: 640px)', // Small devices (landscape phones)
    md: '(min-width: 768px)', // Medium devices (tablets)
    lg: '(min-width: 1024px)', // Large devices (desktops)
    xl: '(min-width: 1280px)', // Extra large devices
    '2xl': '(min-width: 1536px)', // 2X large devices
    // Max-width breakpoints
    maxSm: '(max-width: 639px)',
    maxMd: '(max-width: 767px)',
    maxLg: '(max-width: 1023px)',
    maxXl: '(max-width: 1279px)',
};
//# sourceMappingURL=useMediaQuery.js.map