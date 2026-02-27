import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const movieSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number(),
  monitored: z.boolean(),
  qualityProfileId: z.number(),
  added: z.string(),
  tmdbId: z.number().optional(),
  imdbId: z.string().optional(),
  path: z.string().optional(),
  sizeOnDisk: z.number().optional(),
  hasFile: z.boolean().optional(),
  status: z.string().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  runtime: z.number().optional(),
  certification: z.string().optional(),
  genres: z.array(z.string()).optional(),
  titleSlug: z.string().optional(),
  sortTitle: z.string().optional(),
  studio: z.string().optional(),
  originalLanguage: z.object({
    id: z.number(),
    name: z.string(),
  }).optional(),
  collection: z.object({
    id: z.number(),
    title: z.string(),
    overview: z.string().optional(),
    posterUrl: z.string().optional(),
  }).optional(),
}).passthrough();

// Organize preview schema
const organizePreviewSchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  currentPath: z.string(),
  newPath: z.string(),
  isNewPath: z.boolean(),
});

// Import file schema
const importFileSchema = z.object({
  path: z.string(),
  size: z.number(),
  parsedMovieTitle: z.string().optional(),
  parsedYear: z.number().optional(),
  parsedQuality: z.string().optional(),
  match: z.object({
    movieId: z.number(),
    title: z.string(),
    year: z.number(),
    confidence: z.number(),
  }).optional(),
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

export type Movie = z.infer<typeof movieSchema>;
export type OrganizePreview = z.infer<typeof organizePreviewSchema>;
export type ImportFile = z.infer<typeof importFileSchema>;

export interface UpdateMovieInput {
  monitored?: boolean;
  qualityProfileId?: number;
  path?: string;
  title?: string;
  titleSlug?: string;
  overview?: string;
  studio?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
}

export interface OrganizePreviewInput {
  movieIds: number[];
}

export interface OrganizeApplyInput {
  movieIds: number[];
}

export interface ImportScanInput {
  path: string;
}

export interface ImportApplyFile {
  path: string;
  movieId: number;
  quality?: string;
  language?: string;
}

export interface ImportApplyInput {
  files: ImportApplyFile[];
}

export interface BulkMovieChanges {
  qualityProfileId?: number;
  monitored?: boolean;
  minimumAvailability?: string;
  path?: string;
  addTags?: string[];
  removeTags?: string[];
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors?: Array<{ movieId: number; error: string }>;
}

export interface MovieSearchInput {
  query?: string;
  title?: string;
  year?: number;
  tmdbId?: number;
  imdbId?: string;
  qualityProfileId?: number;
  page?: number;
  pageSize?: number;
}

export function createMovieApi(client: ApiHttpClient) {
  return {
    getById(id: number): Promise<Movie> {
      return client.request(
        {
          path: routeMap.movieDetail(id),
        },
        movieSchema,
      );
    },

    refresh(id: number): Promise<{ id: number; refreshed: boolean }> {
      return client.request(
        {
          path: `/api/movies/${id}/refresh`,
          method: 'POST',
        },
        z.object({ id: z.number(), refreshed: z.boolean() }),
      );
    },

    update(id: number, input: UpdateMovieInput): Promise<Movie> {
      return client.request(
        {
          path: routeMap.movieDetail(id),
          method: 'PUT',
          body: input,
        },
        movieSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.movieDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    deleteFile(movieId: number, fileId: number): Promise<{ deleted: boolean }> {
      return client.request(
        {
          path: `/api/movies/${movieId}/files/${fileId}`,
          method: 'DELETE',
        },
        z.object({ deleted: z.boolean() }),
      );
    },

    // Organize/Rename endpoints
    previewOrganize(input: OrganizePreviewInput): Promise<{ previews: OrganizePreview[] }> {
      return client.request(
        {
          path: '/api/movies/organize/preview',
          method: 'POST',
          body: input,
        },
        z.object({
          previews: z.array(organizePreviewSchema),
        }),
      );
    },

    applyOrganize(input: OrganizeApplyInput): Promise<{ renamed: number; failed: number; errors: Array<{ movieId: number; error: string }> }> {
      return client.request(
        {
          path: '/api/movies/organize/apply',
          method: 'PUT',
          body: input,
        },
        z.object({
          renamed: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            movieId: z.number(),
            error: z.string(),
          })),
        }),
      );
    },

    // Import endpoints
    scanImport(input: ImportScanInput): Promise<{ files: ImportFile[] }> {
      return client.request(
        {
          path: '/api/movies/import/scan',
          method: 'POST',
          body: input,
        },
        z.object({
          files: z.array(importFileSchema),
        }),
      );
    },

    applyImport(input: ImportApplyInput): Promise<{ imported: number; failed: number; errors: Array<{ path: string; error: string }> }> {
      return client.request(
        {
          path: '/api/movies/import/apply',
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

    // Bulk edit endpoints
    bulkUpdate(movieIds: number[], changes: BulkMovieChanges): Promise<BulkUpdateResult> {
      return client.request(
        {
          path: '/api/movies/bulk',
          method: 'PUT',
          body: { movieIds, changes },
        },
        z.object({
          updated: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            movieId: z.number(),
            error: z.string(),
          })).optional(),
        }),
      );
    },

    getRootFolders(): Promise<{ rootFolders: string[] }> {
      return client.request(
        {
          path: '/api/movies/root-folders',
        },
        z.object({
          rootFolders: z.array(z.string()),
        }),
      );
    },

    searchReleases(movieId: number, input: MovieSearchInput): Promise<PaginatedResult<z.infer<typeof releaseCandidateSchema>>> {
      const query: Record<string, unknown> = {};
      if (input.page !== undefined) query.page = input.page;
      if (input.pageSize !== undefined) query.pageSize = input.pageSize;

      const body: Record<string, unknown> = {};
      if (input.query !== undefined) body.query = input.query;
      if (input.title !== undefined) body.title = input.title;
      if (input.year !== undefined) body.year = input.year;
      if (input.tmdbId !== undefined) body.tmdbId = input.tmdbId;
      if (input.imdbId !== undefined) body.imdbId = input.imdbId;
      if (input.qualityProfileId !== undefined) body.qualityProfileId = input.qualityProfileId;

      return client.requestPaginated(
        {
          path: routeMap.movieSearch(movieId),
          method: 'POST',
          body,
          query,
        },
        releaseCandidateSchema,
      );
    },
  };
}
