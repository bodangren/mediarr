import { z } from 'zod';

export const blocklistItemSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  seriesTitle: z.string(),
  episodeId: z.number().optional(),
  seasonNumber: z.number().optional(),
  episodeNumber: z.number().optional(),
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
