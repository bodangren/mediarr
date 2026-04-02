import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeriesMonitoringService } from './SeriesMonitoringService';
import type { MonitoringType } from './SeriesMonitoringService';
import { NotFoundError, ValidationError } from '../errors/domainErrors';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEpisode(overrides: {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  monitored?: boolean;
  airDateUtc?: Date | null;
  fileVariants?: Array<{ id: number }>;
}) {
  return {
    id: overrides.id,
    seasonNumber: overrides.seasonNumber,
    episodeNumber: overrides.episodeNumber,
    monitored: overrides.monitored ?? false,
    airDateUtc: overrides.airDateUtc ?? null,
    fileVariants: overrides.fileVariants ?? [],
  };
}

function makePrisma(opts: {
  series?: any;
  episodes?: any[];
  seasons?: any[];
} = {}) {
  const seriesResult = 'series' in opts ? opts.series : { id: 1, monitored: true };
  const episodesResult = 'episodes' in opts ? (opts.episodes ?? []) : [];
  return {
    series: {
      findUnique: vi.fn().mockResolvedValue(seriesResult),
    },
    episode: {
      findMany: vi.fn().mockResolvedValue(episodesResult),
      update: vi.fn().mockImplementation(({ where, data }: any) => {
        const ep = episodesResult.find((e: any) => e.id === where.id);
        return Promise.resolve({ ...ep, ...data });
      }),
    },
    $transaction: vi.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
  };
}

function makePrismaForState(opts: {
  series?: any;
  seasons?: any[];
} = {}) {
  const seriesResult = 'series' in opts ? opts.series : { id: 1, monitored: true, seasons: [] };
  return {
    series: {
      findUnique: vi.fn().mockResolvedValue(seriesResult),
    },
  };
}

function pastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

// ── Phase 1: determineMonitoredEpisodes ───────────────────────────────────────

describe('SeriesMonitoringService — determineMonitoredEpisodes', () => {
  let service: SeriesMonitoringService;
  let svc: any;

  beforeEach(() => {
    service = new SeriesMonitoringService(makePrisma() as any);
    svc = service as any;
  });

  // --- "all" strategy ---
  describe('all strategy', () => {
    it('monitors every episode', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1 }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'all');
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it('returns empty set for empty episodes', () => {
      const result = svc.determineMonitoredEpisodes([], 'all');
      expect(result).toEqual(new Set());
    });
  });

  // --- "none" strategy ---
  describe('none strategy', () => {
    it('monitors zero episodes', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: true }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: true }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'none');
      expect(result).toEqual(new Set());
    });
  });

  // --- "firstSeason" strategy ---
  describe('firstSeason strategy', () => {
    it('monitors only season 1 episodes', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1 }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
        makeEpisode({ id: 4, seasonNumber: 3, episodeNumber: 1 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'firstSeason');
      expect(result).toEqual(new Set([1, 2]));
    });

    it('returns empty set when no season 1 episodes exist', () => {
      const episodes = [
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
        makeEpisode({ id: 4, seasonNumber: 3, episodeNumber: 1 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'firstSeason');
      expect(result).toEqual(new Set());
    });
  });

  // --- "lastSeason" strategy ---
  describe('lastSeason strategy', () => {
    it('monitors highest-season episodes', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1 }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1 }),
        makeEpisode({ id: 3, seasonNumber: 3, episodeNumber: 1 }),
        makeEpisode({ id: 4, seasonNumber: 3, episodeNumber: 2 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'lastSeason');
      expect(result).toEqual(new Set([3, 4]));
    });

    it('handles single-season series', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1 }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'lastSeason');
      expect(result).toEqual(new Set([1, 2]));
    });

    it('returns empty set for empty episodes', () => {
      const result = svc.determineMonitoredEpisodes([], 'lastSeason');
      expect(result).toEqual(new Set());
    });
  });

  // --- "latestSeason" strategy ---
  describe('latestSeason strategy with air dates', () => {
    it('picks season with most recent air date', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: pastDate(100) }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1, airDateUtc: pastDate(5) }),
        makeEpisode({ id: 3, seasonNumber: 3, episodeNumber: 1, airDateUtc: pastDate(30) }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'latestSeason');
      expect(result).toEqual(new Set([2]));
    });

    it('tie-breaks by highest season number when multiple seasons share latest air date', () => {
      const sameDate = pastDate(5);
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: sameDate }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1, airDateUtc: sameDate }),
        makeEpisode({ id: 3, seasonNumber: 3, episodeNumber: 1, airDateUtc: sameDate }),
        makeEpisode({ id: 4, seasonNumber: 3, episodeNumber: 2, airDateUtc: sameDate }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'latestSeason');
      expect(result).toEqual(new Set([3, 4]));
    });

    it('monitors all episodes in the latest season', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: pastDate(100) }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1, airDateUtc: pastDate(5) }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 2, airDateUtc: pastDate(3) }),
        makeEpisode({ id: 4, seasonNumber: 2, episodeNumber: 3, airDateUtc: pastDate(1) }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'latestSeason');
      expect(result).toEqual(new Set([2, 3, 4]));
    });
  });

  describe('latestSeason strategy without air dates', () => {
    it('falls back to highest season number when all air dates are null', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: null }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1, airDateUtc: null }),
        makeEpisode({ id: 3, seasonNumber: 3, episodeNumber: 1, airDateUtc: null }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'latestSeason');
      expect(result).toEqual(new Set([3]));
    });

    it('falls back to highest season number when some air dates are null but the latest non-null season differs from highest season', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, airDateUtc: null }),
        makeEpisode({ id: 2, seasonNumber: 2, episodeNumber: 1, airDateUtc: null }),
        makeEpisode({ id: 3, seasonNumber: 3, episodeNumber: 1, airDateUtc: pastDate(10) }),
        makeEpisode({ id: 4, seasonNumber: 4, episodeNumber: 1, airDateUtc: null }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'latestSeason');
      expect(result).toEqual(new Set([3]));
    });
  });

  // --- "pilotOnly" strategy ---
  describe('pilotOnly strategy', () => {
    it('monitors only S01E01', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1 }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'pilotOnly');
      expect(result).toEqual(new Set([1]));
    });

    it('returns empty set when pilot is missing', () => {
      const episodes = [
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2 }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1 }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'pilotOnly');
      expect(result).toEqual(new Set());
    });
  });

  // --- "monitored" strategy ---
  describe('monitored strategy', () => {
    it('preserves current monitored state', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: true }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: false }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1, monitored: true }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'monitored');
      expect(result).toEqual(new Set([1, 3]));
    });

    it('returns empty set when no episodes are monitored', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: false }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: false }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'monitored');
      expect(result).toEqual(new Set());
    });
  });

  // --- "existing" strategy ---
  describe('existing strategy', () => {
    it('monitors only episodes with file variants', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, fileVariants: [{ id: 101 }] }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, fileVariants: [] }),
        makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1, fileVariants: [{ id: 102 }, { id: 103 }] }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'existing');
      expect(result).toEqual(new Set([1, 3]));
    });

    it('returns empty set when no episodes have files', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, fileVariants: [] }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, fileVariants: [] }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'existing');
      expect(result).toEqual(new Set());
    });

    it('monitors all episodes when all have files', () => {
      const episodes = [
        makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, fileVariants: [{ id: 101 }] }),
        makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, fileVariants: [{ id: 102 }] }),
      ];
      const result = svc.determineMonitoredEpisodes(episodes, 'existing');
      expect(result).toEqual(new Set([1, 2]));
    });
  });

  // --- empty episodes for all strategies ---
  describe('empty episodes array', () => {
    const strategies: MonitoringType[] = ['all', 'none', 'firstSeason', 'lastSeason', 'latestSeason', 'pilotOnly', 'monitored', 'existing'];

    it.each(strategies)('returns empty set for "%s" strategy', (strategy) => {
      const service = new SeriesMonitoringService(makePrisma() as any);
      const result = (service as any).determineMonitoredEpisodes([], strategy);
      expect(result).toEqual(new Set());
    });
  });
});

// ── Phase 2: applyMonitoringStrategy ──────────────────────────────────────────

describe('SeriesMonitoringService — applyMonitoringStrategy', () => {
  it('throws ValidationError for invalid strategy', async () => {
    const prisma = makePrisma({ series: { id: 1 } });
    const service = new SeriesMonitoringService(prisma as any);

    await expect(
      service.applyMonitoringStrategy(1, 'invalidType' as MonitoringType),
    ).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError for non-existent series', async () => {
    const prisma = makePrisma({ series: null });
    const service = new SeriesMonitoringService(prisma as any);

    await expect(
      service.applyMonitoringStrategy(999, 'all'),
    ).rejects.toThrow(NotFoundError);
  });

  it('returns zero updates for empty episodes', async () => {
    const prisma = makePrisma({ series: { id: 1 }, episodes: [] });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.applyMonitoringStrategy(1, 'all');
    expect(result).toEqual({ updatedEpisodes: 0, totalEpisodes: 0, seriesId: 1 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates episodes from unmonitored to monitored (firstSeason)', async () => {
    const episodes = [
      makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: false }),
      makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: false }),
      makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1, monitored: false }),
    ];
    const prisma = makePrisma({ series: { id: 1 }, episodes });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.applyMonitoringStrategy(1, 'firstSeason');
    expect(result.updatedEpisodes).toBe(2);
    expect(result.totalEpisodes).toBe(3);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { monitored: true } }),
    );
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: { monitored: true } }),
    );
    expect(prisma.episode.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
  });

  it('updates episodes from monitored to unmonitored (none)', async () => {
    const episodes = [
      makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: true }),
      makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: true }),
    ];
    const prisma = makePrisma({ series: { id: 1 }, episodes });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.applyMonitoringStrategy(1, 'none');
    expect(result.updatedEpisodes).toBe(2);
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { monitored: false } }),
    );
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: { monitored: false } }),
    );
  });

  it('returns zero updates when all episodes already match strategy (no-op)', async () => {
    const episodes = [
      makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: true }),
      makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: true }),
    ];
    const prisma = makePrisma({ series: { id: 1 }, episodes });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.applyMonitoringStrategy(1, 'all');
    expect(result.updatedEpisodes).toBe(0);
    expect(result.totalEpisodes).toBe(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only sends changed episodes in transaction (partial match)', async () => {
    const episodes = [
      makeEpisode({ id: 1, seasonNumber: 1, episodeNumber: 1, monitored: true }),
      makeEpisode({ id: 2, seasonNumber: 1, episodeNumber: 2, monitored: false }),
      makeEpisode({ id: 3, seasonNumber: 2, episodeNumber: 1, monitored: false }),
    ];
    const prisma = makePrisma({ series: { id: 1 }, episodes });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.applyMonitoringStrategy(1, 'firstSeason');
    expect(result.updatedEpisodes).toBe(1);
    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: { monitored: true } }),
    );
    expect(prisma.episode.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    expect(prisma.episode.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
    expect(prisma.episode.update).toHaveBeenCalledTimes(1);
  });
});

// ── Phase 3: getSeriesMonitoringState ─────────────────────────────────────────

describe('SeriesMonitoringService — getSeriesMonitoringState', () => {
  it('throws NotFoundError for non-existent series', async () => {
    const prisma = makePrismaForState({ series: null });
    const service = new SeriesMonitoringService(prisma as any);

    await expect(
      service.getSeriesMonitoringState(999),
    ).rejects.toThrow(NotFoundError);
  });

  it('returns correct season-level aggregation', async () => {
    const series = {
      id: 1,
      monitored: true,
      seasons: [
        {
          seasonNumber: 1,
          episodes: [
            { monitored: true, fileVariants: [{ id: 101 }] },
            { monitored: false, fileVariants: [] },
          ],
        },
        {
          seasonNumber: 2,
          episodes: [
            { monitored: true, fileVariants: [] },
          ],
        },
      ],
    };
    const prisma = makePrismaForState({ series });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.getSeriesMonitoringState(1);
    expect(result).toEqual({
      seriesId: 1,
      seriesMonitored: true,
      seasons: [
        { seasonNumber: 1, totalEpisodes: 2, monitoredEpisodes: 1, episodesWithFiles: 1 },
        { seasonNumber: 2, totalEpisodes: 1, monitoredEpisodes: 1, episodesWithFiles: 0 },
      ],
    });
  });

  it('returns seriesMonitored from series record', async () => {
    const series = {
      id: 1,
      monitored: false,
      seasons: [],
    };
    const prisma = makePrismaForState({ series });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.getSeriesMonitoringState(1);
    expect(result.seriesMonitored).toBe(false);
  });

  it('handles series with no seasons (empty seasons array)', async () => {
    const series = { id: 1, monitored: true, seasons: [] };
    const prisma = makePrismaForState({ series });
    const service = new SeriesMonitoringService(prisma as any);

    const result = await service.getSeriesMonitoringState(1);
    expect(result).toEqual({
      seriesId: 1,
      seriesMonitored: true,
      seasons: [],
    });
  });
});
