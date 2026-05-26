import { z } from 'zod';

/**
 * Shared Zod schemas for playback types.
 * Used by PlaybackService and PlaybackRepository.
 */

export const playbackTargetSchema = z.object({
  mediaType: z.enum(['MOVIE', 'EPISODE']),
  mediaId: z.number(),
});

export const playbackManifestRequestSchema = playbackTargetSchema.extend({
  userId: z.string().optional(),
});

export const playbackProgressKeySchema = z.object({
  mediaType: z.enum(['MOVIE', 'EPISODE']),
  mediaId: z.number(),
  userId: z.string(),
});

export type PlaybackTarget = z.infer<typeof playbackTargetSchema>;
export type PlaybackManifestRequest = z.infer<typeof playbackManifestRequestSchema>;
export type PlaybackProgressKey = z.infer<typeof playbackProgressKeySchema>;
