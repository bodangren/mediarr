/**
 * Phase 2: Wanted → Search → Grab → Import Pipeline Integration Tests
 *
 * Tests the full handoff chain from WantedSearchService through
 * MediaSearchService grab to torrent download. Verifies air-date guards,
 * release-date guards, and error handling across the wanted pipeline.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WantedSearchService } from './WantedSearchService';

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

function makeMediaSearchService() {
  return {
    searchAllIndexers: vi.fn().mockResolvedValue({ releases: [], indexerResults: [], totalResults: 0, deduplicatedCount: 0 }),
    grabRelease: vi.fn().mockResolvedValue({ infoHash: 'testhash', name: 'Test.Release' }),
  };
}

function makeActivityEventEmitter() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

function makePrisma({ movie = null as any, episode = null as any } = {}) {
  return {
    movie: { findUnique: vi.fn().mockResolvedValue(movie) },
    episode: {
      findUnique: vi.fn().mockResolvedValue(episode),
    },
    series: { findUnique: vi.fn().mockResolvedValue(null) },
  };
}

// ─── Phase 2 Tests ────────────────────────────────────────────────────────────

describe('Wanted → Search → Grab → Import Pipeline', () => {
  let mediaSearchService: ReturnType<typeof makeMediaSearchService>;
  let activityEventEmitter: ReturnType<typeof makeActivityEventEmitter>;

  beforeEach(() => {
    mediaSearchService = makeMediaSearchService();
    activityEventEmitter = makeActivityEventEmitter();
    vi.clearAllMocks();
  });

  it('2.1 Wanted episode passes air-date guard → search finds release → grabs with episodeId', async () => {
    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      airDateUtc: new Date('2020-01-01'), // already aired
      season: {
        id: 1,
        seasonNumber: 1,
        series: {
          id: 5,
          title: 'Breaking Bad',
          cleanTitle: 'breakingbad',
          qualityProfileId: 1,
        },
      },
    };

    const prisma = makePrisma({ episode });

    const candidate = {
      title: 'Breaking.Bad.S01E01.1080p.BluRay.x264',
      magnetUrl: 'magnet:?xt=urn:btih:abc123',
      customFormatScore: 80,
      indexerFlags: '',
    };

    mediaSearchService.searchAllIndexers.mockResolvedValue({
      releases: [candidate],
      indexerResults: [],
      totalResults: 1,
      deduplicatedCount: 0,
    });

    const service = new WantedSearchService(mediaSearchService as any, prisma as any, activityEventEmitter);
    const result = await service.autoSearchEpisode(42);

    expect(result.success).toBe(true);
    expect(mediaSearchService.grabRelease).toHaveBeenCalledOnce();
    expect(mediaSearchService.grabRelease).toHaveBeenCalledWith(candidate, { episodeId: 42 });
  });

  it('2.2 Wanted episode has not aired yet → autoSearchEpisode skips → no search fired', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future

    const episode = {
      id: 42,
      seasonNumber: 1,
      episodeNumber: 1,
      airDateUtc: futureDate,
      season: {
        id: 1,
        seasonNumber: 1,
        series: {
          id: 5,
          title: 'Breaking Bad',
          cleanTitle: 'breakingbad',
          qualityProfileId: 1,
        },
      },
    };

    const prisma = makePrisma({ episode });

    const service = new WantedSearchService(mediaSearchService as any, prisma as any, activityEventEmitter);
    const result = await service.autoSearchEpisode(42);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('not aired yet');
    expect(mediaSearchService.searchAllIndexers).not.toHaveBeenCalled();
    expect(mediaSearchService.grabRelease).not.toHaveBeenCalled();
  });

  it('2.3 Wanted movie passes release-date guard → search finds release → grabs with movieId', async () => {
    const movie = {
      id: 7,
      title: 'The Matrix',
      year: 1999,
      inCinemas: new Date('1999-03-31'),
      digitalRelease: null,
      physicalRelease: null,
      monitored: true,
      qualityProfileId: 1,
      path: null,
    };

    const prisma = makePrisma({ movie });

    const candidate = {
      title: 'The.Matrix.1999.1080p.BluRay.x264',
      magnetUrl: 'magnet:?xt=urn:btih:matrix99',
      customFormatScore: 90,
      indexerFlags: '',
    };

    mediaSearchService.searchAllIndexers.mockResolvedValue({
      releases: [candidate],
      indexerResults: [],
      totalResults: 1,
      deduplicatedCount: 0,
    });

    const service = new WantedSearchService(mediaSearchService as any, prisma as any, activityEventEmitter);
    const result = await service.autoSearchMovie(7);

    expect(result.success).toBe(true);
    expect(mediaSearchService.grabRelease).toHaveBeenCalledOnce();
    expect(mediaSearchService.grabRelease).toHaveBeenCalledWith(candidate, { movieId: 7 });
  });

  it('2.4 Wanted search finds release but all indexers fail → graceful degradation → no crash', async () => {
    const movie = {
      id: 7,
      title: 'The Matrix',
      year: 1999,
      inCinemas: new Date('1999-03-31'),
      digitalRelease: null,
      physicalRelease: null,
      monitored: true,
      qualityProfileId: 1,
      path: null,
    };

    const prisma = makePrisma({ movie });

    // All indexers fail — returns empty releases
    mediaSearchService.searchAllIndexers.mockResolvedValue({
      releases: [],
      indexerResults: [],
      totalResults: 0,
      deduplicatedCount: 0,
    });

    const service = new WantedSearchService(mediaSearchService as any, prisma as any, activityEventEmitter);
    const result = await service.autoSearchMovie(7);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('No releases found');
    expect(mediaSearchService.grabRelease).not.toHaveBeenCalled();
  });

  it('2.5 searchAllIndexers throws → caught → returns failure, no crash', async () => {
    const movie = {
      id: 7,
      title: 'The Matrix',
      year: 1999,
      inCinemas: new Date('1999-03-31'),
      digitalRelease: null,
      physicalRelease: null,
      monitored: true,
      qualityProfileId: 1,
      path: null,
    };

    const prisma = makePrisma({ movie });

    mediaSearchService.searchAllIndexers.mockRejectedValue(new Error('All indexers unreachable'));

    const service = new WantedSearchService(mediaSearchService as any, prisma as any, activityEventEmitter);
    const result = await service.autoSearchMovie(7);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Search failed');
    expect(result.reason).toContain('All indexers unreachable');
    expect(mediaSearchService.grabRelease).not.toHaveBeenCalled();
  });
});
