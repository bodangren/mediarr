import { useState, useEffect } from 'react';
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
export function useLocalStorage(key, initialValue) {
    // Get initial value from localStorage or use the provided initialValue
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        }
        catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });
    // Update localStorage when storedValue changes
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        }
        catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);
    return [storedValue, setStoredValue];
}
//# sourceMappingURL=useLocalStorage.js.map