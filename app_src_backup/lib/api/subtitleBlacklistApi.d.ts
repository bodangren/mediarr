import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
/**
 * Schema for a blacklisted subtitle item
 */
export declare const blacklistedSubtitleSchema: z.ZodObject<{
    id: z.ZodNumber;
    type: z.ZodEnum<["series", "movie"]>;
    seriesId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    episodeTitle: z.ZodOptional<z.ZodString>;
    movieId: z.ZodOptional<z.ZodNumber>;
    movieTitle: z.ZodOptional<z.ZodString>;
    languageCode: z.ZodString;
    provider: z.ZodString;
    reason: z.ZodString;
    timestamp: z.ZodString;
    subtitlePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "series" | "movie";
    id: number;
    provider: string;
    languageCode: string;
    reason: string;
    timestamp: string;
    movieId?: number | undefined;
    episodeTitle?: string | undefined;
    movieTitle?: string | undefined;
    seasonNumber?: number | undefined;
    episodeNumber?: number | undefined;
    episodeId?: number | undefined;
    seriesId?: number | undefined;
    seriesTitle?: string | undefined;
    subtitlePath?: string | undefined;
}, {
    type: "series" | "movie";
    id: number;
    provider: string;
    languageCode: string;
    reason: string;
    timestamp: string;
    movieId?: number | undefined;
    episodeTitle?: string | undefined;
    movieTitle?: string | undefined;
    seasonNumber?: number | undefined;
    episodeNumber?: number | undefined;
    episodeId?: number | undefined;
    seriesId?: number | undefined;
    seriesTitle?: string | undefined;
    subtitlePath?: string | undefined;
}>;
/**
 * Schema for remove/clear operation result
 */
export declare const blacklistOperationResultSchema: z.ZodObject<{
    deletedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deletedCount: number;
}, {
    deletedCount: number;
}>;
/**
 * Type for a blacklisted subtitle item
 */
export type BlacklistedSubtitle = z.infer<typeof blacklistedSubtitleSchema>;
/**
 * Type for blacklist operation result
 */
export type BlacklistOperationResult = z.infer<typeof blacklistOperationResultSchema>;
/**
 * Query parameters for blacklist list endpoints
 */
export interface BlacklistQueryParams {
    page?: number;
    pageSize?: number;
    provider?: string;
    languageCode?: string;
}
/**
 * Subtitle Blacklist API client
 *
 * Manages blacklisted subtitles for the Bazarr-style subtitle blacklist feature.
 * Allows viewing and managing subtitles that were rejected or blacklisted.
 */
export declare function createSubtitleBlacklistApi(client: ApiHttpClient): {
    /**
     * List blacklisted subtitles for series
     */
    listBlacklistSeries(params?: BlacklistQueryParams): Promise<PaginatedResult<BlacklistedSubtitle>>;
    /**
     * List blacklisted subtitles for movies
     */
    listBlacklistMovies(params?: BlacklistQueryParams): Promise<PaginatedResult<BlacklistedSubtitle>>;
    /**
     * Remove a specific subtitle from the blacklist
     */
    removeFromBlacklist(id: number): Promise<BlacklistOperationResult>;
    /**
     * Clear all blacklisted subtitles for series
     */
    clearBlacklistSeries(): Promise<BlacklistOperationResult>;
    /**
     * Clear all blacklisted subtitles for movies
     */
    clearBlacklistMovies(): Promise<BlacklistOperationResult>;
};
//# sourceMappingURL=subtitleBlacklistApi.d.ts.map