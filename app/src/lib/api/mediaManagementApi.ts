import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

export const mediaManagementSchema = z.object({
  movieRootFolder: z.string(),
  tvRootFolder: z.string(),
});

export type MediaManagementSettings = z.infer<typeof mediaManagementSchema>;

export function createMediaManagementApi(client: ApiHttpClient) {
  return {
    get(): Promise<MediaManagementSettings> {
      return client.request(
        { path: '/api/settings/media' },
        mediaManagementSchema,
      );
    },

    save(input: MediaManagementSettings): Promise<MediaManagementSettings> {
      return client.request(
        { path: '/api/settings/media', method: 'PUT', body: input },
        mediaManagementSchema,
      );
    },
  };
}
