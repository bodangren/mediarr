import { z } from 'zod';

/**
 * TMDB "similar" titles for movie/series detail pages (owner request 2026-11-28).
 * `inLibrary`/`libraryId` let a tile deep-link instead of offering a request.
 */
export const similarTitleSchema = z.object({
  mediaType: z.enum(['MOVIE', 'SERIES']),
  tmdbId: z.number(),
  title: z.string(),
  year: z.number().nullable(),
  posterUrl: z.string().nullable(),
  overview: z.string().nullable(),
  voteAverage: z.number().nullable(),
  inLibrary: z.boolean(),
  libraryId: z.number().nullable(),
});

export const similarTitlesResponseSchema = z.object({
  id: z.number(),
  items: z.array(similarTitleSchema),
});

export type SimilarTitle = z.infer<typeof similarTitleSchema>;
