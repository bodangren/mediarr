/**
 * Hook to persist state in localStorage.
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if nothing is stored in localStorage
 * @returns A tuple containing the current value and a setter function
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('app:theme', 'dark');
 * const [preferences, setPreferences] = useLocalStorage('app:prefs', { sidebarOpen: true });
 * ```
 */
export declare function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void];
//# sourceMappingURL=useLocalStorage.d.ts.map