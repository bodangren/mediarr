import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';
import { ExistingLibraryScanner, type ScannedFolder } from '../../services/ExistingLibraryScanner';
import { ImportMatchService, type ScannedFolderWithMatches } from '../../services/ImportMatchService';

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

    const results = await matchService.matchFolder({
      path: '',
      type: mediaType,
      files: [],
      parsedTitle: title,
    });

    return sendSuccess(reply, results);
  });
}
