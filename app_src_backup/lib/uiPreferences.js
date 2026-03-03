export const UI_PREFERENCES_STORAGE_KEY = 'mediarr.ui.preferences';
export const DEFAULT_UI_PREFERENCES = {
    theme: 'dark',
    dateFormat: 'relative',
    timeFormat: '24h',
    showRelativeDates: true,
    colorImpairedMode: false,
};
function resolveStorage(storage) {
    if (storage) {
        return storage;
    }
    if (typeof window === 'undefined') {
        return undefined;
    }
    return window.localStorage;
}
function isThemePreference(value) {
    return value === 'dark' || value === 'light' || value === 'auto';
}
function isDateFormatPreference(value) {
    return value === 'relative' || value === 'short' || value === 'long';
}
function isTimeFormatPreference(value) {
    return value === '12h' || value === '24h';
}
export function loadUIPreferences(storage) {
    const resolvedStorage = resolveStorage(storage);
    if (!resolvedStorage) {
        return DEFAULT_UI_PREFERENCES;
    }
    const raw = resolvedStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_UI_PREFERENCES;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            theme: isThemePreference(parsed.theme) ? parsed.theme : DEFAULT_UI_PREFERENCES.theme,
            dateFormat: isDateFormatPreference(parsed.dateFormat) ? parsed.dateFormat : DEFAULT_UI_PREFERENCES.dateFormat,
            timeFormat: isTimeFormatPreference(parsed.timeFormat) ? parsed.timeFormat : DEFAULT_UI_PREFERENCES.timeFormat,
            showRelativeDates: typeof parsed.showRelativeDates === 'boolean'
                ? parsed.showRelativeDates
                : DEFAULT_UI_PREFERENCES.showRelativeDates,
            colorImpairedMode: typeof parsed.colorImpairedMode === 'boolean'
                ? parsed.colorImpairedMode
                : DEFAULT_UI_PREFERENCES.colorImpairedMode,
        };
    }
    catch {
        return DEFAULT_UI_PREFERENCES;
    }
}
export function saveUIPreferences(preferences, storage) {
    const resolvedStorage = resolveStorage(storage);
    if (!resolvedStorage) {
        return;
    }
    resolvedStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
function resolveTheme(theme, doc) {
    if (theme === 'light' || theme === 'dark') {
        return theme;
    }
    const prefersLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (prefersLight) {
        return 'light';
    }
    if (doc.documentElement.dataset.theme === 'light') {
        return 'light';
    }
    return 'dark';
}
export function applyUIPreferences(preferences, doc) {
    if (!doc) {
        if (typeof document === 'undefined') {
            return;
        }
        doc = document;
    }
    doc.documentElement.dataset.theme = resolveTheme(preferences.theme, doc);
    doc.documentElement.dataset.colorImpaired = preferences.colorImpairedMode ? 'true' : 'false';
}
//# sourceMappingURL=uiPreferences.js.map