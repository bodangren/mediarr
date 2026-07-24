import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerImportRoutes } from './importRoutes';

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  matchFolder: vi.fn(),
  searchByTitle: vi.fn(),
  executeImport: vi.fn(),
}));

vi.mock('../../services/ExistingLibraryScanner', () => ({
  ExistingLibraryScanner: class {
    scan = mocks.scan;
  },
}));

vi.mock('../../services/ImportMatchService', () => ({
  ImportMatchService: class {
    matchFolder = mocks.matchFolder;
    searchByTitle = mocks.searchByTitle;
  },
}));

vi.mock('../../services/BulkImportService', () => ({
  BulkImportService: class {
    executeImport = mocks.executeImport;
  },
}));

function createDependencies() {
  return {
    prisma: {
      movie: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    },
    metadataProvider: {
      searchMedia: vi.fn(),
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn(),
      findMovieByImdbId: vi.fn(),
    },
  };
}

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerImportRoutes(app, deps);
  return app;
}

describe('bulk import registered handlers', () => {
  let app: FastifyInstance;
  let deps: ReturnType<typeof createDependencies>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createDependencies();
    app = createApp(deps as unknown as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('scans folders, resolves match candidates, and returns the exact envelope', async () => {
    const folder = {
      path: '/library/Example',
      type: 'movie' as const,
      files: [{ path: '/library/Example/movie.mkv', size: 123, extension: '.mkv' }],
      parsedTitle: 'Example',
      parsedYear: 2026,
    };
    const candidates = [{
      id: 77,
      title: 'Example',
      year: 2026,
      confidence: 1,
      matchSource: 'exact' as const,
    }];
    mocks.scan.mockResolvedValue({
      rootPath: '/library',
      folders: [folder],
      totalFiles: 1,
      scanDurationMs: 12,
    });
    mocks.matchFolder.mockResolvedValue(candidates);

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/scan',
      payload: { path: '/library' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        rootPath: '/library',
        folders: [{
          ...folder,
          matchCandidates: candidates,
          selectedMatchId: 77,
        }],
        totalFiles: 1,
        scanDurationMs: 12,
      },
    });
    expect(mocks.scan).toHaveBeenCalledWith('/library');
    expect(mocks.matchFolder).toHaveBeenCalledWith(folder);
  });

  it('rejects an invalid scan request before invoking the scanner', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import/scan',
      payload: {},
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "body must have required property 'path'",
        details: expect.any(Array),
        retryable: false,
        path: '/api/import/scan',
      },
    });
    expect(mocks.scan).not.toHaveBeenCalled();
  });

  it('returns an explicit failure when metadata matching is not configured', async () => {
    const noProviderApp = createApp({ prisma: deps.prisma } as unknown as ApiDependencies);

    const response = await noProviderApp.inject({
      method: 'POST',
      url: '/api/import/scan',
      payload: { path: '/library' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: 'Metadata provider not configured',
    });
    expect(mocks.scan).not.toHaveBeenCalled();
    await noProviderApp.close();
  });

  it('propagates scanner failures through the API error contract', async () => {
    mocks.scan.mockRejectedValue(new Error('scan volume unavailable'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/scan',
      payload: { path: '/library' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'scan volume unavailable',
        retryable: false,
        path: '/api/import/scan',
      },
    });
  });

  it('searches the requested media type and returns exact candidates', async () => {
    const candidates = [{
      id: 91,
      title: 'Search Title',
      confidence: 0.97,
      matchSource: 'search',
    }];
    mocks.searchByTitle.mockResolvedValue(candidates);

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/search',
      payload: { title: 'Search Title', mediaType: 'series' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: candidates });
    expect(mocks.searchByTitle).toHaveBeenCalledWith('Search Title', 'series');
  });

  it('rejects an unsupported search media type before calling the matcher', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import/search',
      payload: { title: 'Search Title', mediaType: 'book' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        path: '/api/import/search',
        retryable: false,
      },
    });
    expect(mocks.searchByTitle).not.toHaveBeenCalled();
  });

  it('backfills posters and reports updated, skipped, and failed records exactly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    deps.prisma.movie.findMany.mockResolvedValue([
      { id: 1, tmdbId: 11, title: 'Poster' },
      { id: 2, tmdbId: null, title: 'No ID' },
      { id: 3, tmdbId: 33, title: 'No Image' },
      { id: 4, tmdbId: 44, title: 'Provider Error' },
    ]);
    deps.metadataProvider.getMediaDetails.mockImplementation(async ({ tmdbId }) => {
      if (tmdbId === 11) {
        return { images: [{ url: 'https://image.tmdb.org/poster.jpg' }] };
      }
      if (tmdbId === 33) {
        return { images: [] };
      }
      throw new Error('metadata timeout');
    });
    deps.prisma.movie.update.mockResolvedValue({ id: 1 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/backfill-posters',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        total: 4,
        updated: 1,
        skipped: 2,
        failed: 1,
        errors: [{ title: 'Provider Error', error: 'metadata timeout' }],
      },
    });
    expect(deps.prisma.movie.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ posterUrl: null }, { posterUrl: '' }],
      },
      select: { id: true, tmdbId: true, title: true },
    });
    expect(deps.prisma.movie.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { posterUrl: 'https://image.tmdb.org/poster.jpg' },
    });
    expect(consoleError).toHaveBeenCalledWith(
      '[backfill-posters] "Provider Error": metadata timeout',
    );
  });

  it('propagates poster repository failures instead of fabricating a summary', async () => {
    deps.prisma.movie.findMany.mockRejectedValue(new Error('movie query failed'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/backfill-posters',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'movie query failed',
        retryable: false,
        path: '/api/import/backfill-posters',
      },
    });
  });

  it('passes validated bulk items to the import service and returns its result', async () => {
    const items = [{
      folderPath: '/incoming/Example',
      mediaType: 'movie' as const,
      matchId: 77,
      files: [{
        path: '/incoming/Example/movie.mkv',
        size: 123,
        extension: '.mkv',
      }],
      renameFiles: true,
      rootFolderPath: '/media/movies',
      qualityProfileId: 4,
    }];
    const result = { imported: 1, failed: 0, errors: [] };
    mocks.executeImport.mockResolvedValue(result);

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/execute',
      payload: { items },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: result });
    expect(mocks.executeImport).toHaveBeenCalledWith(items);
  });

  it('rejects incomplete bulk items before invoking the import service', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import/execute',
      payload: {
        items: [{
          folderPath: '/incoming/Example',
          mediaType: 'movie',
          matchId: 77,
          files: [],
          renameFiles: true,
          rootFolderPath: '/media/movies',
        }],
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        path: '/api/import/execute',
        retryable: false,
      },
    });
    expect(mocks.executeImport).not.toHaveBeenCalled();
  });

  it('propagates bulk import failures through the API error contract', async () => {
    mocks.executeImport.mockRejectedValue(new Error('organizer failed'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/import/execute',
      payload: {
        items: [{
          folderPath: '/incoming/Example',
          mediaType: 'movie',
          matchId: 77,
          files: [],
          renameFiles: false,
          rootFolderPath: '/media/movies',
          qualityProfileId: 4,
        }],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'organizer failed',
        retryable: false,
        path: '/api/import/execute',
      },
    });
  });
});
