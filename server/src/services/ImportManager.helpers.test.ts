import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportManager } from './ImportManager';

vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ dev: 2049 }),
  },
}));

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    torrent: { findUnique: vi.fn().mockResolvedValue(null) },
    activityEvent: { findUnique: vi.fn().mockResolvedValue(null) },
    appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    series: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    episode: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    movie: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    mediaFileVariant: { upsert: vi.fn().mockResolvedValue({ id: 1 }) },
    ...overrides,
  };
}

vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    readdir: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    link: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ImportManager — retry and helper edge cases', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    vi.clearAllMocks();
  });

  it('retryImportByInfoHash throws when torrent not found', async () => {
    prisma.torrent.findUnique = vi.fn().mockResolvedValue(null);
    const manager = new ImportManager({} as any, {} as any, prisma as any);

    await expect(manager.retryImportByInfoHash('nonexistent')).rejects.toThrow(
      "Torrent 'nonexistent' not found",
    );
  });

  it('retryImportByActivityEventId throws when event not found', async () => {
    prisma.activityEvent.findUnique = vi.fn().mockResolvedValue(null);
    const manager = new ImportManager({} as any, {} as any, prisma as any);

    await expect(manager.retryImportByActivityEventId(999)).rejects.toThrow(
      "Activity event '999' not found",
    );
  });

  it('retryImportByActivityEventId throws when event is not IMPORT_FAILED type', async () => {
    prisma.activityEvent.findUnique = vi.fn().mockResolvedValue({
      id: 1,
      eventType: 'SERIES_IMPORTED',
      entityRef: 'torrent:abc123',
      details: {},
    });
    const manager = new ImportManager({} as any, {} as any, prisma as any);

    await expect(manager.retryImportByActivityEventId(1)).rejects.toThrow(
      "Activity event '1' is not an import failure",
    );
  });

  it('retryImportByActivityEventId falls back to sourcePath when torrent row is deleted — emits IMPORT_FAILED if no match', async () => {
    prisma.activityEvent.findUnique = vi.fn().mockResolvedValue({
      id: 1,
      eventType: 'IMPORT_FAILED',
      entityRef: 'torrent:deleted-hash',
      details: {
        sourcePath: '/downloads/complete/Show.S01E01.mkv',
        torrentName: 'Show.S01E01.mkv',
        reason: 'no match found',
      },
    });
    prisma.torrent.findUnique = vi.fn().mockResolvedValue(null);

    const emitMock = vi.fn().mockResolvedValue(undefined);
    const manager = new ImportManager({} as any, {} as any, prisma as any, { emit: emitMock } as any);

    await expect(manager.retryImportByActivityEventId(1)).resolves.not.toThrow();

    const importFailed = emitMock.mock.calls.find(
      (call: any[]) => call[0]?.eventType === 'IMPORT_FAILED',
    );
    expect(importFailed).toBeDefined();
  });

  it('import hook failure does not prevent import from completing', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv' };
    const episode = { id: 10, seasonNumber: 1, episodeNumber: 1 };
    const torrent = {
      infoHash: 'hook-test',
      name: 'Breaking.Bad.S01E01.Pilot.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.Pilot.mkv',
    };

    prisma.series.findFirst = vi.fn().mockResolvedValue(series);
    prisma.episode.findFirst = vi.fn().mockResolvedValue(episode);
    prisma.episode.findUnique = vi.fn().mockResolvedValue(episode);

    const failingHook = vi.fn().mockRejectedValue(new Error('Hook DB connection failed'));
    const emitMock = vi.fn().mockResolvedValue(undefined);

    const listeners: Record<string, ((payload: any) => void)[]> = {};
    const torrentManager = {
      on: vi.fn((event: string, cb: (payload: any) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(cb);
      }),
      emit(event: string, payload: any) {
        for (const cb of listeners[event] ?? []) cb(payload);
      },
    };

    new ImportManager(
      torrentManager as any,
      { organizeFile: vi.fn().mockResolvedValue('/media/tv/Show/S01E01.mkv') } as any,
      prisma as any,
      { emit: emitMock } as any,
      { onEpisodeImported: failingHook },
    );

    await new Promise<void>((resolve) => {
      torrentManager.emit('torrent:completed', torrent);
      setImmediate(resolve);
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(failingHook).toHaveBeenCalled();
    const seriesImported = emitMock.mock.calls.find(
      (call: any[]) => call[0]?.eventType === 'SERIES_IMPORTED',
    );
    expect(seriesImported).toBeDefined();
    expect(seriesImported![0].success).toBe(true);
  });

  it('retryImportByInfoHash throws when resolved path does not exist on disk', async () => {
    const mod = await import('node:fs/promises');
    const mockedFs = (mod as any).default;
    mockedFs.stat.mockRejectedValue(new Error('ENOENT'));

    prisma.torrent.findUnique = vi.fn().mockResolvedValue({
      infoHash: 'missing-path',
      name: 'Movie.2020.mkv',
      path: '/downloads/complete',
    });

    const manager = new ImportManager({} as any, {} as any, prisma as any);

    await expect(manager.retryImportByInfoHash('missing-path')).rejects.toThrow(
      /no importable files found/i,
    );
  });

  it('resolveRetryImportPath prefers rootPath/name over bare rootPath', async () => {
    const mod = await import('node:fs/promises');
    const mockedFs = (mod as any).default;
    // Both joined path and base path exist on disk
    mockedFs.stat
      .mockResolvedValueOnce({ isDirectory: () => false } as any)  // rootPath/name exists
      .mockResolvedValueOnce({ isDirectory: () => false } as any); // rootPath also exists

    const movie = { id: 5, title: 'The Matrix', year: 1999, path: '/media/movies' };
    prisma.torrent.findUnique = vi.fn().mockResolvedValue({
      infoHash: 'pref-test',
      name: 'The.Matrix.1999.mkv',
      path: '/downloads/complete',
    });
    prisma.movie.findFirst = vi.fn().mockResolvedValue(movie);
    prisma.series.findFirst = vi.fn().mockResolvedValue(null);
    prisma.episode.findFirst = vi.fn().mockResolvedValue(null);
    prisma.movie.findUnique = vi.fn().mockResolvedValue(movie);

    const organizer = {
      organizeMovieFile: vi.fn().mockResolvedValue('/media/movies/The Matrix (1999)/The.Matrix.1999.mkv'),
    };
    const manager = new ImportManager({} as any, organizer as any, prisma as any);

    await manager.retryImportByInfoHash('pref-test');

    // Should use the joined path (rootPath/name), not bare rootPath
    expect(organizer.organizeMovieFile).toHaveBeenCalledWith(
      '/downloads/complete/The.Matrix.1999.mkv',
      expect.anything(),
      { move: true },
    );
  });

  it('retryImportByActivityEventId throws when sourcePath is empty string', async () => {
    prisma.activityEvent.findUnique = vi.fn().mockResolvedValue({
      id: 42,
      eventType: 'IMPORT_FAILED',
      entityRef: 'torrent:abc123',
      details: {
        sourcePath: '',
        torrentName: 'Movie.2020.mkv',
      },
    });

    const manager = new ImportManager({} as any, {} as any, prisma as any);

    await expect(manager.retryImportByActivityEventId(42)).rejects.toThrow(
      /no retryable source path/i,
    );
  });
});
