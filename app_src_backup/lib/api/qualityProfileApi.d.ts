import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const qualityProfileSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    cutoffId: z.ZodNumber;
    qualities: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        resolution: z.ZodString;
        source: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        source: string;
        name: string;
        id: number;
        resolution: string;
    }, {
        source: string;
        name: string;
        id: number;
        resolution: string;
    }>, "many">;
    languageProfileId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
    cutoffId: number;
    qualities: {
        source: string;
        name: string;
        id: number;
        resolution: string;
    }[];
    languageProfileId?: number | undefined;
}, {
    name: string;
    id: number;
    cutoffId: number;
    qualities: {
        source: string;
        name: string;
        id: number;
        resolution: string;
    }[];
    languageProfileId?: number | undefined;
}>;
/**
 * Language profile (simplified for now)
 */
declare const languageProfileSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: number;
}, {
    name: string;
    id: number;
}>;
export interface CreateQualityProfileInput {
    name: string;
    cutoffId: number;
    qualities: Array<{
        resolution: string;
        source: string;
    }>;
    languageProfileId?: number;
}
export interface UpdateQualityProfileInput {
    name?: string;
    cutoffId?: number;
    qualities?: Array<{
        resolution: string;
        source: string;
    }>;
    languageProfileId?: number;
}
export type QualityProfileItem = z.infer<typeof qualityProfileSchema>;
export type LanguageProfileItem = z.infer<typeof languageProfileSchema>;
export declare function createQualityProfileApi(client: ApiHttpClient): {
    /**
     * Get all quality profiles
     */
    list(): Promise<QualityProfileItem[]>;
    /**
     * Get a single quality profile by ID
     */
    get(id: number): Promise<QualityProfileItem>;
    /**
     * Create a new quality profile
     */
    create(input: CreateQualityProfileInput): Promise<QualityProfileItem>;
    /**
     * Update an existing quality profile
     */
    update(id: number, input: UpdateQualityProfileInput): Promise<QualityProfileItem>;
    /**
     * Delete a quality profile
     */
    delete(id: number): Promise<{
        id: number;
    }>;
    /**
     * Get all available language profiles
     */
    listLanguageProfiles(): Promise<LanguageProfileItem[]>;
};
export {};
//# sourceMappingURL=qualityProfileApi.d.ts.map