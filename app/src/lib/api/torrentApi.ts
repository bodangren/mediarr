import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const torrentSchema = z.object({
  infoHash: z.string(),
  name: z.string(),
  status: z.string().optional(),
  progress: z.number().optional(),
  downloadSpeed: z.number().optional(),
  uploadSpeed: z.number().optional(),
  size: z.string(),
  downloaded: z.string(),
  uploaded: z.string(),
  eta: z.number().nullable().optional(),
  path: z.string().optional(),
  completedAt: z.string().nullable().optional(),
}).passthrough();

const torrentMutationSchema = z.object({
  infoHash: z.string(),
  status: z.string().optional(),
  removed: z.boolean().optional(),
});

export type TorrentItem = z.infer<typeof torrentSchema>;

export interface TorrentListQuery {
  page?: number;
  pageSize?: number;
}

export interface AddTorrentInput {
  magnetUrl?: string;
  path?: string;
  torrentFileBase64?: string;
}

export interface SpeedLimitsInput {
  download?: number;
  upload?: number;
}

export function createTorrentApi(client: ApiHttpClient) {
  return {
    list(query: TorrentListQuery = {}): Promise<PaginatedResult<TorrentItem>> {
      return client.requestPaginated(
        {
          path: routeMap.torrents,
          query,
        },
        torrentSchema,
      );
    },

    get(infoHash: string): Promise<TorrentItem> {
      return client.request(
        {
          path: routeMap.torrentDetail(infoHash),
        },
        torrentSchema,
      );
    },

    add(input: AddTorrentInput): Promise<{ infoHash: string; name?: string }> {
      return client.request(
        {
          path: routeMap.torrents,
          method: 'POST',
          body: input,
        },
        z.object({
          infoHash: z.string(),
          name: z.string().optional(),
        }),
      );
    },

    pause(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>> {
      return client.request(
        {
          path: routeMap.torrentPause(infoHash),
          method: 'PATCH',
        },
        torrentMutationSchema,
      );
    },

    resume(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>> {
      return client.request(
        {
          path: routeMap.torrentResume(infoHash),
          method: 'PATCH',
        },
        torrentMutationSchema,
      );
    },

    remove(infoHash: string): Promise<z.infer<typeof torrentMutationSchema>> {
      return client.request(
        {
          path: routeMap.torrentDelete(infoHash),
          method: 'DELETE',
        },
        torrentMutationSchema,
      );
    },

    setSpeedLimits(input: SpeedLimitsInput): Promise<{ updated: boolean; limits: SpeedLimitsInput }> {
      return client.request(
        {
          path: routeMap.torrentSpeedLimits,
          method: 'PATCH',
          body: input,
        },
        z.object({
          updated: z.boolean(),
          limits: z.object({
            download: z.number().optional(),
            upload: z.number().optional(),
          }),
        }),
      );
    },
  };
}
