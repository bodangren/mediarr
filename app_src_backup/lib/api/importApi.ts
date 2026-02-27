import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const detectedSeriesSchema = z.object({
  id: z.number(),
  folderName: z.string(),
  path: z.string(),
  fileCount: z.number(),
  matchedSeriesId: z.number().nullable(),
  matchedSeriesTitle: z.string().optional(),
  matchedSeriesYear: z.number().optional(),
  status: z.enum(['matched', 'unmatched', 'pending']),
});

const seriesSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  overview: z.string().optional(),
  network: z.string().optional(),
  status: z.string().optional(),
  tvdbId: z.number().optional(),
  tmdbId: z.number().optional(),
  imdbId: z.string().optional(),
  images: z.array(z.object({ coverType: z.string(), remoteUrl: z.string() })).optional(),
});

const importSeriesRequestSchema = z.object({
  seriesId: z.number(),
  folderName: z.string(),
  path: z.string(),
  qualityProfileId: z.number(),
  monitored: z.boolean(),
  monitorNewItems: z.enum(['all', 'none', 'future']),
  rootFolder: z.string(),
  seriesType: z.enum(['standard', 'anime', 'daily']),
  seasonFolder: z.boolean(),
  matchedSeriesId: z.number().optional(),
});

const scanFolderRequestSchema = z.object({
  path: z.string(),
});

export type DetectedSeries = z.infer<typeof detectedSeriesSchema>;
export type SeriesSearchResult = z.infer<typeof seriesSearchResultSchema>;
export type ImportSeriesRequest = z.infer<typeof importSeriesRequestSchema>;
export type ScanFolderRequest = z.infer<typeof scanFolderRequestSchema>;

export function createImportApi(client: ApiHttpClient) {
  return {
    scanFolder(request: ScanFolderRequest): Promise<DetectedSeries[]> {
      return client.request(
        {
          path: routeMap.importScan,
          method: 'POST',
          body: request,
        },
        z.array(detectedSeriesSchema),
      );
    },

    importSeries(request: ImportSeriesRequest): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.importSeries,
          method: 'POST',
          body: request,
        },
        z.object({ id: z.number() }),
      );
    },

    bulkImportSeries(requests: ImportSeriesRequest[]): Promise<{ importedCount: number; ids: number[] }> {
      return client.request(
        {
          path: routeMap.importBulkSeries,
          method: 'POST',
          body: { items: requests },
        },
        z.object({
          importedCount: z.number(),
          ids: z.array(z.number()),
        }),
      );
    },
  };
}
