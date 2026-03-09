import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export function registerLibraryRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.post('/api/library/scan', async (_request, reply) => {
    if (!deps.libraryScanService) {
      return reply.code(500).send({ ok: false, error: 'Library scan service is not configured' });
    }

    const settings = deps.settingsService ? await deps.settingsService.get() : null;
    const movieRootFolder = (settings as any)?.mediaManagement?.movieRootFolder ?? '';
    const tvRootFolder = (settings as any)?.mediaManagement?.tvRootFolder ?? '';

    const result = await deps.libraryScanService.scanAll({ movieRootFolder, tvRootFolder });

    return sendSuccess(reply, result);
  });
}
