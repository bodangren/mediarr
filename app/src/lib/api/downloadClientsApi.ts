import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

export const torrentLimitsSchema = z.object({
  maxActiveDownloads: z.number(),
  maxActiveSeeds: z.number(),
  globalDownloadLimitKbps: z.number().nullable(),
  globalUploadLimitKbps: z.number().nullable(),
  incompleteDirectory: z.string(),
  completeDirectory: z.string(),
  seedRatioLimit: z.number(),
  seedTimeLimitMinutes: z.number(),
  seedLimitAction: z.enum(['pause', 'remove']),
});

export type TorrentLimitsSettings = z.infer<typeof torrentLimitsSchema>;

export function createDownloadClientApi(client: ApiHttpClient) {
  return {
    get(): Promise<TorrentLimitsSettings> {
      return client.request(
        { path: routeMap.downloadClient },
        torrentLimitsSchema,
      );
    },

    save(input: TorrentLimitsSettings): Promise<TorrentLimitsSettings> {
      return client.request(
        {
          path: routeMap.downloadClient,
          method: 'PUT',
          body: input,
        },
        torrentLimitsSchema,
      );
    },
  };
}
