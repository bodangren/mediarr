import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';
import { ExistingLibraryScanner, type ScannedFolder } from '../../services/ExistingLibraryScanner';
import { ImportMatchService, type ScannedFolderWithMatches } from '../../services/ImportMatchService';
import { BulkImportService } from '../../services/BulkImportService';
import type { ParsedInfo } from '../../utils/Parser';

const MATCH_CONCURRENCY = 5;

/**
 * Run `fn` over `items` with at most `concurrency` operations in flight at once.
 * Preserves input order in the returned array.
 */
async function withConcurrencyLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

interface ScanResponse {
  rootPath: string;
  folders: ScannedFolderWithMatches[];
  totalFiles: number;
  scanDurationMs: number;
}

export function registerImportRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  const scanner = new ExistingLibraryScanner();
  const matchService = deps.metadataProvider
    ? new ImportMatchService(deps.metadataProvider)
    : null;
  const importService = deps.metadataProvider
    ? new BulkImportService(deps.prisma as any, deps.metadataProvider)
    : null;

  app.post<{
    Body: { path: string };
  }>('/api/import/scan', {
    schema: {
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!matchService) {
      return reply.code(500).send({ ok: false, error: 'Metadata provider not configured' });
    }

    const scanResult = await scanner.scan(request.body.path);

    const folders = await withConcurrencyLimit(
      scanResult.folders,
      MATCH_CONCURRENCY,
      async (folder: ScannedFolder): Promise<ScannedFolderWithMatches> => {
        const candidates = await matchService.matchFolder(folder);
        return {
          ...folder,
          matchCandidates: candidates,
          selectedMatchId: candidates[0]?.id,
        };
      },
    );

    const response: ScanResponse = {
      rootPath: scanResult.rootPath,
      folders,
      totalFiles: scanResult.totalFiles,
      scanDurationMs: scanResult.scanDurationMs,
    };

    return sendSuccess(reply, response);
  });

  app.post<{
    Body: { title: string; mediaType: 'movie' | 'series' };
  }>('/api/import/search', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'mediaType'],
        properties: {
          title: { type: 'string' },
          mediaType: { type: 'string', enum: ['movie', 'series'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!matchService) {
      return reply.code(500).send({ ok: false, error: 'Metadata provider not configured' });
    }

    const { title, mediaType } = request.body;

    const results = await matchService.searchByTitle(title, mediaType);

    return sendSuccess(reply, results);
  });

  // POST /api/import/backfill-posters
  // Fetches and stores posterUrl for movies that have a tmdbId but no poster.
  app.post('/api/import/backfill-posters', async (_request, reply) => {
    if (!matchService || !deps.metadataProvider) {
      return reply.code(500).send({ ok: false, error: 'Metadata provider not configured' });
    }

    const movies: Array<{ id: number; tmdbId: number | null; title: string }> =
      await (deps.prisma as any).movie.findMany({
        where: {
          OR: [{ posterUrl: null }, { posterUrl: '' }],
        },
        select: { id: true, tmdbId: true, title: true },
      });

    let updated = 0;
    let skipped = 0;
    const errors: Array<{ title: string; error: string }> = [];

    await withConcurrencyLimit(
      movies,
      MATCH_CONCURRENCY,
      async (movie) => {
        if (!movie.tmdbId) {
          skipped++;
          return;
        }
        try {
          const details = await deps.metadataProvider!.getMediaDetails({
            mediaType: 'MOVIE',
            tmdbId: movie.tmdbId,
          });
          const posterUrl = (details as any).images?.[0]?.url as string | undefined;
          if (posterUrl) {
            await (deps.prisma as any).movie.update({
              where: { id: movie.id },
              data: { posterUrl },
            });
            updated++;
          } else {
            skipped++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[backfill-posters] "${movie.title}": ${message}`);
          errors.push({ title: movie.title, error: message });
        }
      },
    );

    return sendSuccess(reply, {
      total: movies.length,
      updated,
      skipped,
      failed: errors.length,
      errors,
    });
  });

  app.post<{
    Body: {
      items: Array<{
        folderPath: string;
        mediaType: 'movie' | 'series';
        matchId: number;
        files: Array<{
          path: string;
          size: number;
          extension: string;
          parsedInfo?: ParsedInfo;
        }>;
        renameFiles: boolean;
        rootFolderPath: string;
        qualityProfileId: number;
      }>;
    };
  }>('/api/import/execute', {
    schema: {
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['folderPath', 'mediaType', 'matchId', 'files', 'renameFiles', 'rootFolderPath', 'qualityProfileId'],
              properties: {
                folderPath: { type: 'string' },
                mediaType: { type: 'string', enum: ['movie', 'series'] },
                matchId: { type: 'number' },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['path', 'size', 'extension'],
                    properties: {
                      path: { type: 'string' },
                      size: { type: 'number' },
                      extension: { type: 'string' },
                      parsedInfo: { type: 'object' },
                    },
                  },
                },
                renameFiles: { type: 'boolean' },
                rootFolderPath: { type: 'string' },
                qualityProfileId: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!importService) {
      return reply.code(500).send({ ok: false, error: 'Metadata provider not configured' });
    }

    const result = await importService.executeImport(request.body.items);

    return sendSuccess(reply, result);
  });
}
