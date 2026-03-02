import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

const matchCandidateSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  confidence: z.number(),
  matchSource: z.enum(['nfo', 'search', 'exact']),
});

const parsedInfoSchema = z.object({
  seasonNumber: z.number().optional(),
  episodeNumbers: z.array(z.number()).optional(),
  movieTitle: z.string().optional(),
  seriesTitle: z.string().optional(),
  quality: z.string().optional(),
  year: z.number().optional(),
}).optional();

const scannedFileSchema = z.object({
  path: z.string(),
  size: z.number(),
  extension: z.string(),
  nfoPath: z.string().optional(),
  parsedInfo: parsedInfoSchema,
});

const scannedFolderSchema = z.object({
  path: z.string(),
  type: z.enum(['movie', 'series', 'unknown']),
  files: z.array(scannedFileSchema),
  nfoData: z.object({
    imdbId: z.string().optional(),
    tmdbId: z.number().optional(),
    tvdbId: z.number().optional(),
    title: z.string().optional(),
    year: z.number().optional(),
  }).optional(),
  parsedTitle: z.string().optional(),
  parsedYear: z.number().optional(),
  matchCandidates: z.array(matchCandidateSchema),
  selectedMatchId: z.number().optional(),
});

const scanResponseSchema = z.object({
  rootPath: z.string(),
  folders: z.array(scannedFolderSchema),
  totalFiles: z.number(),
  scanDurationMs: z.number(),
});

const importResultSchema = z.object({
  imported: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    folderPath: z.string(),
    error: z.string(),
  })),
});

export type MatchCandidate = z.infer<typeof matchCandidateSchema>;
export type ScannedFile = z.infer<typeof scannedFileSchema>;
export type ScannedFolderWithMatches = z.infer<typeof scannedFolderSchema>;
export type ScanResponse = z.infer<typeof scanResponseSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;

export interface ImportMatchItem {
  folderPath: string;
  mediaType: 'movie' | 'series';
  matchId: number;
  files: Array<{
    path: string;
    size: number;
    extension: string;
    parsedInfo?: z.infer<typeof parsedInfoSchema>;
  }>;
  renameFiles: boolean;
  rootFolderPath: string;
  qualityProfileId: number;
}

export function createImportApi(client: ApiHttpClient) {
  return {
    scan(body: { path: string }): Promise<ScanResponse> {
      return client.request(
        { path: '/api/import/scan', method: 'POST', body },
        scanResponseSchema,
      );
    },

    search(body: { title: string; mediaType: 'movie' | 'series' }): Promise<MatchCandidate[]> {
      return client.request(
        { path: '/api/import/search', method: 'POST', body },
        z.array(matchCandidateSchema),
      );
    },

    execute(body: { items: ImportMatchItem[] }): Promise<ImportResult> {
      return client.request(
        { path: '/api/import/execute', method: 'POST', body },
        importResultSchema,
      );
    },
  };
}
