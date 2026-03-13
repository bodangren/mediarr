/**
 * Corner-case tests for RssMediaMonitor.
 *
 * Key bugs targeted:
 *  1. handleTvRelease called addTorrent without episodeId — ImportManager fast-path was broken
 *     for all RSS-triggered TV grabs (torrent row had no linked episode).
 *  2. handleMovieRelease called addTorrent without movieId — same issue for movie grabs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RssMediaMonitor } from './RssMediaMonitor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRssSyncService() {
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

function makeTorrentManager() {
  return { addTorrent: vi.fn().mockResolvedValue(undefined) };
}

/** Build a prisma mock matching what RssMediaMonitor needs. */
function makePrisma({
  series = null as any,
  episode = null as any,
  movie = null as any,
  indexer = null as any,
} = {}) {
  return {
    series: { findFirst: vi.fn().mockResolvedValue(series) },
    episode: { findFirst: vi.fn().mockResolvedValue(episode) },
    movie: { findFirst: vi.fn().mockResolvedValue(movie) },
    indexer: { findUnique: vi.fn().mockResolvedValue(indexer) },
  };
}

const TV_RELEASE = {
  title: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay',
  magnetUrl: 'magnet:?xt=urn:btih:aabbccdd',
  seeders: 20,
  indexerId: 1,
};

const MOVIE_RELEASE = {
  title: 'The.Matrix.1999.1080p.BluRay',
  magnetUrl: 'magnet:?xt=urn:btih:eeff1122',
  seeders: 30,
  indexerId: 1,
};

async function fireRelease(
  rssSyncService: ReturnType<typeof makeRssSyncService>,
  release: any,
) {
  rssSyncService.emit('release:stored', release);
  // flush microtasks
  await new Promise(r => setImmediate(r));
  await new Promise(r => setTimeout(r, 0));
}

// ─── Phase 2: Movie grab must pass movieId ────────────────────────────────────

describe('RssMediaMonitor.handleMovieRelease — movieId passed to addTorrent', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
    vi.clearAllMocks();
  });

  it('passes movieId to addTorrent when a wanted movie is matched', async () => {
    const movie = {
      id: 7,
      title: 'The Matrix',
      cleanTitle: 'thematrix',
      year: 1999,
      path: null,
      monitored: true,
      status: 'released',
      minimumAvailability: 'released',
      qualityProfileId: 1,
    };

    const prisma = makePrisma({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, MOVIE_RELEASE);

    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        magnetUrl: MOVIE_RELEASE.magnetUrl,
        movieId: movie.id,
      }),
    );
  });
});

// ─── Phase 3: Corner cases ────────────────────────────────────────────────────

describe('RssMediaMonitor — corner cases', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
    vi.clearAllMocks();
  });

  it('3.1 skips a release that has no magnetUrl', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: true,
    };
    const episode = { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null };
    const prisma = makePrisma({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay',
      // magnetUrl intentionally absent
      seeders: 20,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.2 skips a TV episode that is already downloaded (path != null)', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: true,
    };
    // Episode already has a path — not wanted
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: '/media/tv/Breaking Bad/Season 01/Breaking Bad - S01E01.mkv',
    };

    const prisma = makePrisma({ series, episode: null }); // episode.findFirst returns null because path!=null filter

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, TV_RELEASE);

    // DB query uses `path: null` filter — no result means no grab
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.3 skips a movie release whose score is below the AUTO_GRAB_THRESHOLD', async () => {
    // The scoring engine computes confidence between the release title and the movie title.
    // Use a movie title completely unrelated to the release title so confidence stays near 0.
    // With 0 seeders the total score will be well below the threshold of 50.
    const movie = {
      id: 7,
      title: 'Dune Part Two',
      cleanTitle: 'duneparttwo',
      year: 2024,
      path: null,
      monitored: true,
      status: 'released',
      minimumAvailability: 'released',
      qualityProfileId: 1,
    };

    const prisma = makePrisma({ movie });

    // Release title has nothing in common with "Dune Part Two" — confidence will be very low.
    const lowScoreRelease = {
      title: 'Total.Recall.1990.480p.WebRip',
      magnetUrl: 'magnet:?xt=urn:btih:lowscore00',
      seeders: 0,
    };

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, lowScoreRelease);

    // Score will be below threshold (low confidence + 0 seeders) — should not grab
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.4 skips a TV release when the series is not in the monitored library', async () => {
    // prisma returns null for series.findFirst — series not monitored or not found
    const prisma = makePrisma({ series: null, episode: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, TV_RELEASE);

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});

// ─── Phase 1: TV grab must pass episodeId ─────────────────────────────────────

describe('RssMediaMonitor.handleTvRelease — episodeId passed to addTorrent', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
    vi.clearAllMocks();
  });

  it('passes episodeId to addTorrent when a wanted TV episode is matched', async () => {
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: true,
    };
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      monitored: true,
      path: null,
    };

    const prisma = makePrisma({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    await fireRelease(rssSyncService, TV_RELEASE);

    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        magnetUrl: TV_RELEASE.magnetUrl,
        episodeId: episode.id,
      }),
    );
  });
});
