import type { JellyfinCatalogRepository } from './catalog';

/** Adapts the existing generated database delegates; no parallel catalog store. */
export function createPrismaJellyfinCatalog(prisma: any): JellyfinCatalogRepository {
  return {
    listMovies: () => prisma.movie.findMany(), listSeries: () => prisma.series.findMany(),
    listSeasonsBySeriesId: (seriesId) => prisma.season.findMany({ where: { seriesId } }),
    listEpisodesBySeriesId: (seriesId) => prisma.episode.findMany({ where: { seriesId } }),
    listEpisodesBySeasonId: (seasonId) => prisma.episode.findMany({ where: { seasonId } }),
    listEpisodes: () => prisma.episode.findMany(),
    findMovieById: (id) => prisma.movie.findUnique({ where: { id } }), findSeriesById: (id) => prisma.series.findUnique({ where: { id } }),
    findSeasonById: (id) => prisma.season.findUnique({ where: { id } }), findEpisodeById: (id) => prisma.episode.findUnique({ where: { id } }),
  };
}
