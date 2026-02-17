import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const releaseCandidateSchema = z.object({
  indexer: z.string(),
  indexerId: z.number(),
  title: z.string(),
  guid: z.string().optional(),
  size: z.number(),
  seeders: z.number(),
  leechers: z.number().optional(),
  indexerFlags: z.string().optional(),
  quality: z.string().optional(),
  age: z.number().optional(),
  publishDate: z.string().optional(),
  categories: z.array(z.number()).optional(),
  protocol: z.enum(['torrent', 'usenet']).optional(),
  magnetUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
  infoHash: z.string().optional(),
});

const grabResultSchema = z.object({
  success: z.boolean(),
  downloadId: z.string(),
  message: z.string(),
});

export type ReleaseCandidate = z.infer<typeof releaseCandidateSchema>;
export type GrabResult = z.infer<typeof grabResultSchema>;
export type SearchParams = {
  query?: string;
  type?: 'generic' | 'tvsearch' | 'movie' | 'music' | 'book';
  season?: number;
  episode?: number;
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;
  year?: number;
  artist?: string;
  album?: string;
  author?: string;
  title?: string;
  categories?: number[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export function createReleaseApi(client: ApiHttpClient) {
  return {
    searchCandidates(params: SearchParams): Promise<PaginatedResult<ReleaseCandidate>> {
      const queryParams: Record<string, unknown> = {};
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.pageSize !== undefined) queryParams.pageSize = params.pageSize;
      if (params.sortBy !== undefined) queryParams.sortBy = params.sortBy;
      if (params.sortDir !== undefined) queryParams.sortDir = params.sortDir;

      const bodyParams: Record<string, unknown> = {};
      if (params.query !== undefined) bodyParams.query = params.query;
      if (params.type !== undefined) bodyParams.type = params.type;
      if (params.season !== undefined) bodyParams.season = params.season;
      if (params.episode !== undefined) bodyParams.episode = params.episode;
      if (params.tvdbId !== undefined) bodyParams.tvdbId = params.tvdbId;
      if (params.imdbId !== undefined) bodyParams.imdbId = params.imdbId;
      if (params.tmdbId !== undefined) bodyParams.tmdbId = params.tmdbId;
      if (params.year !== undefined) bodyParams.year = params.year;
      if (params.artist !== undefined) bodyParams.artist = params.artist;
      if (params.album !== undefined) bodyParams.album = params.album;
      if (params.author !== undefined) bodyParams.author = params.author;
      if (params.title !== undefined) bodyParams.title = params.title;
      if (params.categories !== undefined) bodyParams.categories = params.categories;

      return client.requestPaginated(
        {
          path: routeMap.releaseSearch,
          method: 'POST',
          body: bodyParams,
          query: queryParams,
        },
        releaseCandidateSchema,
      );
    },

    grabRelease(guid: string, indexerId: number, downloadClientId?: number): Promise<GrabResult> {
      return client.request(
        {
          path: routeMap.releaseGrab,
          method: 'POST',
          body: { guid, indexerId, downloadClientId },
        },
        grabResultSchema,
      );
    },

    grabCandidate(candidate: Partial<ReleaseCandidate>): Promise<GrabResult> {
      return client.request(
        {
          path: '/api/releases/grab-candidate',
          method: 'POST',
          body: candidate,
        },
        grabResultSchema,
      );
    },
  };
}
