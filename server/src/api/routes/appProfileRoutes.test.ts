import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerAppProfileRoutes } from './appProfileRoutes';

function createServiceMock() {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clone: vi.fn(),
  };
}

function createApp(mockService: ReturnType<typeof createServiceMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    appProfileService: mockService,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerAppProfileRoutes(app, deps);
  return app;
}

describe('appProfileRoutes', () => {
  let service: ReturnType<typeof createServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    service = createServiceMock();
    app = createApp(service);
  });

  it('lists app profiles', async () => {
    service.list.mockResolvedValue([{ id: 1, name: 'Default' }]);

    const response = await app.inject({ method: 'GET', url: '/api/profiles/app' });
    expect(response.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('creates app profile', async () => {
    service.create.mockResolvedValue({ id: 1, name: 'Movies' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/profiles/app',
      payload: { name: 'Movies', minimumSeeders: 5 },
    });

    expect(response.statusCode).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Movies' }));
  });

  it('clones profile', async () => {
    service.clone.mockResolvedValue({ id: 2, name: 'Movies (Copy)' });

    const response = await app.inject({ method: 'POST', url: '/api/profiles/app/1/clone' });
    expect(response.statusCode).toBe(201);
    expect(service.clone).toHaveBeenCalledWith(1);
  });
});
