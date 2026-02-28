import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportManager } from './ImportManager';

// --- Helpers ---

function makeTorrentManager() {
  const listeners: Record<string, ((payload: any) => void)[]> = {};
  return {
    on: vi.fn((event: string, cb: (payload: any) => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    emit(event: string, payload: any) {
      for (const cb of listeners[event] ?? []) {
        cb(payload);
      }
    },
  };
}

function makeOrganizer() {
  return {
    organizeFile: vi.fn().mockResolvedValue('/media/tv/Show/Season 01/Show - S01E01 - Pilot.mkv'),
    organizeMovieFile: vi.fn().mockResolvedValue('/media/movies/The Matrix (1999)/The Matrix (1999).mkv'),
  };
}

function makeActivityEmitter() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

/** Build a minimal Prisma mock with the shapes ImportManager needs */
function makePrisma({
  series = null as any,
  episode = null as any,
  movie = null as any,
  mediaManagement = null as any,
  torrent = null as any,
  activityEvent = null as any,
} = {}) {
  return {
    series: {
      findFirst: vi.fn().mockResolvedValue(series),
      update: vi.fn().mockResolvedValue(series),
    },
    episode: {
      findFirst: vi.fn().mockResolvedValue(episode),
      update: vi.fn().mockResolvedValue(episode),
    },
    movie: {
      findFirst: vi.fn().mockResolvedValue(movie),
      update: vi.fn().mockResolvedValue(movie),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    appSettings: {
      findUnique: vi.fn().mockResolvedValue(
        mediaManagement
          ? { mediaManagement }
          : null,
      ),
    },
    torrent: {
      findUnique: vi.fn().mockResolvedValue(torrent),
    },
    activityEvent: {
      findUnique: vi.fn().mockResolvedValue(activityEvent),
    },
  };
}

const TORRENT = {
  infoHash: 'abc123',
  name: 'The.Matrix.1999.mkv',
  path: '/downloads/complete/The.Matrix.1999.mkv',
};

// Fs mock — a single video file at the torrent path
vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    readdir: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    link: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---

describe('ImportManager', () => {
  let torrentManager: ReturnType<typeof makeTorrentManager>;
  let organizer: ReturnType<typeof makeOrganizer>;
  let activityEmitter: ReturnType<typeof makeActivityEmitter>;

  beforeEach(() => {
    torrentManager = makeTorrentManager();
    organizer = makeOrganizer();
    activityEmitter = makeActivityEmitter();
    vi.clearAllMocks();
  });

  // Helper: fire torrent:completed and wait for async handling to finish
  async function fireTorrentCompleted(
    prisma: ReturnType<typeof makePrisma>,
    torrent = TORRENT,
  ) {
    new ImportManager(torrentManager as any, organizer as any, prisma as any, activityEmitter as any);
    // Fire the event
    await new Promise<void>((resolve) => {
      torrentManager.emit('torrent:completed', torrent);
      // Give microtasks/promises a tick to settle
      setImmediate(resolve);
    });
    // Additional flush for chained promises
    await new Promise((r) => setTimeout(r, 0));
  }

  // ───────── Episode import success ─────────

  it('episode import: organizeFile called and SERIES_IMPORTED logged', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv/Breaking Bad' };
    const episode = { id: 10, seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const prisma = makePrisma({ series, episode });

    const torrent = {
      infoHash: 'ep123',
      name: 'Breaking.Bad.S01E01.Pilot.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.Pilot.mkv',
    };

    await fireTorrentCompleted(prisma, torrent);

    expect(organizer.organizeFile).toHaveBeenCalledWith(
      torrent.path,
      series,
      episode,
    );
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: episode.id } }),
    );
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SERIES_IMPORTED',
        success: true,
      }),
    );
  });

  // ───────── Movie import success ─────────

  it('movie import: organizeMovieFile called and MOVIE_IMPORTED logged', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: '/media/movies' };
    const prisma = makePrisma({ series: null, episode: null, movie });

    await fireTorrentCompleted(prisma);

    expect(organizer.organizeMovieFile).toHaveBeenCalledWith(
      TORRENT.path,
      movie,
    );
    expect(prisma.mediaFileVariant.upsert).toHaveBeenCalled();
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'MOVIE_IMPORTED',
        success: true,
      }),
    );
  });

  // ───────── No match found ─────────

  it('no match found: IMPORT_FAILED logged and does not throw', async () => {
    const prisma = makePrisma({ series: null, episode: null, movie: null });

    await fireTorrentCompleted(prisma);

    expect(organizer.organizeFile).not.toHaveBeenCalled();
    expect(organizer.organizeMovieFile).not.toHaveBeenCalled();
    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'IMPORT_FAILED',
        success: false,
        details: expect.objectContaining({ reason: expect.stringContaining('no match') }),
      }),
    );
  });

  // ───────── Organizer throws ─────────

  it('organizer throws: IMPORT_FAILED logged, does not rethrow', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv/Breaking Bad' };
    const episode = { id: 10, seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const prisma = makePrisma({ series, episode });

    organizer.organizeFile.mockRejectedValue(new Error('disk full'));

    const torrent = {
      infoHash: 'ep123',
      name: 'Breaking.Bad.S01E01.Pilot.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.Pilot.mkv',
    };

    // Should not throw
    await expect(fireTorrentCompleted(prisma, torrent)).resolves.not.toThrow();

    expect(activityEmitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'IMPORT_FAILED',
        success: false,
        details: expect.objectContaining({ reason: 'disk full' }),
      }),
    );
  });

  it('episode import fallback: uses tvRootFolder when series.path is null', async () => {
    const series = { id: 1, title: 'A Knight of the Seven Kingdoms', cleanTitle: 'aknight', year: 2026, path: null };
    const episode = { id: 10, seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };
    const prisma = makePrisma({
      series,
      episode,
      mediaManagement: { movieRootFolder: '/media/movies', tvRootFolder: '/media/tv' },
    });

    const torrent = {
      infoHash: 'ep124',
      name: 'A.Knight.of.the.Seven.Kingdoms.S01E01.mkv',
      path: '/downloads/complete/A.Knight.of.the.Seven.Kingdoms.S01E01.mkv',
    };

    await fireTorrentCompleted(prisma, torrent);

    expect(prisma.series.update).toHaveBeenCalledWith({
      where: { id: series.id },
      data: { path: '/media/tv/A Knight of the Seven Kingdoms (2026)' },
    });
    expect(organizer.organizeFile).toHaveBeenCalledWith(
      torrent.path,
      expect.objectContaining({
        id: series.id,
        path: '/media/tv/A Knight of the Seven Kingdoms (2026)',
      }),
      episode,
    );
  });

  it('movie import fallback: uses movieRootFolder when movie.path is null', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: null };
    const prisma = makePrisma({
      series: null,
      episode: null,
      movie,
      mediaManagement: { movieRootFolder: '/media/movies', tvRootFolder: '/media/tv' },
    });

    await fireTorrentCompleted(prisma);

    expect(prisma.movie.update).toHaveBeenCalledWith({
      where: { id: movie.id },
      data: { path: '/media/movies/The Matrix (1999)' },
    });
    expect(organizer.organizeMovieFile).toHaveBeenCalledWith(
      TORRENT.path,
      expect.objectContaining({
        id: movie.id,
        path: '/media/movies/The Matrix (1999)',
      }),
    );
  });

  it('retryImportByInfoHash retries using persisted torrent path', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: '/media/movies' };
    const prisma = makePrisma({
      series: null,
      episode: null,
      movie,
      torrent: {
        infoHash: 'retry-1',
        name: 'The.Matrix.1999.mkv',
        path: '/downloads/complete',
      },
    });

    const manager = new ImportManager(
      torrentManager as any,
      organizer as any,
      prisma as any,
      activityEmitter as any,
    );

    await manager.retryImportByInfoHash('retry-1');

    expect(prisma.torrent.findUnique).toHaveBeenCalledWith({
      where: { infoHash: 'retry-1' },
      select: {
        infoHash: true,
        name: true,
        path: true,
      },
    });
    expect(organizer.organizeMovieFile).toHaveBeenCalledWith(
      '/downloads/complete/The.Matrix.1999.mkv',
      movie,
    );
  });

  it('retryImportByActivityEventId falls back to sourcePath when torrent row is missing', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: '/media/movies' };
    const prisma = makePrisma({
      series: null,
      episode: null,
      movie,
      torrent: null,
      activityEvent: {
        id: 175,
        eventType: 'IMPORT_FAILED',
        entityRef: 'torrent:missinghash',
        details: {
          sourcePath: '/downloads/complete/The.Matrix.1999.mkv',
          torrentName: 'The.Matrix.1999.mkv',
        },
      },
    });

    const manager = new ImportManager(
      torrentManager as any,
      organizer as any,
      prisma as any,
      activityEmitter as any,
    );

    await manager.retryImportByActivityEventId(175);

    expect(prisma.activityEvent.findUnique).toHaveBeenCalledWith({
      where: { id: 175 },
      select: {
        id: true,
        eventType: true,
        entityRef: true,
        details: true,
      },
    });
    expect(organizer.organizeMovieFile).toHaveBeenCalledWith(
      '/downloads/complete/The.Matrix.1999.mkv',
      movie,
    );
  });
});
