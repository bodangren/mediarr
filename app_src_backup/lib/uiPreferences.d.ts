export type ThemePreference = 'dark' | 'light' | 'auto';
export type DateFormatPreference = 'relative' | 'short' | 'long';
export type TimeFormatPreference = '12h' | '24h';
export interface UIPreferences {
    theme: ThemePreference;
    dateFormat: DateFormatPreference;
    timeFormat: TimeFormatPreference;
    showRelativeDates: boolean;
    colorImpairedMode: boolean;
}
export declare const UI_PREFERENCES_STORAGE_KEY = "mediarr.ui.preferences";
export declare const DEFAULT_UI_PREFERENCES: UIPreferences;
interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export declare function loadUIPreferences(storage?: StorageLike): UIPreferences;
export declare function saveUIPreferences(preferences: UIPreferences, storage?: StorageLike): void;
export declare function applyUIPreferences(preferences: UIPreferences, doc?: Document): void;
export {};
//# sourceMappingURL=uiPreferences.d.ts.map