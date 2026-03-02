import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const episodeStatisticsSchema = z.object({
  totalEpisodes: z.number(),
  episodesOnDisk: z.number(),
  episodesMissing: z.number(),
  episodesDownloading: z.number(),
});

// Series schema for type inference
const seriesSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number(),
  monitored: z.boolean(),
  qualityProfileId: z.number(),
  added: z.string(),
  tvdbId: z.number().optional(),
  tmdbId: z.number().optional(),
  imdbId: z.string().optional(),
  path: z.string().optional(),
  status: z.string().optional(),
  overview: z.string().optional(),
  network: z.string().optional(),
  statistics: z.any().optional(),
  seasons: z.any().optional(),
}).passthrough();

// Series organize preview schema
const seriesOrganizePreviewSchema = z.object({
  seriesId: z.number(),
  seriesTitle: z.string(),
  seasonNumber: z.number(),
  episodeId: z.number(),
  episodeNumber: z.number(),
  episodeTitle: z.string().optional(),
  currentPath: z.string(),
  newPath: z.string(),
  isNewPath: z.boolean(),
});

// Episode import file schema
const episodeImportFileSchema = z.object({
  path: z.string(),
  size: z.number(),
  parsedSeriesTitle: z.string().optional(),
  parsedSeasonNumber: z.number().optional(),
  parsedEpisodeNumber: z.number().optional(),
  parsedEndingEpisodeNumber: z.number().optional(),
  parsedQuality: z.string().optional(),
  match: z.object({
    seriesId: z.number(),
    seasonId: z.number().optional(),
    episodeId: z.number().optional(),
    confidence: z.number(),
  }).optional(),
});

// Series search result schema for manual match
const seriesSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  tvdbId: z.number().optional(),
  tmdbId: z.number().optional(),
  seasons: z.array(z.object({
    seasonNumber: z.number(),
    episodeCount: z.number().optional(),
  })).optional(),
});

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
  customFormatScore: z.number().optional(),
});

export type Series = z.infer<typeof seriesSchema>;
export type SeriesOrganizePreview = z.infer<typeof seriesOrganizePreviewSchema>;
export type EpisodeImportFile = z.infer<typeof episodeImportFileSchema>;
export type SeriesSearchResult = z.infer<typeof seriesSearchResultSchema>;

export interface BulkSeriesChanges {
  qualityProfileId?: number;
  monitored?: boolean;
  rootFolderPath?: string;
  seasonFolder?: boolean;
  addTags?: string[];
  removeTags?: string[];
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors?: Array<{ seriesId: number; error: string }>;
}

export interface SeriesOrganizePreviewInput {
  seriesIds: number[];
}

export interface SeriesOrganizeApplyInput {
  seriesIds: number[];
}

export interface EpisodeImportScanInput {
  path: string;
}

export interface EpisodeImportApplyFile {
  path: string;
  seriesId: number;
  seasonId: number;
  episodeId: number;
  quality?: string;
  language?: string;
}

export interface EpisodeImportApplyInput {
  files: EpisodeImportApplyFile[];
}

export interface SeriesSearchInput {
  query?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeId?: number;
  qualityProfileId?: number;
  page?: number;
  pageSize?: number;
}

export function createSeriesApi(client: ApiHttpClient) {
  return {
    // Bulk edit endpoints
    bulkUpdate(seriesIds: number[], changes: BulkSeriesChanges): Promise<BulkUpdateResult> {
      return client.request(
        {
          path: '/api/series/bulk',
          method: 'PUT',
          body: { seriesIds, changes },
        },
        z.object({
          updated: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            seriesId: z.number(),
            error: z.string(),
          })).optional(),
        }),
      );
    },

    getRootFolders(): Promise<{ rootFolders: string[] }> {
      return client.request(
        {
          path: '/api/series/root-folders',
        },
        z.object({
          rootFolders: z.array(z.string()),
        }),
      );
    },

    // Organize/Rename endpoints
    previewOrganize(input: SeriesOrganizePreviewInput): Promise<{ previews: SeriesOrganizePreview[] }> {
      return client.request(
        {
          path: '/api/series/organize/preview',
          method: 'POST',
          body: input,
        },
        z.object({
          previews: z.array(seriesOrganizePreviewSchema),
        }),
      );
    },

    applyOrganize(input: SeriesOrganizeApplyInput): Promise<{ renamed: number; failed: number; errors: Array<{ episodeId: number; error: string }> }> {
      return client.request(
        {
          path: '/api/series/organize/apply',
          method: 'PUT',
          body: input,
        },
        z.object({
          renamed: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            episodeId: z.number(),
            error: z.string(),
          })),
        }),
      );
    },

    // Import endpoints
    scanImport(input: EpisodeImportScanInput): Promise<{ files: EpisodeImportFile[] }> {
      return client.request(
        {
          path: '/api/series/import/scan',
          method: 'POST',
          body: input,
        },
        z.object({
          files: z.array(episodeImportFileSchema),
        }),
      );
    },

    applyImport(input: EpisodeImportApplyInput): Promise<{ imported: number; failed: number; errors: Array<{ path: string; error: string }> }> {
      return client.request(
        {
          path: '/api/series/import/apply',
          method: 'POST',
          body: input,
        },
        z.object({
          imported: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            path: z.string(),
            error: z.string(),
          })),
        }),
      );
    },

    // Get series with seasons and episodes for manual match
    getSeriesWithEpisodes(seriesId: number): Promise<{
      id: number;
      title: string;
      seasons: Array<{
        id: number;
        seasonNumber: number;
        monitored?: boolean | null;
        statistics?: any;
        episodes: Array<{
          id: number;
          episodeNumber: number;
          title: string;
          airDateUtc?: string | null;
          monitored?: boolean | null;
          hasFile?: boolean | null;
          isDownloading?: boolean | null;
        }>;
      }>;
      statistics?: any;
    }> {
      return client.request(
        {
          path: `/api/series/${seriesId}`,
        },
        z.object({
          id: z.number(),
          title: z.string(),
          statistics: episodeStatisticsSchema.optional(),
          seasons: z.array(z.object({
            id: z.number(),
            seasonNumber: z.number(),
            monitored: z.boolean().nullish(),
            statistics: episodeStatisticsSchema.optional(),
            episodes: z.array(z.object({
              id: z.number(),
              episodeNumber: z.number(),
              title: z.string(),
              airDateUtc: z.string().nullish(),
              monitored: z.boolean().nullish(),
              hasFile: z.boolean().nullish(),
              isDownloading: z.boolean().nullish(),
            }).passthrough()),
          }).passthrough()),
        }).passthrough(),
      );
    },

    searchReleases(seriesId: number, input: SeriesSearchInput): Promise<PaginatedResult<z.infer<typeof releaseCandidateSchema>>> {
      const query: Record<string, unknown> = {};
      if (input.page !== undefined) query.page = input.page;
      if (input.pageSize !== undefined) query.pageSize = input.pageSize;

      const body: Record<string, unknown> = {};
      if (input.query !== undefined) body.query = input.query;
      if (input.seasonNumber !== undefined) body.seasonNumber = input.seasonNumber;
      if (input.episodeNumber !== undefined) body.episodeNumber = input.episodeNumber;
      if (input.episodeId !== undefined) body.episodeId = input.episodeId;
      if (input.qualityProfileId !== undefined) body.qualityProfileId = input.qualityProfileId;

      return client.requestPaginated(
        {
          path: routeMap.seriesSearch(seriesId),
          method: 'POST',
          body,
          query,
        },
        releaseCandidateSchema,
      );
    },

    rescan(seriesId: number, folderPath?: string): Promise<{ rescanned: boolean; id: number; episodeCount: number; filesLinked: number }> {
      return client.request(
        { path: `/api/series/${seriesId}/rescan`, method: 'POST', body: folderPath ? { folderPath } : {} },
        z.object({ rescanned: z.boolean(), id: z.number(), episodeCount: z.number(), filesLinked: z.number().default(0) }),
      );
    },
  };
}
