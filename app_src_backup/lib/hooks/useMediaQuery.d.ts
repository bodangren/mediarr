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
export declare function useMediaQuery(query: string): boolean;
/**
 * Common breakpoint queries for responsive design.
 */
export declare const breakpoints: {
    readonly sm: "(min-width: 640px)";
    readonly md: "(min-width: 768px)";
    readonly lg: "(min-width: 1024px)";
    readonly xl: "(min-width: 1280px)";
    readonly '2xl': "(min-width: 1536px)";
    readonly maxSm: "(max-width: 639px)";
    readonly maxMd: "(max-width: 767px)";
    readonly maxLg: "(max-width: 1023px)";
    readonly maxXl: "(max-width: 1279px)";
};
//# sourceMappingURL=useMediaQuery.d.ts.map