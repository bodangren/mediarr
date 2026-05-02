import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerIndexerRoutes } from './indexerRoutes';
import { CatalogCache } from '../../services/indexers/CatalogCache';

function createIndexerRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createApp(indexerRepository: ReturnType<typeof createIndexerRepositoryMock>, catalogCache: CatalogCache): FastifyInstance {
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
    catalogCache,
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerIndexerRoutes(app, deps);
  return app;
}

const MOCK_CATALOG = [
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
];

describe('indexerRoutes catalog endpoints', () => {
  let indexerRepository: ReturnType<typeof createIndexerRepositoryMock>;
  let catalogCache: CatalogCache;
  let app: FastifyInstance;

  beforeEach(async () => {
    indexerRepository = createIndexerRepositoryMock();
    catalogCache = new CatalogCache('/mock/path.json');
    vi.spyOn(catalogCache as any, 'load').mockImplementation(async () => {
      (catalogCache as any).catalog = MOCK_CATALOG;
    });
    await catalogCache.load();
    app = createApp(indexerRepository, catalogCache);
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

    it('returns empty array when catalog cache is empty', async () => {
      indexerRepository.findAll.mockResolvedValue([]);
      (catalogCache as any).catalog = [];

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
        payload: { apiKey: 'test-key' },
      });

      expect(response.statusCode).toBe(201);
      expect(indexerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'nzb',
        }),
      );
    });

    it('returns 400 when adding indexer that requires API key without one', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/nzbgear/add',
        payload: {},
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('requires an API key');
      expect(indexerRepository.create).not.toHaveBeenCalled();
    });

    it('returns 400 when adding indexer with empty API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/nzbgear/add',
        payload: { apiKey: '' },
      });

      expect(response.statusCode).toBe(422);
      expect(indexerRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/indexers/catalog/reload', () => {
    it('reloads catalog cache', async () => {
      const reloadSpy = vi.spyOn(catalogCache, 'load').mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/indexers/catalog/reload',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.reloaded).toBe(true);
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
