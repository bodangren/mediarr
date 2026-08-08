import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { IndexerServiceDiscovery } from '../../services/discovery/IndexerServiceDiscovery';
import { registerIndexerRoutes } from './indexerRoutes';

describe('GET /api/indexers/detect', () => {
  it('uses the injected discovery service instead of constructing a LAN scanner per request', async () => {
    const discovery = {
      detect: vi.fn().mockResolvedValue([
        {
          type: 'prowlarr' as const,
          url: 'http://127.0.0.1:9696',
          host: '127.0.0.1',
          port: 9696,
          name: 'Browser Acceptance Prowlarr',
        },
      ]),
    };
    const fallbackDetect = vi.spyOn(IndexerServiceDiscovery.prototype, 'detect').mockResolvedValue([]);
    const app = Fastify();
    const deps: ApiDependencies = {
      prisma: {},
      indexerServiceDiscovery: discovery,
    };
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerIndexerRoutes(app, deps);

    const response = await app.inject({ method: 'GET', url: '/api/indexers/detect' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expect.objectContaining({
      data: [expect.objectContaining({ name: 'Browser Acceptance Prowlarr' })],
    }));
    expect(discovery.detect).toHaveBeenCalledOnce();
    expect(fallbackDetect).not.toHaveBeenCalled();
    await app.close();
  });
});
