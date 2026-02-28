import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerTorrentRoutes } from './torrentRoutes';

function createImportManagerMock() {
  return {
    retryImportByInfoHash: vi.fn().mockResolvedValue(undefined),
  };
}

function createApp(importManager?: ReturnType<typeof createImportManagerMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    ...(importManager ? { importManager } : {}),
  };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerTorrentRoutes(app, deps);
  return app;
}

describe('torrentRoutes — POST /api/torrents/:infoHash/retry-import', () => {
  let importManager: ReturnType<typeof createImportManagerMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    importManager = createImportManagerMock();
    app = createApp(importManager);
  });

  it('retries import for the provided torrent infoHash', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/torrents/hash123/retry-import',
    });

    expect(response.statusCode).toBe(200);
    expect(importManager.retryImportByInfoHash).toHaveBeenCalledWith('hash123');
    const body = JSON.parse(response.body) as { data: { infoHash: string; retried: boolean } };
    expect(body.data).toEqual({ infoHash: 'hash123', retried: true });
  });

  it('returns validation error when import manager is not configured', async () => {
    const appWithoutManager = createApp();
    const response = await appWithoutManager.inject({
      method: 'POST',
      url: '/api/torrents/hash123/retry-import',
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('maps missing torrent to not found', async () => {
    importManager.retryImportByInfoHash.mockRejectedValue(new Error('not found'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/torrents/missing/retry-import',
    });

    expect(response.statusCode).toBe(404);
  });
});
