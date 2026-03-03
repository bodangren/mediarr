/**
 * Common language codes and names for subtitle management
 */
export interface Language {
    code: string;
    name: string;
}
export declare const COMMON_LANGUAGES: readonly Language[];
/**
 * Get language name by code
 */
export declare function getLanguageName(code: string): string;
/**
 * Get language object by code
 */
export declare function getLanguage(code: string): Language | undefined;
/**
 * Check if language code exists
 */
export declare function isValidLanguageCode(code: string): boolean;
//# sourceMappingURL=languages.d.ts.map