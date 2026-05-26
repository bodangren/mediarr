import { z } from 'zod';

/**
 * Shared Zod schema for bulk update operation results.
 * Used by both MovieRepository and SeriesRepository.
 */
export const bulkUpdateResultSchema = z.object({
  updated: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    movieId: z.number().optional(),
    seriesId: z.number().optional(),
    error: z.string(),
  })).optional(),
});

export type BulkUpdateResult = z.infer<typeof bulkUpdateResultSchema>;
