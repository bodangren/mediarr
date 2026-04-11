import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerIndexerRoutes } from './indexerRoutes';

vi.mock('node:fs');

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
      getDefinition: vi.fn(),
      getCompatibilityReport: vi.fn(),
    },
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerIndexerRoutes(app, deps);
  return app;
}

const MOCK_CATALOG = JSON.stringify([
  {
    id: '1337x',
    name: '1337x',
    description: 'Popular public torrent site',
    type: 'torznab',
    baseUrl: 'https://1337x.to',
    categories: ['TV', 'MOVIE'],
    requiresApiKey: false,
    signupUrl: 'https://1337x.to',
    implementation: 'Cardigann',
    configContract: 'CardigannSettings',
    supportedMediaTypes: ['TV', 'MOVIE'],
    supportsSearch: true,
    supportsRss: false,
  },
  {
    id: 'nzbgear',
    name: 'NZBGeek',
    description: 'Popular semi-private usenet indexer',
    type: 'newznab',
    baseUrl: 'https://api.nzbgamer.com',
    categories: ['TV', 'MOVIE'],
    requiresApiKey: true,
    signupUrl: 'https://nzbgamer.com',
    implementation: 'Newznab',
    configContract: 'NewznabSettings',
    supportedMediaTypes: ['TV', 'MOVIE'],
    supportsSearch: true,
    supportsRss: true,
  },
]);

describe('indexerRoutes catalog endpoints', () => {
  let indexerRepository: ReturnType<typeof createIndexerRepositoryMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    indexerRepository = createIndexerRepositoryMock();
    app = createApp(indexerRepository);
    vi.mocked(fs.promises.readFile).mockResolvedValue(MOCK_CATALOG);
  });

  describe('GET /api/indexers/catalog', () => {
    it('returns catalog with isConfigured false when no indexers exist', async () => {
      indexerRepository.findAll.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/indexers/catalog',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].id).toBe('1337x');
      expect(body.data[0].isConfigured).toBe(false);
      expect(body.data[1].id).toBe('nzbgear');
      expect(body.data[1].isConfigured).toBe(false);
    });

    it('marks catalog entries as configured when matching indexer exists', async () => {
      indexerRepository.findAll.mockResolvedValue([
        {
          id: 1,
          name: '1337x',
          implementation: 'Cardigann',
          configContract: 'CardigannSettings',
          settings: '{}',
          protocol: 'torrent',
          supportedMediaTypes: '[]',
          enabled: true,
          supportsRss: false,
          supportsSearch: true,
          priority: 25,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/indexers/catalog',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const entry1337x = body.data.find((e: any) => e.id === '1337x');
      const entryNzbgear = body.data.find((e: any) => e.id === 'nzbgear');
      expect(entry1337x.isConfigured).toBe(true);
      expect(entryNzbgear.isConfigured).toBe(false);
    });

    it('returns empty array when catalog file not found', async () => {
      indexerRepository.findAll.mockResolvedValue([]);
      vi.mocked(fs.promises.readFile).mockRejectedValue(new Error('File not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/indexers/catalog',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(0);
    });
  });

  describe('POST /api/indexers/catalog/:id/add', () => {
    it('adds a public indexer without API key', async () => {
      indexerRepository.create.mockResolvedValue({
        id: 5,
        name: '1337x',
        implementation: 'Cardigann',
        configContract: 'CardigannSettings',
        settings: '{"definitionId":"1337x"}',
        protocol: 'torrent',
        supportedMediaTypes: '["TV","MOVIE"]',
        enabled: true,
        supportsRss: false,
        supportsSearch: true,
        priority: 25,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/1337x/add',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      expect(indexerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '1337x',
          implementation: 'Cardigann',
          configContract: 'CardigannSettings',
          protocol: 'torrent',
          settings: expect.stringContaining('definitionId'),
        }),
      );
    });

    it('adds an indexer with provided API key', async () => {
      indexerRepository.create.mockResolvedValue({
        id: 6,
        name: 'NZBGeek',
        implementation: 'Newznab',
        configContract: 'NewznabSettings',
        settings: '{"host":"https://api.nzbgamer.com","apiKey":"my-secret-key"}',
        protocol: 'nzb',
        supportedMediaTypes: '["TV","MOVIE"]',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/nzbgear/add',
        payload: { apiKey: 'my-secret-key' },
      });

      expect(response.statusCode).toBe(201);
      expect(indexerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NZBGeek',
          implementation: 'Newznab',
          configContract: 'NewznabSettings',
          protocol: 'nzb',
          settings: expect.stringContaining('my-secret-key'),
        }),
      );
    });

    it('returns 404 for unknown catalog entry id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/unknown-indexer/add',
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it('adds torznab indexer with correct protocol', async () => {
      indexerRepository.create.mockResolvedValue({
        id: 7,
        name: '1337x',
        implementation: 'Cardigann',
        configContract: 'CardigannSettings',
        settings: '{"definitionId":"1337x"}',
        protocol: 'torrent',
        supportedMediaTypes: '["TV","MOVIE"]',
        enabled: true,
        supportsRss: false,
        supportsSearch: true,
        priority: 25,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/1337x/add',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      expect(indexerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'torrent',
        }),
      );
    });

    it('adds newznab indexer with nzb protocol', async () => {
      indexerRepository.create.mockResolvedValue({
        id: 8,
        name: 'NZBGeek',
        implementation: 'Newznab',
        configContract: 'NewznabSettings',
        settings: '{"host":"https://api.nzbgamer.com","apiKey":""}',
        protocol: 'nzb',
        supportedMediaTypes: '["TV","MOVIE"]',
        enabled: true,
        supportsRss: true,
        supportsSearch: true,
        priority: 25,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/nzbgear/add',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      expect(indexerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'nzb',
        }),
      );
    });
  });
});
