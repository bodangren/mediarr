import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export function registerMetadataRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.post('/api/metadata/refresh', async (_request, reply) => {
    if (!deps.metadataRefreshService?.refreshAll) {
      return reply.code(500).send({ ok: false, error: 'Metadata refresh service is not configured' });
    }

    const summary = await deps.metadataRefreshService.refreshAll();
    return sendSuccess(reply, summary);
  });
}
