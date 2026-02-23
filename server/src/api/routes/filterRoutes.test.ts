import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerFilterRoutes } from './filterRoutes';

function createCustomFilterModelMock() {
  return {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createApp(customFilterModel: ReturnType<typeof createCustomFilterModelMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {
      customFilter: customFilterModel,
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerFilterRoutes(app, deps);
  return app;
}

describe('filterRoutes custom endpoints', () => {
  let customFilterModel: ReturnType<typeof createCustomFilterModelMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    customFilterModel = createCustomFilterModelMock();
    app = createApp(customFilterModel);
  });

  it('lists custom indexer filters', async () => {
    customFilterModel.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Torrent Enabled',
        type: 'indexer',
        conditions: {
          operator: 'and',
          conditions: [
            { field: 'protocol', operator: 'equals', value: 'torrent' },
            { field: 'enabled', operator: 'equals', value: true },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/filters/custom?type=indexer',
    });

    expect(response.statusCode).toBe(200);
    expect(customFilterModel.findMany).toHaveBeenCalledWith({
      where: { type: 'indexer' },
      orderBy: { name: 'asc' },
    });
  });

  it('creates indexer custom filters', async () => {
    customFilterModel.create.mockResolvedValue({
      id: 10,
      name: 'RSS Torrent',
      type: 'indexer',
      conditions: {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'contains', value: 'rss' }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/filters/custom',
      payload: {
        name: 'RSS Torrent',
        type: 'indexer',
        conditions: {
          operator: 'and',
          conditions: [{ field: 'capability', operator: 'contains', value: 'rss' }],
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(customFilterModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'RSS Torrent',
        type: 'indexer',
      }),
    });
  });

  it('rejects invalid indexer filter fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/filters/custom',
      payload: {
        name: 'Invalid',
        type: 'indexer',
        conditions: {
          operator: 'and',
          conditions: [{ field: 'network', operator: 'contains', value: 'HBO' }],
        },
      },
    });

    expect(response.statusCode).toBe(422);
    expect(customFilterModel.create).not.toHaveBeenCalled();
  });
});
