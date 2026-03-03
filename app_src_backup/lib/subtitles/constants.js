/**
 * Shared constants for subtitle history and blacklist features
 */
import { COMMON_LANGUAGES } from '@/lib/constants/languages';
/**
 * Available subtitle actions/types
 */
export const SUBTITLE_ACTIONS = [
    { value: 'download', label: 'Downloaded' },
    { value: 'upgrade', label: 'Upgraded' },
    { value: 'manual', label: 'Manual' },
    { value: 'upload', label: 'Uploaded' },
    { value: 'sync', label: 'Synced' },
];
/**
 * Simple string array of subtitle actions for HistoryFilters component
 */
export const SUBTITLE_ACTIONS_VALUES = SUBTITLE_ACTIONS.map(action => action.value);
/**
 * Common subtitle providers
 */
export const SUBTITLE_PROVIDERS = [
    { value: 'OpenSubtitles', label: 'OpenSubtitles' },
    { value: 'Subscene', label: 'Subscene' },
    { value: 'Addic7ed', label: 'Addic7ed' },
    { value: 'Podnapisi', label: 'Podnapisi' },
    { value: 'Yify', label: 'YTS/Yify' },
    { value: 'SubsWiki', label: 'SubsWiki' },
    { value: 'Napisy24', label: 'Napisy24' },
    { value: 'Napisy', label: 'Napisy.pl' },
];
/**
 * Simple string array of subtitle providers for HistoryFilters component
 */
export const SUBTITLE_PROVIDERS_VALUES = SUBTITLE_PROVIDERS.map(provider => provider.value);
/**
 * Language codes for subtitle filtering
 * Re-exports from constants/languages.ts with a subtitle-specific array
 */
export const SUBTITLE_LANGUAGES = COMMON_LANGUAGES.map(lang => lang.code);
/**
 * Helper to convert readonly tuples to mutable arrays for component compatibility
 * Some UI components require mutable arrays even though we use readonly for type safety
 */
export function toMutable(arr) {
    return [...arr];
}
//# sourceMappingURL=constants.js.map