import { describe, expect, it, vi } from 'vitest';
import { createPrismaJellyfinCatalog } from './prismaCatalog';

const PLAYABLE_VARIANT_WHERE = {
  fileVariants: { some: { path: { not: '' } } },
};
const PLAYABLE_SERIES_WHERE = {
  episodes: { some: PLAYABLE_VARIANT_WHERE },
};

describe('createPrismaJellyfinCatalog playback availability', () => {
  it('uses the same non-empty variant-path eligibility rule for leaves and containers', async () => {
    const prisma = {
      movie: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      series: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      season: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      episode: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const catalog = createPrismaJellyfinCatalog(prisma);

    await Promise.all([
      catalog.listMovies(),
      catalog.listSeries(),
      catalog.listSeasonsBySeriesId(7),
      catalog.listEpisodesBySeriesId(7),
      catalog.listEpisodesBySeasonId(11),
      catalog.listEpisodes?.(),
      catalog.findMovieById(5),
      catalog.findSeriesById(7),
      catalog.findSeasonById(11),
      catalog.findEpisodeById(42),
    ]);

    expect(prisma.movie.findMany).toHaveBeenCalledWith({ where: PLAYABLE_VARIANT_WHERE });
    expect(prisma.episode.findMany).toHaveBeenCalledWith({
      where: { seriesId: 7, ...PLAYABLE_VARIANT_WHERE },
    });
    expect(prisma.episode.findMany).toHaveBeenCalledWith({
      where: { seasonId: 11, ...PLAYABLE_VARIANT_WHERE },
    });
    expect(prisma.episode.findMany).toHaveBeenCalledWith({ where: PLAYABLE_VARIANT_WHERE });
    expect(prisma.series.findMany).toHaveBeenCalledWith({ where: PLAYABLE_SERIES_WHERE });
    expect(prisma.season.findMany).toHaveBeenCalledWith({
      where: { seriesId: 7, ...PLAYABLE_SERIES_WHERE },
    });
    expect(prisma.movie.findFirst).toHaveBeenCalledWith({
      where: { id: 5, ...PLAYABLE_VARIANT_WHERE },
    });
    expect(prisma.episode.findFirst).toHaveBeenCalledWith({
      where: { id: 42, ...PLAYABLE_VARIANT_WHERE },
    });
    expect(prisma.series.findFirst).toHaveBeenCalledWith({
      where: { id: 7, ...PLAYABLE_SERIES_WHERE },
    });
    expect(prisma.season.findFirst).toHaveBeenCalledWith({
      where: { id: 11, ...PLAYABLE_SERIES_WHERE },
    });
    expect(prisma.movie.findUnique).not.toHaveBeenCalled();
    expect(prisma.episode.findUnique).not.toHaveBeenCalled();
  });
});
