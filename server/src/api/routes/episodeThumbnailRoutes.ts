import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { ApiDependencies } from '../types';
import { EpisodeThumbnailService } from '../../services/EpisodeThumbnailService';

/**
 * Serves locally generated episode stills.
 *
 * `GET /api/episodes/:id/thumbnail` returns the cached JPEG or 404 — the client
 * treats 404 as "no artwork" and keeps its placeholder, so a library that has
 * not been thumbnailed yet looks the same as before this feature.
 */
export function registerEpisodeThumbnailRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  const service = deps.episodeThumbnailService ?? new EpisodeThumbnailService(deps.prisma as any);

  app.get<{ Params: { id: string } }>('/api/episodes/:id/thumbnail', async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return reply.status(400).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid episode id', retryable: false } });
    }

    const file = service.thumbnailPath(id);
    try {
      const stats = await fs.promises.stat(file);
      if (!stats.isFile() || stats.size === 0) throw new Error('empty');
    } catch {
      return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No thumbnail', retryable: false } });
    }

    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.type('image/jpeg').send(fs.createReadStream(file));
  });

  // Exposed so the series detail payload and the client agree on the path.
  app.get('/api/episodes/thumbnails/status', async (_request, reply) => {
    const directory = path.dirname(service.thumbnailPath(1));
    let count = 0;
    try {
      count = (await fs.promises.readdir(directory)).filter(name => name.endsWith('.jpg')).length;
    } catch {
      count = 0;
    }
    return reply.send({ ok: true, data: { directory, count } });
  });
}
