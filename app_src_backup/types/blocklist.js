import { z } from 'zod';
export const blocklistItemSchema = z.object({
    id: z.number(),
    // For TV
    seriesId: z.number().optional(),
    seriesTitle: z.string().optional(),
    episodeId: z.number().optional(),
    seasonNumber: z.number().optional(),
    episodeNumber: z.number().optional(),
    // For Movies
    movieId: z.number().optional(),
    movieTitle: z.string().optional(),
    moviePosterUrl: z.string().optional(),
    year: z.number().optional(),
    // Common
    releaseTitle: z.string(),
    quality: z.string().optional(),
    dateBlocked: z.string(),
    reason: z.string(),
    indexer: z.string().optional(),
    size: z.number().optional(),
}).passthrough();
export const removeBlocklistSchema = z.object({
    deletedCount: z.number().int().nonnegative(),
});
export const clearBlocklistSchema = z.object({
    deletedCount: z.number().int().nonnegative(),
});
//# sourceMappingURL=blocklist.js.map