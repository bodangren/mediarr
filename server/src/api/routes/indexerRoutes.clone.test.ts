import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerIndexerRoutes } from './indexerRoutes';

function createIndexerRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createApp(indexerRepository: ReturnType<typeof createIndexerRepositoryMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    indexerRepository,
    indexerTester: {
      test: vi.fn(),
    },
    indexerFactory: {
      fromDatabaseRecord: vi.fn(),
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerIndexerRoutes(app, deps);
  return app;
}

describe('indexerRoutes clone endpoint', () => {
  let indexerRepository: ReturnType<typeof createIndexerRepositoryMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    indexerRepository = createIndexerRepositoryMock();
    app = createApp(indexerRepository);
  });

  it('clones indexer with (Copy) suffix', async () => {
    indexerRepository.findById.mockResolvedValue({
      id: 7,
      name: 'Main Indexer',
      implementation: 'Torznab',
      configContract: 'TorznabSettings',
      settings: '{"url":"https://indexer.example","apiKey":"abc"}',
      protocol: 'torrent',
      appProfileId: null,
      enabled: true,
      supportsRss: true,
      supportsSearch: true,
      priority: 25,
    });
    indexerRepository.create.mockResolvedValue({
      id: 8,
      name: 'Main Indexer (Copy)',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/indexers/7/clone',
    });

    expect(response.statusCode).toBe(201);
    expect(indexerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Main Indexer (Copy)',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
      }),
    );
  });
});
