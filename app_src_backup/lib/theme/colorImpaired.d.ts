/**
 * Color impaired mode utilities for accessibility.
 */
declare const COLOR_IMPAIRED_KEY = "mediarr.color-impaired";
/**
 * Loads the color impaired mode preference from localStorage.
 * @returns true if color impaired mode is enabled, false otherwise.
 */
export declare function loadColorImpairedMode(): boolean;
/**
 * Applies the color impaired mode setting to the document.
 * @param enabled Whether color impaired mode should be enabled.
 */
export declare function applyColorImpairedMode(enabled: boolean): void;
/**
 * Toggles the color impaired mode setting.
 * Saves to localStorage and applies to the document.
 * @returns The new color impaired mode state.
 */
export declare function toggleColorImpairedMode(): boolean;
export { COLOR_IMPAIRED_KEY };
//# sourceMappingURL=colorImpaired.d.ts.map