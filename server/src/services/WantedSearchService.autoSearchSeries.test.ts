import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WantedSearchService } from './WantedSearchService';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pastDate(daysAgo = 30): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

function futureDate(daysAhead = 30): Date {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
}

function makeEpisode(id: number, opts: { path?: string | null; airDateUtc?: Date | null } = {}) {
  return {
    id,
    episodeNumber: id,
    airDateUtc: 'airDateUtc' in opts ? opts.airDateUtc : pastDate(),
    path: 'path' in opts ? opts.path : null,
  };
}

function makeSeason(seasonNumber: number, episodes: ReturnType<typeof makeEpisode>[], monitored = true) {
  return { seasonNumber, monitored, episodes };
}

function makeSeries(opts: {
  id?: number;
  title?: string;
  status?: string;
  tvdbId?: number | null;
  qualityProfileId?: number;
  seasons?: ReturnType<typeof makeSeason>[];
}) {
  return {
    id: opts.id ?? 1,
    title: opts.title ?? 'Test Series',
    status: opts.status ?? 'Continuing',
    tvdbId: opts.tvdbId ?? null,
    qualityProfileId: opts.qualityProfileId ?? 1,
    seasons: opts.seasons ?? [],
  };
}

function makeCandidate(title: string, score = 100) {
  return {
    indexer: 'TestIndexer',
    indexerId: 1,
    title,
    guid: `guid-${title}`,
    size: 5_000_000_000,
    seeders: 50,
    magnetUrl: `magnet:?xt=urn:btih:${'a'.repeat(40)}`,
    customFormatScore: score,
  };
}

// ── Fixture builder ──────────────────────────────────────────────────────────

function buildService() {
  const prisma = {
    series: { findUnique: vi.fn() },
    episode: { findUnique: vi.fn() },
    movie: { findUnique: vi.fn() },
  };
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] });
  const grabRelease = vi.fn().mockResolvedValue({ infoHash: 'a'.repeat(40), name: 'grabbed' });
  const mediaSearchService = { searchAllIndexers, grabRelease } as any;
  const activityEventEmitter = { emit: vi.fn().mockResolvedValue(undefined) } as any;

  const service = new WantedSearchService(mediaSearchService, prisma as any, activityEventEmitter);
  const svc = service as any;

  return { service, svc, prisma, searchAllIndexers, grabRelease, activityEventEmitter };
}

// ── isSeasonComplete ─────────────────────────────────────────────────────────

describe('WantedSearchService — isSeasonComplete', () => {
  let svc: any;

  beforeEach(() => {
    ({ svc } = buildService());
  });

  it('returns false for an empty episode list', () => {
    expect(svc.isSeasonComplete([])).toBe(false);
  });

  it('returns true when every episode has a past air date', () => {
    const episodes = [{ airDateUtc: pastDate(10) }, { airDateUtc: pastDate(3) }];
    expect(svc.isSeasonComplete(episodes)).toBe(true);
  });

  it('returns false when any episode has airDateUtc = null', () => {
    const episodes = [{ airDateUtc: pastDate(10) }, { airDateUtc: null }];
    expect(svc.isSeasonComplete(episodes)).toBe(false);
  });

  it('returns false when any episode has a future air date', () => {
    const episodes = [{ airDateUtc: pastDate(10) }, { airDateUtc: futureDate(3) }];
    expect(svc.isSeasonComplete(episodes)).toBe(false);
  });
});

// ── autoSearchSeries — no missing episodes ────────────────────────────────────

describe('WantedSearchService — autoSearchSeries with no missing regular episodes', () => {
  it('does not search when all monitored episodes already have paths', async () => {
    const { service, prisma, searchAllIndexers } = buildService();
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        seasons: [
          makeSeason(1, [
            makeEpisode(1, { path: '/tv/Show/S01E01.mkv' }),
            makeEpisode(2, { path: '/tv/Show/S01E02.mkv' }),
          ]),
        ],
      }),
    );

    await service.autoSearchSeries(1);

    expect(searchAllIndexers).not.toHaveBeenCalled();
  });

  it('returns early when series is not found', async () => {
    const { service, prisma, searchAllIndexers } = buildService();
    prisma.series.findUnique.mockResolvedValue(null);

    await service.autoSearchSeries(99);

    expect(searchAllIndexers).not.toHaveBeenCalled();
  });
});

// ── autoSearchSeries — ended series pack ─────────────────────────────────────

describe('WantedSearchService — autoSearchSeries ended series pack', () => {
  it('grabs series pack for an ended series with missing episodes', async () => {
    const { service, prisma, searchAllIndexers, grabRelease } = buildService();
    // Title must match the candidate via titlesMatch() — "Breaking Bad" starts "Breaking Bad…"
    const seriesPack = makeCandidate('Breaking.Bad.Complete.Series.1080p', 200);
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Breaking Bad',
        status: 'Ended',
        seasons: [
          makeSeason(1, [makeEpisode(1, { path: null })]),
        ],
      }),
    );
    searchAllIndexers.mockResolvedValue({ releases: [seriesPack] });

    await service.autoSearchSeries(1);

    expect(grabRelease).toHaveBeenCalledWith(seriesPack);
  });

  it('BUG: ended series — specials are still searched after series pack is grabbed', async () => {
    // Reproduces the bug: autoSearchSeries returns early after grabbing a series pack,
    // skipping the specials (season 0) search block at the bottom of the function.
    const { service, prisma, searchAllIndexers, grabRelease } = buildService();

    const seriesPack = makeCandidate('Breaking.Bad.Complete.Series.1080p', 200);
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Breaking Bad',
        status: 'Ended',
        seasons: [
          makeSeason(1, [makeEpisode(1, { path: null })]),      // missing regular episode
          makeSeason(0, [makeEpisode(99, { path: null })]),     // missing special
        ],
      }),
    );
    searchAllIndexers.mockResolvedValue({ releases: [seriesPack] });

    // Spy on autoSearchEpisode to detect whether specials are searched
    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: true });

    await service.autoSearchSeries(1);

    // Series pack must be grabbed
    expect(grabRelease).toHaveBeenCalledWith(seriesPack);

    // Specials episode search must ALSO run — this assertion FAILS before the fix
    expect(autoSearchEpisodeSpy).toHaveBeenCalledWith(99);
  });

  it('falls through to per-season logic when no series pack is found for an ended series', async () => {
    const { service, prisma } = buildService();
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Breaking Bad',
        status: 'Ended',
        seasons: [
          makeSeason(1, [makeEpisode(1, { path: null, airDateUtc: pastDate(30) })]),
        ],
      }),
    );

    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: false, reason: 'no candidates' });

    // No series pack found (empty releases), no season pack found
    await service.autoSearchSeries(1);

    // Individual episode must be searched
    expect(autoSearchEpisodeSpy).toHaveBeenCalledWith(1);
  });
});

// ── autoSearchSeries — continuing series (per-season logic) ───────────────────

describe('WantedSearchService — autoSearchSeries continuing series', () => {
  it('does not attempt a series pack for a continuing series', async () => {
    const { service, prisma, searchAllIndexers } = buildService();
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Breaking Bad',
        status: 'Continuing',
        seasons: [
          makeSeason(1, [makeEpisode(1, { path: null, airDateUtc: pastDate(7) })]),
        ],
      }),
    );

    // Spy on autoSearchEpisode to intercept the call
    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: false, reason: 'no candidates' });

    await service.autoSearchSeries(1);

    // Season is not complete (only 1 episode, which aired) — still tries season pack? No.
    // Wait: isSeasonComplete([ep1 with past airDate]) → true (1 episode, all aired)
    // So it tries a season pack via searchAllIndexers, gets nothing, then falls to individual
    expect(autoSearchEpisodeSpy).toHaveBeenCalledWith(1);
  });

  it('skips individual episode search for episodes that have not aired yet', async () => {
    const { service, prisma } = buildService();
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        status: 'Continuing',
        seasons: [
          makeSeason(1, [makeEpisode(1, { path: null, airDateUtc: futureDate(3) })]),
        ],
      }),
    );

    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: false, reason: 'not aired' });

    await service.autoSearchSeries(1);

    // Episode hasn't aired — must NOT be searched individually
    expect(autoSearchEpisodeSpy).not.toHaveBeenCalled();
  });
});

// ── autoSearchSeries — season pack logic ──────────────────────────────────────

describe('WantedSearchService — autoSearchSeries season pack', () => {
  it('grabs a season pack when all episodes in a season have aired', async () => {
    const { service, prisma, searchAllIndexers, grabRelease } = buildService();
    // Title "Show" must match candidate "Show.S01.Complete.1080p"
    const seasonPack = makeCandidate('Show.S01.Complete.1080p', 150);
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Show',
        status: 'Continuing',
        seasons: [
          makeSeason(1, [
            makeEpisode(1, { path: null, airDateUtc: pastDate(14) }),
            makeEpisode(2, { path: null, airDateUtc: pastDate(7) }),
          ]),
        ],
      }),
    );
    searchAllIndexers.mockResolvedValue({ releases: [seasonPack] });

    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: true });

    await service.autoSearchSeries(1);

    expect(grabRelease).toHaveBeenCalledWith(seasonPack);
    // After a season pack is grabbed, individual episodes in that season should be skipped
    expect(autoSearchEpisodeSpy).not.toHaveBeenCalled();
  });

  it('falls back to individual episodes when no season pack is found', async () => {
    const { service, prisma, grabRelease } = buildService();
    prisma.series.findUnique.mockResolvedValue(
      makeSeries({
        title: 'Show',
        status: 'Continuing',
        seasons: [
          makeSeason(1, [
            makeEpisode(1, { path: null, airDateUtc: pastDate(14) }),
            makeEpisode(2, { path: null, airDateUtc: pastDate(7) }),
          ]),
        ],
      }),
    );

    const autoSearchEpisodeSpy = vi
      .spyOn(service, 'autoSearchEpisode')
      .mockResolvedValue({ success: false, reason: 'no candidates' });

    await service.autoSearchSeries(1);

    // Both missing episodes must be searched individually
    expect(autoSearchEpisodeSpy).toHaveBeenCalledWith(1);
    expect(autoSearchEpisodeSpy).toHaveBeenCalledWith(2);
    expect(grabRelease).not.toHaveBeenCalled();
  });
});
