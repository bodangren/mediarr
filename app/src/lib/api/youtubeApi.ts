import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

const videoSchema = z.object({
  id: z.number(),
  videoId: z.string(),
  title: z.string(),
  channel: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  publishedAt: z.string().nullable().optional(),
  isWatched: z.boolean(),
  position: z.number(),
  streamUrl: z.string(),
  thumbUrl: z.string(),
});

const listSchema = z.object({ items: z.array(videoSchema), count: z.number() });

export type YoutubeVideo = z.infer<typeof videoSchema>;

/** YouTube library client (track feature_youtube_library_20261107). */
export function createYoutubeApi(client: ApiHttpClient) {
  return {
    listVideos(limit = 200): Promise<{ items: YoutubeVideo[]; count: number }> {
      return client.request({ path: '/api/youtube/videos', query: { limit } }, listSchema);
    },
  };
}
