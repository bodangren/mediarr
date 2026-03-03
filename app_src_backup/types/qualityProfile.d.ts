import { z } from 'zod';
/**
 * Quality definition - represents a quality level (resolution + source)
 */
export declare const qualitySchema: z.ZodObject<{
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
}>;
export type Quality = z.infer<typeof qualitySchema>;
/**
 * Quality definition for form inputs (without id)
 */
export interface QualityDefinition {
    resolution: string;
    source: string;
}
/**
 * Quality Profile - groups qualities together with a cutoff
 */
export declare const qualityProfileSchema: z.ZodObject<{
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
export type QualityProfile = z.infer<typeof qualityProfileSchema>;
/**
 * Input for creating a new quality profile
 */
export interface CreateQualityProfileInput {
    name: string;
    cutoffId: number;
    qualities: QualityDefinition[];
    languageProfileId?: number;
}
/**
 * Input for updating an existing quality profile
 */
export interface UpdateQualityProfileInput {
    name?: string;
    cutoffId?: number;
    qualities?: QualityDefinition[];
    languageProfileId?: number;
}
/**
 * Pre-defined quality definitions (should be configurable via API)
 */
export declare const PREDEFINED_RESOLUTIONS: readonly ["2160p", "1080p", "720p", "480p", "SD"];
export declare const PREDEFINED_SOURCES: readonly ["Bluray", "Web-DL", "HDTV", "TV", "DVD", "Unknown"];
/**
 * Get all possible quality combinations
 */
export declare function getAllQualities(): QualityDefinition[];
/**
 * Format quality for display
 */
export declare function formatQuality(quality: QualityDefinition): string;
/**
 * Check if a quality is HD
 */
export declare function isQualityHD(quality: QualityDefinition): boolean;
/**
 * Sort qualities by quality rank (higher quality first)
 */
export declare function sortQualitiesByRank(qualities: QualityDefinition[]): QualityDefinition[];
//# sourceMappingURL=qualityProfile.d.ts.map