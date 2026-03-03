/**
 * Color impaired mode utilities for accessibility.
 */
const COLOR_IMPAIRED_KEY = 'mediarr.color-impaired';
/**
 * Loads the color impaired mode preference from localStorage.
 * @returns true if color impaired mode is enabled, false otherwise.
 */
export function loadColorImpairedMode() {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        const stored = localStorage.getItem(COLOR_IMPAIRED_KEY);
        return stored === 'true';
    }
    catch {
        return false;
    }
}
/**
 * Applies the color impaired mode setting to the document.
 * @param enabled Whether color impaired mode should be enabled.
 */
export function applyColorImpairedMode(enabled) {
    if (typeof document === 'undefined') {
        return;
    }
    document.documentElement.dataset.colorImpaired = enabled ? 'true' : 'false';
}
/**
 * Toggles the color impaired mode setting.
 * Saves to localStorage and applies to the document.
 * @returns The new color impaired mode state.
 */
export function toggleColorImpairedMode() {
    const current = loadColorImpairedMode();
    const next = !current;
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(COLOR_IMPAIRED_KEY, String(next));
        }
        catch {
            // Ignore storage errors
        }
    }
    applyColorImpairedMode(next);
    return next;
}
export { COLOR_IMPAIRED_KEY };
//# sourceMappingURL=colorImpaired.js.map