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

export const addTorrentResultSchema = z.object({
  infoHash: z.string(),
  name: z.string(),
  path: z.string(),
});

export type AddTorrentResult = z.infer<typeof addTorrentResultSchema>;

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

    /**
     * Hands one magnet to the built-in torrent engine.
     *
     * The operator playbooks need a way to add a torrent that is not the REST API (they must not
     * orchestrate through REST) and not a scraper. This is the SPA's own client call — the
     * browser bridge drives the rendered form, which the doctrine treats as a real surface.
     */
    addTorrent(input: { magnetUrl: string; path?: string }): Promise<AddTorrentResult> {
      return client.request(
        {
          path: routeMap.torrents,
          method: 'POST',
          body: input,
        },
        addTorrentResultSchema,
      );
    },
  };
}
