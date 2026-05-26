import { z } from 'zod';

/**
 * Shared Zod schema for organize operation results.
 * Used by both MovieOrganizeService and SeriesOrganizeService.
 */
export const organizeResultSchema = z.object({
  renamed: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    movieId: z.number().optional(),
    episodeId: z.number().optional(),
    error: z.string(),
  })),
});

export type OrganizeResult = z.infer<typeof organizeResultSchema>;
