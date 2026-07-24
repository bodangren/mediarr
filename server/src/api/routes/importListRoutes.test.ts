import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerApiErrorHandler } from '../errors';
import { registerImportListRoutes } from './importListRoutes';

function createRepositoryMock() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateLastSync: vi.fn(),
    findAllExclusions: vi.fn(),
    findExclusionById: vi.fn(),
    createExclusion: vi.fn(),
    deleteExclusion: vi.fn(),
    isExcluded: vi.fn(),
  };
}

function createProviderRegistryMock() {
  return {
    getProvider: vi.fn(),
    registerProvider: vi.fn(),
    getAllProviderTypes: vi.fn(),
  };
}

function createSyncServiceMock() {
  return {
    syncList: vi.fn(),
    syncAllEnabled: vi.fn(),
  };
}

type RepositoryMock = ReturnType<typeof createRepositoryMock>;
type ProviderRegistryMock = ReturnType<typeof createProviderRegistryMock>;
type SyncServiceMock = ReturnType<typeof createSyncServiceMock>;

function createApp(input: {
  repository?: RepositoryMock;
  providerRegistry?: ProviderRegistryMock;
  syncService?: SyncServiceMock;
} = {}): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    ...(input.repository
      ? { importListRepository: input.repository as NonNullable<ApiDependencies['importListRepository']> }
      : {}),
    ...(input.providerRegistry
      ? { importListProviderRegistry: input.providerRegistry as NonNullable<ApiDependencies['importListProviderRegistry']> }
      : {}),
    ...(input.syncService
      ? { importListSyncService: input.syncService as NonNullable<ApiDependencies['importListSyncService']> }
      : {}),
  };

  app.setErrorHandler((error, request, reply) =>
    registerApiErrorHandler(request, reply, error),
  );
  registerImportListRoutes(app, deps);
  return app;
}

const importList = {
  id: 4,
  name: 'Weekend watchlist',
  providerType: 'tmdb-list',
  config: { listId: '42' },
  rootFolderPath: '/media/movies',
  qualityProfileId: 3,
  languageProfileId: null,
  monitorType: 'movie',
  enabled: true,
  syncInterval: 24,
  lastSyncAt: null,
  createdAt: new Date('2026-07-20T08:00:00.000Z'),
  updatedAt: new Date('2026-07-20T08:00:00.000Z'),
  qualityProfile: { id: 3, name: 'HD' },
};

const exclusion = {
  id: 8,
  importListId: 4,
  tmdbId: 550,
  imdbId: null,
  tvdbId: null,
  title: 'Fight Club',
  createdAt: new Date('2026-07-21T09:00:00.000Z'),
};

describe('importListRoutes', () => {
  let repository: RepositoryMock;
  let providerRegistry: ProviderRegistryMock;
  let syncService: SyncServiceMock;
  let app: FastifyInstance;

  beforeEach(() => {
    repository = createRepositoryMock();
    providerRegistry = createProviderRegistryMock();
    syncService = createSyncServiceMock();
    app = createApp({ repository, providerRegistry, syncService });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/import-lists', () => {
    it('returns the exact success envelope from the repository', async () => {
      repository.findAll.mockResolvedValue([importList]);

      const response = await app.inject({ method: 'GET', url: '/api/import-lists' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [{
          ...importList,
          createdAt: '2026-07-20T08:00:00.000Z',
          updatedAt: '2026-07-20T08:00:00.000Z',
        }],
      });
      expect(repository.findAll).toHaveBeenCalledOnce();
    });

    it('propagates repository failures through the API error envelope', async () => {
      repository.findAll.mockRejectedValue(new Error('database unavailable'));

      const response = await app.inject({ method: 'GET', url: '/api/import-lists' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'database unavailable',
          retryable: false,
          path: '/api/import-lists',
        },
      });
    });
  });

  describe('GET /api/import-lists/:id', () => {
    it('loads the parsed id and returns the list', async () => {
      repository.findById.mockResolvedValue(importList);

      const response = await app.inject({ method: 'GET', url: '/api/import-lists/4' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ ok: true, data: { id: 4, name: 'Weekend watchlist' } });
      expect(repository.findById).toHaveBeenCalledWith(4);
    });

    it('returns an exact not-found error when the list does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const response = await app.inject({ method: 'GET', url: '/api/import-lists/99' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Import list 99 not found',
          retryable: false,
          path: '/api/import-lists/99',
        },
      });
    });

    it('rejects an invalid id before calling the repository', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/import-lists/not-a-number' });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid import list id' },
      });
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/import-lists', () => {
    const payload = {
      name: 'Weekend watchlist',
      providerType: 'tmdb-list',
      config: { listId: '42' },
      rootFolderPath: '/media/movies',
      qualityProfileId: 3,
      languageProfileId: 2,
      monitorType: 'movie',
      enabled: false,
      syncInterval: 12,
    };

    it('validates the provider and creates the exact repository record', async () => {
      const provider = { type: 'tmdb-list', name: 'TMDB List', fetch: vi.fn(), validateConfig: vi.fn(() => true) };
      providerRegistry.getProvider.mockReturnValue(provider);
      repository.create.mockResolvedValue(importList);

      const response = await app.inject({ method: 'POST', url: '/api/import-lists', payload });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ ok: true, data: { id: 4, providerType: 'tmdb-list' } });
      expect(providerRegistry.getProvider).toHaveBeenCalledWith('tmdb-list');
      expect(provider.validateConfig).toHaveBeenCalledWith({ listId: '42' });
      expect(repository.create).toHaveBeenCalledWith(payload);
    });

    it('preserves repository defaults by forwarding omitted optional fields as undefined', async () => {
      const minimalPayload = {
        name: 'Popular movies',
        providerType: 'tmdb-popular',
        config: { mediaType: 'movie' },
        rootFolderPath: '/media/movies',
        qualityProfileId: 3,
        monitorType: 'movie',
      };
      const provider = { type: 'tmdb-popular', name: 'TMDB Popular', fetch: vi.fn(), validateConfig: vi.fn(() => true) };
      providerRegistry.getProvider.mockReturnValue(provider);
      repository.create.mockResolvedValue(importList);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-lists',
        payload: minimalPayload,
      });

      expect(response.statusCode).toBe(201);
      expect(repository.create).toHaveBeenCalledWith({
        ...minimalPayload,
        languageProfileId: undefined,
        enabled: undefined,
        syncInterval: undefined,
      });
    });

    it('rejects an unknown provider without creating a list', async () => {
      providerRegistry.getProvider.mockReturnValue(undefined);

      const response = await app.inject({ method: 'POST', url: '/api/import-lists', payload });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR', message: 'Unknown provider type: tmdb-list' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects invalid provider configuration without creating a list', async () => {
      const provider = { type: 'tmdb-list', name: 'TMDB List', fetch: vi.fn(), validateConfig: vi.fn(() => false) };
      providerRegistry.getProvider.mockReturnValue(provider);

      const response = await app.inject({ method: 'POST', url: '/api/import-lists', payload });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid configuration for provider tmdb-list' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects schema-invalid input before provider or repository calls', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import-lists',
        payload: { name: 'Incomplete' },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
      expect(providerRegistry.getProvider).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/import-lists/:id', () => {
    it('validates merged provider state and forwards only supplied fields', async () => {
      const provider = { type: 'tmdb-list', name: 'TMDB List', fetch: vi.fn(), validateConfig: vi.fn(() => true) };
      providerRegistry.getProvider.mockReturnValue(provider);
      repository.findById.mockResolvedValue(importList);
      repository.update.mockResolvedValue({ ...importList, name: 'New name', enabled: false });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/import-lists/4',
        payload: { name: 'New name', enabled: false, config: { listId: '99' } },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ ok: true, data: { id: 4, name: 'New name', enabled: false } });
      expect(providerRegistry.getProvider).toHaveBeenCalledWith('tmdb-list');
      expect(provider.validateConfig).toHaveBeenCalledWith({ listId: '99' });
      expect(repository.update).toHaveBeenCalledWith(4, {
        name: 'New name',
        enabled: false,
        config: { listId: '99' },
      });
    });

    it('returns not found without updating an absent list', async () => {
      repository.findById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/import-lists/404',
        payload: { name: 'Missing' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: { code: 'NOT_FOUND', message: 'Import list 404 not found' },
      });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a changed provider and forwards every mutable field', async () => {
      const provider = { type: 'tmdb-popular', name: 'TMDB Popular', fetch: vi.fn(), validateConfig: vi.fn(() => true) };
      providerRegistry.getProvider.mockReturnValue(provider);
      repository.findById.mockResolvedValue(importList);
      repository.update.mockResolvedValue({ ...importList, providerType: 'tmdb-popular' });
      const payload = {
        name: 'All updates',
        providerType: 'tmdb-popular',
        config: { mediaType: 'both', limit: 40 },
        rootFolderPath: '/media/all',
        qualityProfileId: 5,
        languageProfileId: null,
        monitorType: 'series',
        enabled: true,
        syncInterval: 6,
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/import-lists/4',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(providerRegistry.getProvider).toHaveBeenCalledWith('tmdb-popular');
      expect(provider.validateConfig).toHaveBeenCalledWith({ mediaType: 'both', limit: 40 });
      expect(repository.update).toHaveBeenCalledWith(4, payload);
    });

    it('allows an empty update without provider validation', async () => {
      repository.findById.mockResolvedValue(importList);
      repository.update.mockResolvedValue(importList);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/import-lists/4',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(providerRegistry.getProvider).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(4, {});
    });
  });

  describe('DELETE /api/import-lists/:id', () => {
    it('returns the client success contract after deleting an existing list', async () => {
      repository.findById.mockResolvedValue(importList);
      repository.delete.mockResolvedValue(importList);

      const response = await app.inject({ method: 'DELETE', url: '/api/import-lists/4' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { success: true } });
      expect(repository.findById).toHaveBeenCalledWith(4);
      expect(repository.delete).toHaveBeenCalledWith(4);
    });

    it('returns not found without deleting an absent list', async () => {
      repository.findById.mockResolvedValue(null);

      const response = await app.inject({ method: 'DELETE', url: '/api/import-lists/404' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: { code: 'NOT_FOUND', message: 'Import list 404 not found' },
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/import-lists/:id/sync', () => {
    it('returns the public sync contract and records the requested list id', async () => {
      syncService.syncList.mockResolvedValue({
        added: 2,
        skipped: 1,
        exclusions: 3,
        errors: [{ title: 'Broken title', error: 'metadata unavailable' }],
      });

      const response = await app.inject({ method: 'POST', url: '/api/import-lists/4/sync' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          success: false,
          addedCount: 2,
          skippedCount: 1,
          errorCount: 1,
          errors: ['Broken title: metadata unavailable'],
        },
      });
      expect(syncService.syncList).toHaveBeenCalledWith(4);
    });

    it('propagates sync failures and does not fabricate a success response', async () => {
      syncService.syncList.mockRejectedValue(new Error('provider offline'));

      const response = await app.inject({ method: 'POST', url: '/api/import-lists/4/sync' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'provider offline',
          retryable: false,
          path: '/api/import-lists/4/sync',
        },
      });
    });

    it('reports a successful sync when the service returns no item errors', async () => {
      syncService.syncList.mockResolvedValue({
        added: 3,
        skipped: 2,
        exclusions: 0,
        errors: [],
      });

      const response = await app.inject({ method: 'POST', url: '/api/import-lists/4/sync' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          success: true,
          addedCount: 3,
          skippedCount: 2,
          errorCount: 0,
          errors: [],
        },
      });
    });
  });

  describe('GET /api/import-lists/providers', () => {
    it('returns provider type/name pairs including a safe missing-provider fallback', async () => {
      providerRegistry.getAllProviderTypes.mockReturnValue(['tmdb-list', 'custom']);
      providerRegistry.getProvider.mockImplementation((type: string) =>
        type === 'tmdb-list'
          ? { type, name: 'TMDB List', fetch: vi.fn(), validateConfig: vi.fn(() => true) }
          : undefined,
      );

      const response = await app.inject({ method: 'GET', url: '/api/import-lists/providers' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [
          { type: 'tmdb-list', name: 'TMDB List' },
          { type: 'custom', name: 'custom' },
        ],
      });
      expect(providerRegistry.getAllProviderTypes).toHaveBeenCalledOnce();
    });
  });

  describe('GET /api/import-lists/exclusions', () => {
    it('returns all exclusions from the repository', async () => {
      repository.findAllExclusions.mockResolvedValue([exclusion]);

      const response = await app.inject({ method: 'GET', url: '/api/import-lists/exclusions' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [{ ...exclusion, createdAt: '2026-07-21T09:00:00.000Z' }],
      });
      expect(repository.findAllExclusions).toHaveBeenCalledOnce();
    });
  });

  describe('POST /api/import-lists/exclusions', () => {
    it('creates an exclusion with the exact submitted identifiers', async () => {
      repository.createExclusion.mockResolvedValue(exclusion);
      const payload = { importListId: 4, tmdbId: 550, title: 'Fight Club' };

      const response = await app.inject({
        method: 'POST',
        url: '/api/import-lists/exclusions',
        payload,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ ok: true, data: { id: 8, tmdbId: 550 } });
      expect(repository.createExclusion).toHaveBeenCalledWith(payload);
    });

    it('requires at least one external identifier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import-lists/exclusions',
        payload: { title: 'No identifier' },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one of tmdbId, imdbId, or tvdbId must be provided',
        },
      });
      expect(repository.createExclusion).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/import-lists/exclusions/:id', () => {
    it('returns the client success contract after deleting an existing exclusion', async () => {
      repository.findExclusionById.mockResolvedValue(exclusion);
      repository.deleteExclusion.mockResolvedValue(exclusion);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/import-lists/exclusions/8',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true, data: { success: true } });
      expect(repository.findExclusionById).toHaveBeenCalledWith(8);
      expect(repository.deleteExclusion).toHaveBeenCalledWith(8);
    });

    it('returns not found without deleting an absent exclusion', async () => {
      repository.findExclusionById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/import-lists/exclusions/404',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: { code: 'NOT_FOUND', message: 'Import list exclusion 404 not found' },
      });
      expect(repository.deleteExclusion).not.toHaveBeenCalled();
    });
  });

  describe('dependency validation', () => {
    it.each([
      { method: 'GET', url: '/api/import-lists', expectedMessage: 'Import list repository is not configured' },
      { method: 'GET', url: '/api/import-lists/4', expectedMessage: 'Import list repository is not configured' },
      { method: 'POST', url: '/api/import-lists', payload: {
        name: 'List',
        providerType: 'tmdb-list',
        config: {},
        rootFolderPath: '/media',
        qualityProfileId: 1,
        monitorType: 'movie',
      }, expectedMessage: 'Import list repository is not configured' },
      { method: 'PUT', url: '/api/import-lists/4', payload: {}, expectedMessage: 'Import list repository is not configured' },
      { method: 'DELETE', url: '/api/import-lists/4', expectedMessage: 'Import list repository is not configured' },
      { method: 'POST', url: '/api/import-lists/4/sync', expectedMessage: 'Import list sync service is not configured' },
      { method: 'GET', url: '/api/import-lists/providers', expectedMessage: 'Import list provider registry is not configured' },
      { method: 'GET', url: '/api/import-lists/exclusions', expectedMessage: 'Import list repository is not configured' },
      { method: 'POST', url: '/api/import-lists/exclusions', payload: { title: 'Movie', tmdbId: 1 }, expectedMessage: 'Import list repository is not configured' },
      { method: 'DELETE', url: '/api/import-lists/exclusions/8', expectedMessage: 'Import list repository is not configured' },
    ])('returns 422 for $method $url when its dependency is absent', async ({
      method,
      url,
      payload,
      expectedMessage,
    }) => {
      const appWithoutDependencies = createApp();

      try {
        const httpMethod = method as 'GET' | 'POST' | 'PUT' | 'DELETE';
        const response = payload === undefined
          ? await appWithoutDependencies.inject({ method: httpMethod, url })
          : await appWithoutDependencies.inject({ method: httpMethod, url, payload });

        expect(response.statusCode).toBe(422);
        expect(response.json()).toMatchObject({
          ok: false,
          error: { code: 'VALIDATION_ERROR', message: expectedMessage },
        });
      } finally {
        await appWithoutDependencies.close();
      }
    });
  });
});
