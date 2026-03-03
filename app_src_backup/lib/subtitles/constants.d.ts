/**
 * Shared constants for subtitle history and blacklist features
 */
/**
 * Available subtitle actions/types
 */
export declare const SUBTITLE_ACTIONS: readonly [{
    readonly value: "download";
    readonly label: "Downloaded";
}, {
    readonly value: "upgrade";
    readonly label: "Upgraded";
}, {
    readonly value: "manual";
    readonly label: "Manual";
}, {
    readonly value: "upload";
    readonly label: "Uploaded";
}, {
    readonly value: "sync";
    readonly label: "Synced";
}];
/**
 * Simple string array of subtitle actions for HistoryFilters component
 */
export declare const SUBTITLE_ACTIONS_VALUES: readonly string[];
/**
 * Common subtitle providers
 */
export declare const SUBTITLE_PROVIDERS: readonly [{
    readonly value: "OpenSubtitles";
    readonly label: "OpenSubtitles";
}, {
    readonly value: "Subscene";
    readonly label: "Subscene";
}, {
    readonly value: "Addic7ed";
    readonly label: "Addic7ed";
}, {
    readonly value: "Podnapisi";
    readonly label: "Podnapisi";
}, {
    readonly value: "Yify";
    readonly label: "YTS/Yify";
}, {
    readonly value: "SubsWiki";
    readonly label: "SubsWiki";
}, {
    readonly value: "Napisy24";
    readonly label: "Napisy24";
}, {
    readonly value: "Napisy";
    readonly label: "Napisy.pl";
}];
/**
 * Simple string array of subtitle providers for HistoryFilters component
 */
export declare const SUBTITLE_PROVIDERS_VALUES: readonly string[];
/**
 * Language codes for subtitle filtering
 * Re-exports from constants/languages.ts with a subtitle-specific array
 */
export declare const SUBTITLE_LANGUAGES: readonly string[];
/**
 * Helper to convert readonly tuples to mutable arrays for component compatibility
 * Some UI components require mutable arrays even though we use readonly for type safety
 */
export declare function toMutable<T>(arr: readonly T[]): T[];
/**
 * Type for subtitle action values
 */
export type SubtitleAction = (typeof SUBTITLE_ACTIONS)[number]['value'];
/**
 * Type for subtitle provider values
 */
export type SubtitleProvider = (typeof SUBTITLE_PROVIDERS)[number]['value'];
//# sourceMappingURL=constants.d.ts.map