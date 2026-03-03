import { type ReactNode } from 'react';
export type ThemePreference = 'light' | 'dark' | 'auto';
export interface ThemeContextValue {
    theme: ThemePreference;
    setTheme: (theme: ThemePreference) => void;
    toggleTheme: () => void;
    colorImpairedMode: boolean;
    toggleColorImpairedMode: () => void;
}
export interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemePreference;
    storageKey?: string;
}
declare const ThemeContext: import("react").Context<ThemeContextValue | null>;
/**
 * Provider for theme context.
 * Manages theme state, persistence, and application to the document.
 */
export declare function ThemeProvider({ children, defaultTheme, storageKey, }: ThemeProviderProps): import("react/jsx-runtime").JSX.Element;
export { ThemeContext };
//# sourceMappingURL=ThemeProvider.d.ts.map