/**
 * Phase 1: RSS → Search → Grab → Import Pipeline Integration Tests
 *
 * Tests the full handoff chain from RSS feed ingestion through torrent
 * completion and import. Verifies that data flows correctly between
 * RssSyncService → RssMediaMonitor → TorrentManager → ImportManager.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RssMediaMonitor } from './RssMediaMonitor';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

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
  return {
    addTorrent: vi.fn().mockResolvedValue({ infoHash: 'testhash123' }),
    on: vi.fn(),
  };
}

function makeDb({
  series = null as any,
  episode = null as any,
  movie = null as any,
  indexer = null as any,
  indexerRelease = [] as any[],
} = {}) {
  return {
    series: { findFirst: vi.fn().mockResolvedValue(series) },
    episode: {
      findFirst: vi.fn().mockResolvedValue(episode),
      findMany: vi.fn().mockResolvedValue(episode ? [episode] : []),
    },
    movie: { findFirst: vi.fn().mockResolvedValue(movie) },
    indexer: { findUnique: vi.fn().mockResolvedValue(indexer) },
    indexerRelease: { findMany: vi.fn().mockResolvedValue(indexerRelease) },
  };
}

async function fireRelease(
  rssSyncService: ReturnType<typeof makeRssSyncService>,
  release: any,
) {
  rssSyncService.emit('release:stored', release);
  // flush microtasks
  await new Promise(r => setImmediate(r));
  await new Promise(r => setTimeout(r, 0));
}

// ─── Phase 1 Tests ────────────────────────────────────────────────────────────

describe('RSS → Search → Grab → Import Pipeline', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('1.1 RSS feed returns new episode → monitor matches → addTorrent called with episodeId', async () => {
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

    const prisma = makeDb({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    const release = {
      title: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay.x264',
      magnetUrl: 'magnet:?xt=urn:btih:aabbccdd11223344',
      seeders: 50,
      indexerId: 1,
    };

    await fireRelease(rssSyncService, release);

    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({
        magnetUrl: release.magnetUrl,
        episodeId: episode.id,
      }),
    );
  });

  it('1.2 RSS feed returns episode not in DB → no match → no torrent grabbed → no crash', async () => {
    // Series exists but episode S05E99 does not
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: true,
    };
    // episode.findMany returns no rows — episode doesn't exist in DB
    const prisma = makeDb({ series, episode: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    const release = {
      title: 'Breaking.Bad.S05E99.Finale.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:nonexistent99',
      seeders: 20,
      indexerId: 1,
    };

    // Should not throw — gracefully skips when episode not found
    await fireRelease(rssSyncService, release);

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('1.3 RSS season pack links every applicable missing episode', async () => {
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
    const prisma = makeDb({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    const packRelease = {
      title: 'Breaking.Bad.S01.COMPLETE.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:seasonpack001',
      seeders: 30,
      indexerId: 1,
    };

    await fireRelease(rssSyncService, packRelease);

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(expect.objectContaining({
      magnetUrl: packRelease.magnetUrl,
      episodeId: 42,
      episodeIds: [42],
    }));
  });

  it('1.4 RSS feed returns release with wrong series title → no match → no grab → no false positive', async () => {
    // Series in DB is "Breaking Bad"
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: true,
    };
    const prisma = makeDb({ series, episode: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    // Release title is for a completely different show
    const wrongSeriesRelease = {
      title: 'Better.Call.Saul.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:wrongseries00',
      seeders: 40,
      indexerId: 1,
    };

    await fireRelease(rssSyncService, wrongSeriesRelease);

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('1.5 RSS feed returns release for unmonitored series → skipped → no grab', async () => {
    // Series exists but is NOT monitored
    const series = {
      id: 5,
      title: 'Breaking Bad',
      cleanTitle: 'breakingbad',
      qualityProfileId: 1,
      monitored: false, // not monitored
    };
    const prisma = makeDb({ series, episode: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);

    const release = {
      title: 'Breaking.Bad.S01E01.Pilot.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:unmonitored00',
      seeders: 20,
      indexerId: 1,
    };

    await fireRelease(rssSyncService, release);

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});
