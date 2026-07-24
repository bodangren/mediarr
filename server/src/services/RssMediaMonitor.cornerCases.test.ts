import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedParse = vi.hoisted(() => vi.fn());

vi.mock('./ReleaseParser', () => ({
  releaseParser: { parse: mockedParse },
}));

import { RssMediaMonitor } from './RssMediaMonitor';

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

function makeDb({
  series = null as any,
  episode = null as any,
  episodes = undefined as any[] | undefined,
  movie = null as any,
  indexer = null as any,
} = {}) {
  return {
    series: { findFirst: vi.fn().mockResolvedValue(series) },
    episode: {
      findFirst: vi.fn().mockResolvedValue(episode),
      findMany: vi.fn().mockResolvedValue(episodes ?? (episode ? [episode] : [])),
    },
    movie: { findFirst: vi.fn().mockResolvedValue(movie) },
    indexer: { findUnique: vi.fn().mockResolvedValue(indexer) },
  };
}

async function fireRelease(
  rssSyncService: ReturnType<typeof makeRssSyncService>,
  release: any,
) {
  rssSyncService.emit('release:stored', release);
  await new Promise(r => setImmediate(r));
  await new Promise(r => setTimeout(r, 0));
}

// ============================================================================
// Phase 1 — TV Matching Corner Cases
// ============================================================================

describe('RssMediaMonitor — TV matching corner cases', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
  });

  it('1.1 season pack links every monitored missing episode in the season', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'season_pack',
      seasonNumber: 1, episodeNumbers: [], year: null, quality: null,
    });

    const episodes = [
      { id: 41, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null },
      { id: 42, seasonNumber: 1, episodeNumber: 5, monitored: true, path: null },
    ];
    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const prisma = makeDb({ series, episodes });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01.COMPLETE.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:seasonpack',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ seasonNumber: 1 }),
      }),
    );
    const callArgs = prisma.episode.findMany.mock.calls[0]![0] as any;
    expect(callArgs.where).not.toHaveProperty('episodeNumber');
    expect(torrentManager.addTorrent).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 41, episodeIds: [41, 42] }),
    );
  });

  it('1.2 multi-episode release grabs when any covered episode is missing and links all missing matches', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1, 2], year: null, quality: null,
    });

    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const episode2 = { id: 42, seasonNumber: 1, episodeNumber: 2, monitored: true, path: null };
    const prisma = makeDb({ series, episodes: [episode2] });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01E02.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:multi',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          seasonNumber: 1,
          episodeNumber: { in: [1, 2] },
        }),
      }),
    );
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 42, episodeIds: [42] }),
    );
  });

  it('1.3 series matched but episode not found — no grab', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [99], year: null, quality: null,
    });

    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const prisma = makeDb({ series, episode: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E99.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bogus',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.series.findFirst).toHaveBeenCalledOnce();
    expect(prisma.episode.findMany).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('1.4 TV release score below AUTO_GRAB_THRESHOLD — returns true, blocks movie path', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const episode = { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null };
    const prisma = makeDb({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Some.Random.Show.S01E01.480p.WebRip',
      magnetUrl: 'magnet:?xt=urn:btih:lowtv',
      seeders: 0,
      indexerId: 1,
    });

    expect(prisma.series.findFirst).toHaveBeenCalled();
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('1.5 release parser returns null — falls through to movie path', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'The Matrix', cleanTitle: 'thematrix', year: 1999,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'The.Matrix.1999.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:matrix',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.series.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.findFirst).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 7 }),
    );
  });

  it('1.6 release parser returns parsed result with empty title — falls through to movie path', async () => {
    mockedParse.mockResolvedValue({
      title: '', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const movie = {
      id: 7, title: 'The Matrix', cleanTitle: 'thematrix', year: 1999,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'The.Matrix.1999.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:matrix',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.series.findFirst).not.toHaveBeenCalled();
    expect(prisma.movie.findFirst).toHaveBeenCalledOnce();
  });

  it('1.7 series is not monitored — falls through to movie path', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const prisma = makeDb({ series: null, movie: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.2008.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.series.findFirst).toHaveBeenCalledOnce();
    expect(prisma.movie.findFirst).toHaveBeenCalledOnce();
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Phase 2 — Movie Matching & Availability Corner Cases
// ============================================================================

describe('RssMediaMonitor — movie matching & availability corner cases', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
  });

  it('2.1 movie release without year in title — parseMovieTitle returns null, no grab', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'Arrival', cleanTitle: 'arrival', year: 2016,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Arrival.1080p.BluRay.REMUX',
      magnetUrl: 'magnet:?xt=urn:btih:noyear',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('2.2 movie release with year mid-title (e.g. "2012.2009") — year extracted correctly', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: '2012', cleanTitle: '2012', year: 2009,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: '2012.2009.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:2012movie',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.movie.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ monitored: true, path: null }),
      }),
    );
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 7 }),
    );
  });

  it('2.3 movie with minimumAvailability "announced" — always grabs regardless of actual availability', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'Dune Part Three', cleanTitle: 'dunepartthree', year: 2026,
      path: null, monitored: true, status: 'announced', minimumAvailability: 'announced', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Dune.Part.Three.2026.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:dune3',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 7 }),
    );
  });

  it('2.4 movie with minimumAvailability "in_cinemas" and availability "announced" — skips', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'Dune Part Three', cleanTitle: 'dunepartthree', year: 2026,
      path: null, monitored: true, status: 'announced', minimumAvailability: 'in_cinemas', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Dune.Part.Three.2026.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:dune3',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('2.5 movie with minimumAvailability "in_cinemas" and availability "streaming" — grabs', async () => {
    mockedParse.mockResolvedValue(null);

    const metadataProvider = {
      getMovieAvailability: vi.fn().mockReturnValue('streaming'),
    };

    const movie = {
      id: 7, title: 'Dune Part Two', cleanTitle: 'duneparttwo', year: 2024,
      path: null, monitored: true, status: 'released', minimumAvailability: 'in_cinemas', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma, metadataProvider);
    await fireRelease(rssSyncService, {
      title: 'Dune.Part.Two.2024.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:dune2',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 7 }),
    );
  });

  it('2.6 movie with null minimumAvailability — defaults to "released"', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'Oppenheimer', cleanTitle: 'oppenheimer', year: 2023,
      path: null, monitored: true, status: 'announced', minimumAvailability: null, qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Oppenheimer.2023.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:opp',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('2.7 movie with metadataProvider.getMovieAvailability path', async () => {
    mockedParse.mockResolvedValue(null);

    const metadataProvider = {
      getMovieAvailability: vi.fn().mockReturnValue('released'),
    };

    const movie = {
      id: 7, title: 'The Batman', cleanTitle: 'thebatman', year: 2022,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma, metadataProvider);
    await fireRelease(rssSyncService, {
      title: 'The.Batman.2022.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:batman',
      seeders: 50,
      indexerId: 1,
    });

    expect(metadataProvider.getMovieAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'released' }),
    );
    expect(torrentManager.addTorrent).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: 7 }),
    );
  });

  it('2.8 movie already has path (not wanted) — skips', async () => {
    mockedParse.mockResolvedValue(null);

    const prisma = makeDb({ movie: null });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'The.Matrix.1999.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:matrix',
      seeders: 50,
      indexerId: 1,
    });

    expect(prisma.movie.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ path: null }),
      }),
    );
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('2.9 movie score below AUTO_GRAB_THRESHOLD — no grab', async () => {
    mockedParse.mockResolvedValue(null);

    const movie = {
      id: 7, title: 'The Matrix', cleanTitle: 'thematrix', year: 1999,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Some.Unrelated.2005.480p.WebRip',
      magnetUrl: 'magnet:?xt=urn:btih:unrelated',
      seeders: 0,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Phase 3 — Scoring, Indexer Priority & Error Handling
// ============================================================================

describe('RssMediaMonitor — scoring, indexer priority & error handling', () => {
  let rssSyncService: ReturnType<typeof makeRssSyncService>;
  let torrentManager: ReturnType<typeof makeTorrentManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    rssSyncService = makeRssSyncService();
    torrentManager = makeTorrentManager();
  });

  it('3.1 customFormatRepository throws — getFormatScores returns [] gracefully', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const customFormatRepository = {
      findByQualityProfileId: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    };
    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const episode = { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null };
    const prisma = makeDb({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma, null, customFormatRepository);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
      seeders: 50,
      indexerId: 1,
    });

    expect(customFormatRepository.findByQualityProfileId).toHaveBeenCalledWith(1);
    expect(torrentManager.addTorrent).toHaveBeenCalled();
  });

  it('3.2 indexer lookup throws — getIndexerPriority returns 0 gracefully', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const prisma = makeDb({
      series: { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true },
      episode: { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null },
      indexer: null,
    });
    prisma.indexer.findUnique.mockRejectedValue(new Error('DB error'));

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
      seeders: 50,
      indexerId: 999,
    });

    expect(prisma.indexer.findUnique).toHaveBeenCalledWith({ where: { id: 999 } });
    expect(torrentManager.addTorrent).toHaveBeenCalled();
  });

  it('3.3 prisma.series.findFirst throws — no grab', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const prisma = makeDb({});
    prisma.series.findFirst.mockRejectedValue(new Error('DB timeout'));

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.4 prisma.episode.findMany throws — no grab', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const prisma = makeDb({
      series: { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true },
    });
    prisma.episode.findMany.mockRejectedValue(new Error('DB timeout'));

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.5 prisma.movie.findFirst throws — no grab', async () => {
    mockedParse.mockResolvedValue(null);

    const prisma = makeDb({});
    prisma.movie.findFirst.mockRejectedValue(new Error('DB timeout'));

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'The.Matrix.1999.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:matrix',
      seeders: 50,
      indexerId: 1,
    });

    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });

  it('3.6 release with no seeders and no indexerId — score still computed, grab if above threshold', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const episode = { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null };
    const prisma = makeDb({ series, episode });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Breaking.Bad.S01E01.1080p.BluRay',
      magnetUrl: 'magnet:?xt=urn:btih:bb',
    });

    expect(prisma.indexer.findUnique).not.toHaveBeenCalled();
    expect(torrentManager.addTorrent).toHaveBeenCalled();
  });

  it('3.7 TV release with low score does NOT fall through to movie path', async () => {
    mockedParse.mockResolvedValue({
      title: 'Breaking Bad', type: 'series', matchType: 'episode',
      seasonNumber: 1, episodeNumbers: [1], year: null, quality: null,
    });

    const series = { id: 5, title: 'Breaking Bad', cleanTitle: 'breakingbad', qualityProfileId: 1, monitored: true };
    const episode = { id: 42, seasonNumber: 1, episodeNumber: 1, monitored: true, path: null };
    const movie = {
      id: 7, title: 'Breaking Bad', cleanTitle: 'breakingbad', year: 2008,
      path: null, monitored: true, status: 'released', minimumAvailability: 'released', qualityProfileId: 1,
    };
    const prisma = makeDb({ series, episode, movie });

    new RssMediaMonitor(rssSyncService, torrentManager, prisma);
    await fireRelease(rssSyncService, {
      title: 'Some.Garbage.S01E01.CAM',
      magnetUrl: 'magnet:?xt=urn:btih:garbage',
      seeders: 0,
    });

    expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    expect(torrentManager.addTorrent).not.toHaveBeenCalled();
  });
});
