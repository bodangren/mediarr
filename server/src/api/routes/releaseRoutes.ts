import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export function registerReleaseRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.post('/api/releases/search', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (request, reply) => {
    if (!deps.mediaSearchService?.getSearchCandidates) {
      throw new ValidationError('Media search service is not configured');
    }

    const query = (request.body ?? {}) as Record<string, unknown>;
    const candidates = await deps.mediaSearchService.getSearchCandidates(query);

    return sendSuccess(reply, candidates);
  });

  app.post('/api/releases/grab', {
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          indexer: { type: 'string' },
          title: { type: 'string' },
          size: { type: 'number' },
          seeders: { type: 'number' },
          indexerFlags: { type: 'string' },
          quality: { type: 'string' },
          age: { type: 'number' },
          magnetUrl: { type: 'string' },
          downloadUrl: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.mediaSearchService?.grabRelease) {
      throw new ValidationError('Media search service is not configured');
    }

    const candidate = request.body as {
      indexer: string;
      title: string;
      size: number;
      seeders: number;
      indexerFlags?: string;
      quality?: string;
      age?: number;
      magnetUrl?: string;
      downloadUrl?: string;
    };

    const torrent = await deps.mediaSearchService.grabRelease(candidate);

    return sendSuccess(reply, torrent);
  });
}
