import type { JellyfinCatalogRepository } from './catalog';

/**
 * The Jellyfin catalog must not expose a record that PlaybackService cannot
 * resolve. PlaybackService considers a file variant playable only when it has
 * a non-empty path, so every catalog query uses the equivalent relation filter.
 */
const PLAYABLE_VARIANT_WHERE = {
  fileVariants: {
    some: {
      path: { not: '' },
    },
  },
} as const;

const PLAYABLE_EPISODE_WHERE = PLAYABLE_VARIANT_WHERE;

const PLAYABLE_SERIES_WHERE = {
  episodes: {
    some: PLAYABLE_EPISODE_WHERE,
  },
} as const;

const PLAYABLE_SEASON_WHERE = {
  episodes: {
    some: PLAYABLE_EPISODE_WHERE,
  },
} as const;

function findPlayableRecord(delegate: any, where: Record<string, unknown>) {
  if (typeof delegate.findFirst === 'function') {
    return delegate.findFirst({ where });
  }

  // Unit fixtures predate the relation-aware lookup; production's generated
  // DatabaseClient always supplies findFirst.
  return delegate.findUnique({ where });
}

/** Adapts the existing generated database delegates; no parallel catalog store. */
export function createPrismaJellyfinCatalog(prisma: any): JellyfinCatalogRepository {
  return {
    listMovies: () => prisma.movie.findMany({ where: PLAYABLE_VARIANT_WHERE }),
    listSeries: () => prisma.series.findMany({ where: PLAYABLE_SERIES_WHERE }),
    listSeasonsBySeriesId: (seriesId) => prisma.season.findMany({
      where: { seriesId, ...PLAYABLE_SEASON_WHERE },
    }),
    listEpisodesBySeriesId: (seriesId) => prisma.episode.findMany({
      where: { seriesId, ...PLAYABLE_EPISODE_WHERE },
    }),
    listEpisodesBySeasonId: (seasonId) => prisma.episode.findMany({
      where: { seasonId, ...PLAYABLE_EPISODE_WHERE },
    }),
    listEpisodes: () => prisma.episode.findMany({ where: PLAYABLE_EPISODE_WHERE }),
    findMovieById: (id) => findPlayableRecord(
      prisma.movie,
      { id, ...PLAYABLE_VARIANT_WHERE },
    ),
    findSeriesById: (id) => findPlayableRecord(
      prisma.series,
      { id, ...PLAYABLE_SERIES_WHERE },
    ),
    findSeasonById: (id) => findPlayableRecord(
      prisma.season,
      { id, ...PLAYABLE_SEASON_WHERE },
    ),
    findEpisodeById: (id) => findPlayableRecord(
      prisma.episode,
      { id, ...PLAYABLE_EPISODE_WHERE },
    ),
  };
}
