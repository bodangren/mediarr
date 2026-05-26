import { z } from 'zod';

/**
 * Shared Zod schema for subtitle upload input.
 * Used by both SubtitleInventoryApiService (server) and subtitleApi (app).
 *
 * Note: The app side adds browser-specific fields (File, onUploadProgress).
 * The server side uses the raw content Buffer.
 * This schema defines the common contract fields.
 */
export const subtitleUploadInputSchema = z.object({
  mediaId: z.number(),
  mediaType: z.enum(['movie', 'episode']),
  language: z.string(),
  forced: z.boolean(),
  hearingImpaired: z.boolean(),
});

export type SubtitleUploadInput = z.infer<typeof subtitleUploadInputSchema>;
