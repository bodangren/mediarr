/**
 * Hook for accessing and manipulating the theme context.
 */
import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
/**
 * Hook to access the theme context.
 * @throws Error if used outside of a ThemeProvider.
 * @returns The theme context value containing theme, setTheme, and toggleTheme.
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === null) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
//# sourceMappingURL=useTheme.js.map