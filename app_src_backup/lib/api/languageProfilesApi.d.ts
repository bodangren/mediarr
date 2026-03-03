import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
/**
 * Schema for a single language setting within a profile
 */
export declare const languageSettingSchema: z.ZodObject<{
    languageCode: z.ZodString;
    isForced: z.ZodBoolean;
    isHi: z.ZodBoolean;
    audioExclude: z.ZodBoolean;
    score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    audioExclude: boolean;
}, {
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    audioExclude: boolean;
}>;
/**
 * Schema for a language profile
 */
export declare const languageProfileSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    languages: z.ZodArray<z.ZodObject<{
        languageCode: z.ZodString;
        isForced: z.ZodBoolean;
        isHi: z.ZodBoolean;
        audioExclude: z.ZodBoolean;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }, {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }>, "many">;
    cutoff: z.ZodString;
    upgradeAllowed: z.ZodBoolean;
    mustContain: z.ZodArray<z.ZodString, "many">;
    mustNotContain: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    cutoff: string;
    languages: {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }[];
    upgradeAllowed: boolean;
    mustContain: string[];
    mustNotContain: string[];
}, {
    name: string;
    id: number;
    cutoff: string;
    languages: {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }[];
    upgradeAllowed: boolean;
    mustContain: string[];
    mustNotContain: string[];
}>;
/**
 * Schema for creating/updating a language profile
 */
export declare const languageProfileInputSchema: z.ZodObject<{
    name: z.ZodString;
    languages: z.ZodArray<z.ZodObject<{
        languageCode: z.ZodString;
        isForced: z.ZodBoolean;
        isHi: z.ZodBoolean;
        audioExclude: z.ZodBoolean;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }, {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }>, "many">;
    cutoff: z.ZodOptional<z.ZodString>;
    upgradeAllowed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    languages: {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }[];
    cutoff?: string | undefined;
    upgradeAllowed?: boolean | undefined;
}, {
    name: string;
    languages: {
        languageCode: string;
        isForced: boolean;
        isHi: boolean;
        score: number;
        audioExclude: boolean;
    }[];
    cutoff?: string | undefined;
    upgradeAllowed?: boolean | undefined;
}>;
/**
 * Schema for language setting input (subset of LanguageSetting for create/update)
 */
export declare const languageSettingInputSchema: z.ZodObject<{
    languageCode: z.ZodString;
    isForced: z.ZodBoolean;
    isHi: z.ZodBoolean;
    audioExclude: z.ZodBoolean;
    score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    audioExclude: boolean;
}, {
    languageCode: string;
    isForced: boolean;
    isHi: boolean;
    score: number;
    audioExclude: boolean;
}>;
export type LanguageSetting = z.infer<typeof languageSettingSchema>;
export type LanguageProfile = z.infer<typeof languageProfileSchema>;
export type LanguageSettingInput = z.infer<typeof languageSettingInputSchema>;
export type LanguageProfileInput = z.infer<typeof languageProfileInputSchema>;
export declare function createLanguageProfilesApi(client: ApiHttpClient): {
    /**
     * Get all language profiles
     */
    listProfiles(): Promise<LanguageProfile[]>;
    /**
     * Get a single language profile by ID
     */
    getProfile(id: number): Promise<LanguageProfile>;
    /**
     * Create a new language profile
     */
    createProfile(input: LanguageProfileInput): Promise<LanguageProfile>;
    /**
     * Update an existing language profile
     */
    updateProfile(id: number, input: LanguageProfileInput): Promise<LanguageProfile>;
    /**
     * Delete a language profile
     */
    deleteProfile(id: number): Promise<{
        id: number;
    }>;
};
//# sourceMappingURL=languageProfilesApi.d.ts.map