import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportManager } from './ImportManager';
import fs from 'node:fs/promises';

vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ dev: 2049 }),
  },
}));

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

function makeDb({
  series = null as any,
  episode = null as any,
  movie = null as any,
  torrent = null as any,
  appSettings = null as any,
  seriesFindFirst = undefined as any,
  episodeFindFirst = undefined as any,
  movieFindFirst = undefined as any,
} = {}) {
  return {
    series: {
      findFirst: seriesFindFirst ?? vi.fn().mockResolvedValue(series),
      findUnique: vi.fn().mockResolvedValue(series),
      update: vi.fn().mockResolvedValue(series),
    },
    episode: {
      findFirst: episodeFindFirst ?? vi.fn().mockResolvedValue(episode),
      findUnique: vi.fn().mockResolvedValue(episode),
      update: vi.fn().mockResolvedValue(episode),
    },
    movie: {
      findFirst: movieFindFirst ?? vi.fn().mockResolvedValue(movie),
      findUnique: vi.fn().mockResolvedValue(movie),
      update: vi.fn().mockResolvedValue(movie),
    },
    mediaFileVariant: {
      upsert: vi.fn().mockResolvedValue({ id: 1 }),
    },
    appSettings: {
      findUnique: vi.fn().mockResolvedValue(
        appSettings ? { mediaManagement: appSettings } : null,
      ),
    },
    torrent: {
      findUnique: vi.fn().mockResolvedValue(torrent),
    },
    activityEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
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

async function fireTorrentCompleted(
  prisma: ReturnType<typeof makeDb>,
  torrent: any,
  organizer?: ReturnType<typeof makeOrganizer>,
  torrentManager?: ReturnType<typeof makeTorrentManager>,
) {
  const tm = torrentManager ?? makeTorrentManager();
  const org = organizer ?? makeOrganizer();
  const ae = makeActivityEmitter();

  new ImportManager(tm as any, org as any, prisma as any, ae as any);

  await new Promise<void>((resolve) => {
    tm.emit('torrent:completed', torrent);
    setImmediate(resolve);
  });
  await new Promise((r) => setTimeout(r, 0));

  return { tm, org, ae };
}

describe('ImportManager — parser-based slow path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses episode filename and matches series+episode when no linked ID exists', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv/Breaking Bad' };
    const episode = { id: 10, seasonNumber: 1, episodeNumber: 1, title: 'Pilot' };

    const prisma = makeDb({
      series,
      episode,
      seriesFindFirst: vi.fn().mockResolvedValue(series),
      episodeFindFirst: vi.fn().mockResolvedValue(episode),
    });

    const torrent = {
      infoHash: 'slow-ep',
      name: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay.mkv',
      path: '/downloads/complete/Breaking.Bad.S01E01.Pilot.1080p.BluRay.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeFile).toHaveBeenCalled();
    expect(prisma.episode.update).toHaveBeenCalled();
    expect(ae.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SERIES_IMPORTED', success: true }),
    );
  });

  it('parsed episode with no matching DB episode falls through to movie path', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv' };
    const movie = { id: 5, title: 'Breaking Bad Movie', year: 2019, path: '/media/movies' };

    const prisma = makeDb({
      series,
      episode: null,
      movie,
      appSettings: { movieRootFolder: '/media/movies' },
      seriesFindFirst: vi.fn().mockResolvedValue(series),
      episodeFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(movie),
    });

    const torrent = {
      infoHash: 'ep-no-match',
      name: 'Breaking.Bad.S99E99.Nonexistent.mkv',
      path: '/downloads/complete/Breaking.Bad.S99E99.Nonexistent.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeMovieFile).toHaveBeenCalled();
    expect(ae.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MOVIE_IMPORTED', success: true }),
    );
  });

  it('emits IMPORT_FAILED when parser cannot match any series or movie', async () => {
    const prisma = makeDb({
      series: null,
      episode: null,
      movie: null,
      seriesFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(null),
    });

    const torrent = {
      infoHash: 'no-match',
      name: 'Some.Unknown.Show.S01E01.mkv',
      path: '/downloads/complete/Some.Unknown.Show.S01E01.mkv',
    };

    const { ae } = await fireTorrentCompleted(prisma, torrent);

    const importFailed = ae.emit.mock.calls.find(
      (call: any[]) => call[0]?.eventType === 'IMPORT_FAILED',
    );
    expect(importFailed).toBeDefined();
    expect(importFailed![0].details.reason).toContain('no match found');
  });

  it('findMovieMatch matches by year+title and imports movie via parser fallback', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: '/media/movies/The Matrix (1999)' };

    const prisma = makeDb({
      series: null,
      episode: null,
      movie,
      appSettings: { movieRootFolder: '/media/movies' },
      seriesFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(movie),
    });

    const torrent = {
      infoHash: 'movie-year',
      name: 'The.Matrix.1999.1080p.BluRay.mkv',
      path: '/downloads/complete/The.Matrix.1999.1080p.BluRay.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeMovieFile).toHaveBeenCalledWith(
      torrent.path,
      expect.objectContaining({ id: 5, title: 'The Matrix', year: 1999 }),
      { move: true },
    );
    expect(ae.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MOVIE_IMPORTED', success: true }),
    );
  });

  it('emits IMPORT_FAILED when movie found but no root folder configured', async () => {
    const movie = { id: 5, title: 'The Matrix', year: 1999, path: null };

    const prisma = makeDb({
      series: null,
      episode: null,
      movie,
      appSettings: null,
      seriesFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(movie),
    });

    const torrent = {
      infoHash: 'movie-no-root',
      name: 'The.Matrix.1999.1080p.BluRay.mkv',
      path: '/downloads/complete/The.Matrix.1999.1080p.BluRay.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeMovieFile).not.toHaveBeenCalled();
    const importFailed = ae.emit.mock.calls.find(
      (call: any[]) => call[0]?.eventType === 'IMPORT_FAILED',
    );
    expect(importFailed).toBeDefined();
    expect(importFailed![0].details.reason).toContain('movie root folder');
  });

  it('parsed as episode but series NOT found falls through to movie path', async () => {
    const movie = { id: 5, title: 'Unknown Film', year: 2024, path: '/media/movies' };

    const prisma = makeDb({
      series: null,
      episode: null,
      movie,
      appSettings: { movieRootFolder: '/media/movies' },
      seriesFindFirst: vi.fn().mockResolvedValue(null),
      episodeFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(movie),
    });

    const torrent = {
      infoHash: 'series-not-found',
      name: 'Nonexistent.Show.S01E01.1080p.mkv',
      path: '/downloads/complete/Nonexistent.Show.S01E01.1080p.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeMovieFile).toHaveBeenCalled();
    expect(ae.emit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'MOVIE_IMPORTED', success: true }),
    );
  });

  it('parsed as episode, series found but episode NOT found, movie also NOT found → IMPORT_FAILED', async () => {
    const series = { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad', path: '/media/tv' };

    const prisma = makeDb({
      series,
      episode: null,
      movie: null,
      seriesFindFirst: vi.fn().mockResolvedValue(series),
      episodeFindFirst: vi.fn().mockResolvedValue(null),
      movieFindFirst: vi.fn().mockResolvedValue(null),
    });

    const torrent = {
      infoHash: 'no-match-at-all',
      name: 'Breaking.Bad.S99E99.Nonexistent.mkv',
      path: '/downloads/complete/Breaking.Bad.S99E99.Nonexistent.mkv',
    };

    const { org, ae } = await fireTorrentCompleted(prisma, torrent);

    expect(org.organizeMovieFile).not.toHaveBeenCalled();
    const importFailed = ae.emit.mock.calls.find(
      (call: any[]) => call[0]?.eventType === 'IMPORT_FAILED',
    );
    expect(importFailed).toBeDefined();
    expect(importFailed![0].details.reason).toContain('no match found');
  });
});
