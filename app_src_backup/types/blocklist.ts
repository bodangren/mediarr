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

export const removeBlocklistSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type RemoveBlocklistResult = z.infer<typeof removeBlocklistSchema>;

export const clearBlocklistSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type ClearBlocklistResult = z.infer<typeof clearBlocklistSchema>;
