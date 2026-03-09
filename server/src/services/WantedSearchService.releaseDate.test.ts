/**
 * Unit tests for the release-date guard logic in WantedSearchService.
 *
 * These tests verify that automated searches are skipped when the target
 * content has not yet been publicly released / aired.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WantedSearchService } from './WantedSearchService';
import type { MediaSearchService } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * ONE_DAY_MS);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * ONE_DAY_MS);
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] });
  const grabRelease = vi.fn().mockResolvedValue(undefined);
  const mediaSearchService = { searchAllIndexers, grabRelease } as unknown as MediaSearchService;

  const emit = vi.fn().mockResolvedValue(undefined);
  const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

  const prisma = {
    movie: { findUnique: vi.fn() },
    episode: { findUnique: vi.fn() },
    series: { findUnique: vi.fn() },
    ...prismaOverrides,
  } as unknown as Parameters<typeof WantedSearchService.prototype.constructor>[1];

  const service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  return { service, searchAllIndexers, grabRelease, emit, prisma };
}

function baseMovie(overrides: Partial<{
  digitalRelease: Date | null;
  physicalRelease: Date | null;
  inCinemas: Date | null;
}> = {}) {
  return {
    id: 1,
    title: 'Test Movie',
    year: 2025,
    qualityProfileId: 1,
    monitored: true,
    path: null,
    digitalRelease: null,
    physicalRelease: null,
    inCinemas: null,
    ...overrides,
  };
}

function baseEpisodeResult(airDateUtc: Date | null) {
  return {
    id: 10,
    episodeNumber: 1,
    seasonNumber: 1,
    airDateUtc,
    path: null,
    season: {
      series: {
        id: 5,
        title: 'Test Show',
        tvdbId: 999,
        qualityProfileId: 1,
      },
    },
  };
}

// ─── isReleasedYet via autoSearchMovie ────────────────────────────────────────

describe('WantedSearchService — autoSearchMovie release-date guard', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let emit: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const built = makeService();
    service = built.service;
    searchAllIndexers = built.searchAllIndexers;
    emit = built.emit;
    findUnique = (built.prisma as any).movie.findUnique;
  });

  it('allows search when all release dates are null (unknown release)', async () => {
    findUnique.mockResolvedValue(baseMovie());
    await service.autoSearchMovie(1);
    expect(searchAllIndexers).toHaveBeenCalled();
  });

  it('allows search when digitalRelease is more than 1 day in the past', async () => {
    findUnique.mockResolvedValue(baseMovie({ digitalRelease: daysAgo(2) }));
    await service.autoSearchMovie(1);
    expect(searchAllIndexers).toHaveBeenCalled();
  });

  it('skips search when digitalRelease is in the future', async () => {
    findUnique.mockResolvedValue(baseMovie({ digitalRelease: daysFromNow(3) }));
    const result = await service.autoSearchMovie(1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Movie has not been released yet');
    expect(searchAllIndexers).not.toHaveBeenCalled();
  });

  it('skips search when physicalRelease is in the future (no digitalRelease)', async () => {
    findUnique.mockResolvedValue(baseMovie({ physicalRelease: daysFromNow(1) }));
    const result = await service.autoSearchMovie(1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Movie has not been released yet');
    expect(searchAllIndexers).not.toHaveBeenCalled();
  });

  it('allows search when inCinemas is past even if physicalRelease is future (earliest date wins)', async () => {
    // inCinemas was 2 days ago — the earliest known date is in the past, so allow
    findUnique.mockResolvedValue(
      baseMovie({ inCinemas: daysAgo(2), physicalRelease: daysFromNow(10) }),
    );
    await service.autoSearchMovie(1);
    expect(searchAllIndexers).toHaveBeenCalled();
  });

  it('skips search when all provided dates are in the future', async () => {
    findUnique.mockResolvedValue(
      baseMovie({
        inCinemas: daysFromNow(5),
        physicalRelease: daysFromNow(30),
        digitalRelease: daysFromNow(35),
      }),
    );
    const result = await service.autoSearchMovie(1);
    expect(result.success).toBe(false);
    expect(searchAllIndexers).not.toHaveBeenCalled();
  });

  it('emits a skip event when the search is skipped due to release date', async () => {
    findUnique.mockResolvedValue(baseMovie({ digitalRelease: daysFromNow(5) }));
    await service.autoSearchMovie(1);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        sourceModule: 'wanted-search-service',
      }),
    );
  });
});

// ─── isReleasedYet via autoSearchEpisode ──────────────────────────────────────

describe('WantedSearchService — autoSearchEpisode air-date guard', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const built = makeService();
    service = built.service;
    searchAllIndexers = built.searchAllIndexers;
    findUnique = (built.prisma as any).episode.findUnique;
  });

  it('allows search when airDateUtc is null (no air date set)', async () => {
    findUnique.mockResolvedValue(baseEpisodeResult(null));
    await service.autoSearchEpisode(10);
    expect(searchAllIndexers).toHaveBeenCalled();
  });

  it('allows search when airDateUtc is more than 1 day in the past', async () => {
    findUnique.mockResolvedValue(baseEpisodeResult(daysAgo(2)));
    await service.autoSearchEpisode(10);
    expect(searchAllIndexers).toHaveBeenCalled();
  });

  it('skips search when airDateUtc is in the future', async () => {
    findUnique.mockResolvedValue(baseEpisodeResult(daysFromNow(3)));
    const result = await service.autoSearchEpisode(10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Episode has not aired yet');
    expect(searchAllIndexers).not.toHaveBeenCalled();
  });

  it('skips search when airDateUtc is less than 1 day ago (within grace period)', async () => {
    // 12 hours ago — within the 24-hour grace period
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    findUnique.mockResolvedValue(baseEpisodeResult(twelveHoursAgo));
    const result = await service.autoSearchEpisode(10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Episode has not aired yet');
    expect(searchAllIndexers).not.toHaveBeenCalled();
  });
});
