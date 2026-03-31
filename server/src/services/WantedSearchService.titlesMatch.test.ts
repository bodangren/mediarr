import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WantedSearchService } from './WantedSearchService';
import type { MediaSearchService, SearchCandidate } from './MediaSearchService';
import type { ActivityEventEmitter } from './ActivityEventEmitter';

function makeCandidate(title: string, score = 80): SearchCandidate {
  return {
    title,
    customFormatScore: score,
    size: 1_000_000_000,
    seeders: 10,
    indexerId: 1,
    guid: `guid-${title}`,
    magnetUrl: `magnet:?xt=urn:btih:${title.replace(/\s/g, '')}`,
  } as unknown as SearchCandidate;
}

function makeService(overrides: {
  series?: any;
  episode?: any;
  seriesFindUnique?: any;
} = {}) {
  const grabRelease = vi.fn().mockResolvedValue(undefined);
  const searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] as SearchCandidate[] });
  const mediaSearchService = { searchAllIndexers, grabRelease } as unknown as MediaSearchService;

  const emit = vi.fn().mockResolvedValue(undefined);
  const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

  const episode = overrides.episode ?? {
    id: 10,
    episodeNumber: 1,
    seasonNumber: 1,
    airDateUtc: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    path: null,
    season: {
      series: overrides.series ?? {
        id: 5,
        title: 'Breaking Bad',
        tvdbId: 81189,
        qualityProfileId: 1,
      },
    },
  };

  const episodeFindUnique = vi.fn().mockResolvedValue(episode);

  const seriesFindUnique = overrides.seriesFindUnique ?? vi.fn().mockResolvedValue({
    id: 5,
    title: 'Breaking Bad',
    tvdbId: 81189,
    qualityProfileId: 1,
    status: 'Continuing',
    seasons: [],
  });

  const prisma = {
    movie: { findUnique: vi.fn(), findMany: vi.fn() },
    episode: { findUnique: episodeFindUnique, findFirst: vi.fn() },
    series: { findUnique: seriesFindUnique, findMany: vi.fn() },
  } as unknown as ConstructorParameters<typeof WantedSearchService>[1];

  const service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  return { service, searchAllIndexers, grabRelease, emit, episodeFindUnique, seriesFindUnique };
}

describe('WantedSearchService — titlesMatch corner cases', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let grabRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const built = makeService({
      series: {
        id: 5,
        title: 'Breaking Bad',
        tvdbId: 81189,
        qualityProfileId: 1,
      },
    });
    service = built.service;
    searchAllIndexers = built.searchAllIndexers;
    grabRelease = built.grabRelease;
  });

  it('rejects release with Cardigann template syntax (double curly braces)', async () => {
    const templateRelease = makeCandidate('{{title}}.S01E01.1080p.BluRay.x264', 100);

    searchAllIndexers.mockResolvedValue({ releases: [templateRelease] });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('rejects release that contains series name but does not start with it', async () => {
    const embeddedRelease = makeCandidate('Documentary.About.Breaking.Bad.S01E01.1080p', 100);

    searchAllIndexers.mockResolvedValue({ releases: [embeddedRelease] });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it('accepts release that starts with article-stripped series title ("Bad" variant is not a match for "Breaking Bad")', async () => {
    const articleStripped = makeCandidate('Breaking.Bad.S01E01.1080p.BluRay', 90);

    searchAllIndexers.mockResolvedValue({ releases: [articleStripped] });

    const result = await service.autoSearchEpisode(10);

    expect(result.success).toBe(true);
    expect(grabRelease).toHaveBeenCalled();
  });

  it('matches release titled with series name without year when DB has no year', async () => {
    const built = makeService({
      series: {
        id: 5,
        title: 'The Wire',
        tvdbId: 73935,
        qualityProfileId: 1,
      },
    });
    const wireService = built.service;

    built.searchAllIndexers.mockResolvedValue({
      releases: [makeCandidate('Wire.S01E01.1080p.BluRay', 90)],
    });

    const result = await wireService.autoSearchEpisode(10);

    expect(result.success).toBe(true);
    expect(built.grabRelease).toHaveBeenCalled();
  });
});

describe('WantedSearchService — isSeasonComplete corner cases', () => {
  let service: WantedSearchService;
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let grabRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const airedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const testEpisodes = [
      { id: 1, episodeNumber: 1, airDateUtc: airedDate, path: null },
      { id: 2, episodeNumber: 2, airDateUtc: null, path: null },
      { id: 3, episodeNumber: 3, airDateUtc: futureDate, path: null },
    ];

    const episodeFindUnique = vi.fn().mockImplementation(async (args: any) => {
      const ep = testEpisodes.find(e => e.id === args.where.id);
      if (!ep) return null;
      return {
        ...ep,
        seasonNumber: 1,
        season: {
          series: {
            id: 5,
            title: 'Test Show',
            tvdbId: 12345,
            qualityProfileId: 1,
          },
        },
      };
    });

    const _grabRelease = vi.fn().mockResolvedValue(undefined);
    const _searchAllIndexers = vi.fn().mockResolvedValue({ releases: [] as SearchCandidate[] });
    const mediaSearchService = { searchAllIndexers: _searchAllIndexers, grabRelease: _grabRelease } as unknown as MediaSearchService;

    const emit = vi.fn().mockResolvedValue(undefined);
    const activityEventEmitter = { emit } as unknown as ActivityEventEmitter;

    const prisma = {
      movie: { findUnique: vi.fn(), findMany: vi.fn() },
      episode: { findUnique: episodeFindUnique, findFirst: vi.fn() },
      series: { findUnique: vi.fn().mockResolvedValue({
        id: 5,
        title: 'Test Show',
        tvdbId: 12345,
        qualityProfileId: 1,
        status: 'Continuing',
        seasons: [
          {
            seasonNumber: 1,
            monitored: true,
            episodes: testEpisodes,
          },
        ],
      }), findMany: vi.fn() },
    } as unknown as ConstructorParameters<typeof WantedSearchService>[1];

    service = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

    searchAllIndexers = _searchAllIndexers;
    grabRelease = _grabRelease;
  });

  it('falls back to individual episode search when season has null airDateUtc (not complete)', async () => {
    const airedRelease = makeCandidate('Test.Show.S01E01.1080p', 80);
    searchAllIndexers.mockResolvedValue({ releases: [airedRelease] });

    await service.autoSearchSeries(5);

    const calls = searchAllIndexers.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);

    const seasonPackCalls = calls.filter(
      (call: any[]) => call[0]?.query?.includes('S01') && !call[0]?.episode,
    );
    expect(seasonPackCalls.length).toBe(0);
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test.Show.S01E01.1080p' }),
      expect.anything(),
    );
  });

  it('searches episodes with aired and null airDateUtc, skips future episodes', async () => {
    searchAllIndexers.mockResolvedValue({ releases: [] });

    await service.autoSearchSeries(5);

    const calls = searchAllIndexers.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);

    const episodeSearchCalls = calls.filter(
      (call: any[]) => call[0]?.episode !== undefined,
    );
    expect(episodeSearchCalls.length).toBe(2);
  });
});

describe('WantedSearchService — autoSearchSeries edge cases', () => {
  it('does nothing when series has no monitored seasons', async () => {
    const built = makeService({
      seriesFindUnique: vi.fn().mockResolvedValue({
        id: 5,
        title: 'Empty Show',
        tvdbId: 99999,
        qualityProfileId: 1,
        status: 'Continuing',
        seasons: [],
      }),
    });

    await built.service.autoSearchSeries(5);

    expect(built.searchAllIndexers).not.toHaveBeenCalled();
    expect(built.grabRelease).not.toHaveBeenCalled();
  });

  it('does not crash when series has no specials season', async () => {
    const airedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const built = makeService({
      seriesFindUnique: vi.fn().mockResolvedValue({
        id: 5,
        title: 'No Specials Show',
        tvdbId: 88888,
        qualityProfileId: 1,
        status: 'Continuing',
        seasons: [
          {
            seasonNumber: 1,
            monitored: true,
            episodes: [
              { id: 1, episodeNumber: 1, airDateUtc: airedDate, path: null },
            ],
          },
        ],
      }),
    });

    built.searchAllIndexers.mockResolvedValue({ releases: [] });

    await expect(built.service.autoSearchSeries(5)).resolves.not.toThrow();
  });

  it('searches specials individually when specials season exists with missing aired episodes', async () => {
    const airedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const built = makeService({
      seriesFindUnique: vi.fn().mockResolvedValue({
        id: 5,
        title: 'Specials Show',
        tvdbId: 77777,
        qualityProfileId: 1,
        status: 'Continuing',
        seasons: [
          {
            seasonNumber: 0,
            monitored: true,
            episodes: [
              { id: 1, episodeNumber: 1, airDateUtc: airedDate, path: null },
            ],
          },
        ],
      }),
    });

    built.searchAllIndexers.mockResolvedValue({ releases: [] });

    await built.service.autoSearchSeries(5);

    expect(built.searchAllIndexers).toHaveBeenCalled();
  });
});
