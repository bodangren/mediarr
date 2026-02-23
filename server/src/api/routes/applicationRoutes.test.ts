import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerApplicationRoutes } from './applicationRoutes';

function createServiceMock() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
    syncOne: vi.fn(),
    syncAll: vi.fn(),
  };
}

function createApp(mockService: ReturnType<typeof createServiceMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    applicationService: mockService,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerApplicationRoutes(app, deps);
  return app;
}

describe('applicationRoutes', () => {
  let service: ReturnType<typeof createServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    service = createServiceMock();
    app = createApp(service);
  });

  it('creates application', async () => {
    service.create.mockResolvedValue({ id: 1, name: 'My Sonarr' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/applications',
      payload: {
        name: 'My Sonarr',
        type: 'Sonarr',
        baseUrl: 'http://localhost:8989',
        apiKey: 'abc',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Sonarr' }));
  });

  it('tests application connectivity', async () => {
    service.test.mockResolvedValue({ success: true, message: 'ok', diagnostics: { remediationHints: [] } });

    const response = await app.inject({ method: 'POST', url: '/api/applications/1/test' });
    expect(response.statusCode).toBe(200);
    expect(service.test).toHaveBeenCalledWith(1);
  });

  it('syncs all applications', async () => {
    service.syncAll.mockResolvedValue({ success: true, message: 'done', syncedCount: 2 });

    const response = await app.inject({ method: 'POST', url: '/api/applications/sync' });
    expect(response.statusCode).toBe(200);
    expect(service.syncAll).toHaveBeenCalledTimes(1);
  });
});
