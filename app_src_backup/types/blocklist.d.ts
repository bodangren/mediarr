import { z } from 'zod';
export declare const blocklistItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    seriesId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    movieTitle: z.ZodOptional<z.ZodString>;
    moviePosterUrl: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    releaseTitle: z.ZodString;
    quality: z.ZodOptional<z.ZodString>;
    dateBlocked: z.ZodString;
    reason: z.ZodString;
    indexer: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    seriesId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    movieTitle: z.ZodOptional<z.ZodString>;
    moviePosterUrl: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    releaseTitle: z.ZodString;
    quality: z.ZodOptional<z.ZodString>;
    dateBlocked: z.ZodString;
    reason: z.ZodString;
    indexer: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    seriesId: z.ZodOptional<z.ZodNumber>;
    seriesTitle: z.ZodOptional<z.ZodString>;
    episodeId: z.ZodOptional<z.ZodNumber>;
    seasonNumber: z.ZodOptional<z.ZodNumber>;
    episodeNumber: z.ZodOptional<z.ZodNumber>;
    movieId: z.ZodOptional<z.ZodNumber>;
    movieTitle: z.ZodOptional<z.ZodString>;
    moviePosterUrl: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    releaseTitle: z.ZodString;
    quality: z.ZodOptional<z.ZodString>;
    dateBlocked: z.ZodString;
    reason: z.ZodString;
    indexer: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export type BlocklistItem = z.infer<typeof blocklistItemSchema>;
export interface BlocklistQuery {
    page?: number;
    pageSize?: number;
    seriesId?: number;
    movieId?: number;
    quality?: string;
    from?: string;
    to?: string;
}
export declare const removeBlocklistSchema: z.ZodObject<{
    deletedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deletedCount: number;
}, {
    deletedCount: number;
}>;
export type RemoveBlocklistResult = z.infer<typeof removeBlocklistSchema>;
export declare const clearBlocklistSchema: z.ZodObject<{
    deletedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deletedCount: number;
}, {
    deletedCount: number;
}>;
export type ClearBlocklistResult = z.infer<typeof clearBlocklistSchema>;
//# sourceMappingURL=blocklist.d.ts.map