import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted
// ---------------------------------------------------------------------------

const mockStat = vi.hoisted(() => vi.fn());
const mockMkdir = vi.hoisted(() => vi.fn());
const mockRename = vi.hoisted(() => vi.fn());
const mockCopyFile = vi.hoisted(() => vi.fn());
const mockUnlink = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({
  default: {
    stat: mockStat,
    mkdir: mockMkdir,
    rename: mockRename,
    copyFile: mockCopyFile,
    unlink: mockUnlink,
  },
  stat: mockStat,
  mkdir: mockMkdir,
  rename: mockRename,
  copyFile: mockCopyFile,
  unlink: mockUnlink,
}));

const mockScanFn = vi.hoisted(() => vi.fn());
vi.mock('../../services/ExistingLibraryScanner', () => ({
  ExistingLibraryScanner: vi.fn(function () {
    return { scan: mockScanFn };
  }),
}));

const mockUpsertVariant = vi.hoisted(() => vi.fn());
vi.mock('../../repositories/SubtitleVariantRepository', () => ({
  SubtitleVariantRepository: vi.fn(function () {
    return { upsertVariant: mockUpsertVariant };
  }),
}));

const mockScanAndMatchEpisodes = vi.hoisted(() => vi.fn());
vi.mock('../../services/FilenameParsingService', () => ({
  FilenameParsingService: vi.fn(function () {
    return { scanAndMatchEpisodes: mockScanAndMatchEpisodes };
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

function makeRescanDeps(overrides: Partial<Record<string, any>> = {}): ApiDependencies {
  return {
    prisma: {
      series: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          tvdbId: 999,
          title: 'My Show',
          path: '/media/my-show',
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      season: {
        upsert: vi.fn().mockResolvedValue({ id: 10 }),
      },
      episode: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(3),
        findMany: vi.fn().mockResolvedValue([
          { id: 100, seasonNumber: 1, episodeNumber: 1 },
        ]),
      },
      playbackProgress: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    metadataProvider: {
      getSeriesDetails: vi.fn().mockResolvedValue({
        episodes: [
          { tvdbId: 9001, seasonNumber: 1, episodeNumber: 1, title: 'Pilot', airDate: '2024-01-01' },
        ],
      }),
    },
    ...overrides,
  } as unknown as ApiDependencies;
}

// ---------------------------------------------------------------------------
// Phase 1 — Rescan endpoint
// ---------------------------------------------------------------------------

describe('seriesRoutes — POST /api/series/:id/rescan', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: folder scan returns empty
    mockScanFn.mockResolvedValue({ folders: [] });
    mockUpsertVariant.mockResolvedValue({});
  });

  it('1.1 returns 404 when series does not exist', async () => {
    const deps = makeRescanDeps();
    (deps.prisma as any).series.findUnique.mockResolvedValue(null);

    const app = createApp(deps);
    const res = await app.inject({ method: 'POST', url: '/api/series/1/rescan' });

    expect(res.statusCode).toBe(404);
  });

  it('1.2 returns 422 when metadata provider is not configured', async () => {
    const deps = makeRescanDeps({ metadataProvider: undefined });

    const app = createApp(deps);
    const res = await app.inject({ method: 'POST', url: '/api/series/1/rescan' });

    expect(res.statusCode).toBe(422);
  });

  it('1.3 returns episodeCount=0 and filesLinked=0 when provider returns empty episode list', async () => {
    const deps = makeRescanDeps();
    (deps.metadataProvider as any).getSeriesDetails.mockResolvedValue({ episodes: [] });
    (deps.prisma as any).episode.count.mockResolvedValue(0);

    const app = createApp(deps);
    const res = await app.inject({ method: 'POST', url: '/api/series/1/rescan' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.episodeCount).toBe(0);
    expect(body.data.filesLinked).toBe(0);
  });

  it('1.4 includes seriesId in episode upsert update clause', async () => {
    const deps = makeRescanDeps();

    const app = createApp(deps);
    await app.inject({ method: 'POST', url: '/api/series/1/rescan' });

    const upsertCalls = (deps.prisma as any).episode.upsert.mock.calls;
    expect(upsertCalls.length).toBeGreaterThan(0);
    // The update clause MUST contain seriesId so re-linking episodes works across rescans
    const updateArg = upsertCalls[0][0].update;
    expect(updateArg).toHaveProperty('seriesId', 1);
  });

  it('1.5 non-fatal scan error when series path is unreadable — filesLinked=0 but request succeeds', async () => {
    const deps = makeRescanDeps();
    mockScanFn.mockRejectedValue(new Error('ENOENT: no such file'));

    const app = createApp(deps);
    const res = await app.inject({ method: 'POST', url: '/api/series/1/rescan' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.filesLinked).toBe(0);
  });

  it('1.6 updates series.path in DB when folderPath body param differs from stored path', async () => {
    const deps = makeRescanDeps();

    const app = createApp(deps);
    await app.inject({
      method: 'POST',
      url: '/api/series/1/rescan',
      payload: { folderPath: '/media/new-location' },
    });

    expect((deps.prisma as any).series.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { path: '/media/new-location' },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — import/apply endpoint
// ---------------------------------------------------------------------------

function makeImportApplyDeps(): ApiDependencies {
  return {
    prisma: {
      series: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          title: 'My Show',
          path: '/media',
        }),
      },
      episode: {
        findUnique: vi.fn().mockResolvedValue({
          id: 100,
          seasonNumber: 1,
          episodeNumber: 1,
        }),
        update: vi.fn().mockResolvedValue({ id: 100 }),
      },
      mediaFileVariant: {
        create: vi.fn().mockResolvedValue({}),
      },
      playbackProgress: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  } as unknown as ApiDependencies;
}

describe('seriesRoutes — POST /api/series/import/apply', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 1024 * 1024 });
  });

  it('2.1 empty files array returns {imported:0, failed:0, errors:[]}', async () => {
    const app = createApp(makeImportApplyDeps());
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: { files: [] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual({ imported: 0, failed: 0, errors: [] });
  });

  it('2.2 series not found adds error entry and increments failed', async () => {
    const deps = makeImportApplyDeps();
    (deps.prisma as any).series.findUnique.mockResolvedValue(null);

    const app = createApp(deps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{ path: '/tmp/ep.mkv', seriesId: 1, seasonId: 10, episodeId: 100 }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.failed).toBe(1);
    expect(body.data.imported).toBe(0);
    expect(body.data.errors[0].path).toBe('/tmp/ep.mkv');
  });

  it('2.3 series has no path adds error entry', async () => {
    const deps = makeImportApplyDeps();
    (deps.prisma as any).series.findUnique.mockResolvedValue({ id: 1, title: 'My Show', path: null });

    const app = createApp(deps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{ path: '/tmp/ep.mkv', seriesId: 1, seasonId: 10, episodeId: 100 }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.failed).toBe(1);
    expect(body.data.errors[0].error).toMatch(/no path/i);
  });

  it('2.4 episode not found adds error entry', async () => {
    const deps = makeImportApplyDeps();
    (deps.prisma as any).episode.findUnique.mockResolvedValue(null);

    const app = createApp(deps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{ path: '/tmp/ep.mkv', seriesId: 1, seasonId: 10, episodeId: 100 }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.failed).toBe(1);
    expect(body.data.errors[0].error).toMatch(/not found/i);
  });

  it('2.5 path traversal via series.title causes safePath to throw → caught in errors array', async () => {
    const deps = makeImportApplyDeps();
    // Title with path traversal
    (deps.prisma as any).series.findUnique.mockResolvedValue({
      id: 1,
      title: '../../../etc',
      path: '/media',
    });

    const app = createApp(deps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{ path: '/tmp/ep.mkv', seriesId: 1, seasonId: 10, episodeId: 100 }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // safePath should throw → caught → error entry
    expect(body.data.failed).toBe(1);
    expect(body.data.errors[0].error).toMatch(/traversal|escape/i);
  });

  it('2.6 handles EXDEV with copy then unlink and completes the import', async () => {
    mockRename.mockRejectedValue(Object.assign(new Error('cross-device link not permitted'), { code: 'EXDEV' }));

    const app = createApp(makeImportApplyDeps());
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{ path: '/tmp/ep.mkv', seriesId: 1, seasonId: 10, episodeId: 100 }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual({ imported: 1, failed: 0, errors: [] });
    expect(mockCopyFile).toHaveBeenCalledWith(
      '/tmp/ep.mkv',
      '/media/My Show/Season 01/My Show - S01E01.mkv',
    );
    expect(mockUnlink).toHaveBeenCalledWith('/tmp/ep.mkv');
  });

  it('2.7 mixed batch: partial success returns correct imported/failed counts', async () => {
    const deps = makeImportApplyDeps();

    // Second call to series.findUnique returns null (series not found for 2nd file)
    (deps.prisma as any).series.findUnique
      .mockResolvedValueOnce({ id: 1, title: 'My Show', path: '/media' })
      .mockResolvedValueOnce(null);

    const app = createApp(deps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [
          { path: '/tmp/ep1.mkv', seriesId: 1, seasonId: 10, episodeId: 100 },
          { path: '/tmp/ep2.mkv', seriesId: 2, seasonId: 20, episodeId: 200 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.failed).toBe(1);
    expect(body.data.errors).toHaveLength(1);
    expect(body.data.errors[0].path).toBe('/tmp/ep2.mkv');
  });

  it('2.8 persists the exact EPISODE variant payload and incrementally indexes it', async () => {
    const indexMovieVariant = vi.fn().mockResolvedValue(undefined);
    const indexEpisodeVariant = vi.fn().mockResolvedValue(undefined);
    const deps = makeImportApplyDeps();
    deps.variantInventoryIndexer = {
      indexMovieVariant,
      indexEpisodeVariant,
    };
    const app = createApp(deps);

    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/apply',
      payload: {
        files: [{
          path: '/tmp/ep.mkv',
          seriesId: 1,
          seasonId: 10,
          episodeId: 100,
          quality: '1080p',
        }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ imported: 1, failed: 0, errors: [] });
    expect(mockUpsertVariant).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      episodeId: 100,
      path: '/media/My Show/Season 01/My Show - S01E01.mkv',
      fileSize: 1024 * 1024,
      quality: '1080p',
    });
    expect(indexEpisodeVariant).toHaveBeenCalledWith(100, {
      path: '/media/My Show/Season 01/My Show - S01E01.mkv',
      fileSize: 1024 * 1024,
      quality: '1080p',
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — import/scan endpoint
// ---------------------------------------------------------------------------

describe('seriesRoutes — POST /api/series/import/scan', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('3.1 returns 422 when path does not exist', async () => {
    mockStat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const app = createApp({
      prisma: { playbackProgress: { findMany: vi.fn().mockResolvedValue([]) } },
    } as unknown as ApiDependencies);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/scan',
      payload: { path: '/nonexistent/dir' },
    });

    expect(res.statusCode).toBe(422);
  });

  it('3.2 returns 422 when path is a file, not a directory', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false });

    const app = createApp({
      prisma: { playbackProgress: { findMany: vi.fn().mockResolvedValue([]) } },
    } as unknown as ApiDependencies);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/scan',
      payload: { path: '/media/some-file.mkv' },
    });

    expect(res.statusCode).toBe(422);
  });

  it('3.3 valid directory scan delegates to FilenameParsingService and returns files', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => true });
    mockScanAndMatchEpisodes.mockResolvedValue([
      { path: '/media/s01e01.mkv', series: 'My Show', seasonNumber: 1, episodeNumber: 1 },
    ]);

    const app = createApp({
      prisma: { playbackProgress: { findMany: vi.fn().mockResolvedValue([]) } },
    } as unknown as ApiDependencies);
    const res = await app.inject({
      method: 'POST',
      url: '/api/series/import/scan',
      payload: { path: '/media/imports' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.files).toHaveLength(1);
    expect(mockScanAndMatchEpisodes).toHaveBeenCalledWith('/media/imports');
  });
});
