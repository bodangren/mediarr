import {
  mapEpisodeToItem,
  type CatalogEpisodeRecord,
  type JellyfinCatalogItem,
} from './catalog';
import {
  deriveNextUp,
  type NextUpDependencies,
  type NextUpOptions,
  type OrderedJellyfinEpisode,
} from './playbackState';

export interface PrismaPlaybackProgressRecord {
  isWatched: boolean;
}

export interface PrismaEpisodeDelegate {
  findMany(input: {
    where?: { seriesId: number };
    orderBy: Array<Partial<Record<'seriesId' | 'seasonNumber' | 'episodeNumber' | 'id', 'asc'>>>;
  }): Promise<readonly CatalogEpisodeRecord[]>;
}

export interface PrismaPlaybackProgressDelegate {
  findFirst(input: {
    where: {
      mediaType: 'EPISODE';
      mediaId: number;
      userId: string;
    };
  }): Promise<PrismaPlaybackProgressRecord | null>;
}

/** Narrow delegate shape so route code can inject the existing DatabaseClient. */
export interface PrismaJellyfinPlaybackStateDelegates {
  episode: PrismaEpisodeDelegate;
  playbackProgress: PrismaPlaybackProgressDelegate;
}

export interface PrismaJellyfinPlaybackState extends NextUpDependencies {
  getOrderedCatalogEpisodes(seriesId?: number): Promise<readonly CatalogEpisodeRecord[]>;
}

const ORDERED_EPISODE_ORDER_BY = [
  { seriesId: 'asc' },
  { seasonNumber: 'asc' },
  { episodeNumber: 'asc' },
  { id: 'asc' },
] as const;

function compareEpisodeOrder(left: CatalogEpisodeRecord, right: CatalogEpisodeRecord): number {
  return left.seriesId - right.seriesId
    || left.seasonNumber - right.seasonNumber
    || left.episodeNumber - right.episodeNumber
    || left.id - right.id;
}

/**
 * Adapts generated Prisma-style delegates to the narrow NextUp dependency
 * contract. Playback progress is deliberately queried by the shared user key.
 */
export function createPrismaJellyfinPlaybackState(
  delegates: PrismaJellyfinPlaybackStateDelegates,
): PrismaJellyfinPlaybackState {
  const getOrderedCatalogEpisodes = async (
    seriesId?: number,
  ): Promise<readonly CatalogEpisodeRecord[]> => {
    const rows = await delegates.episode.findMany({
      ...(seriesId === undefined ? {} : { where: { seriesId } }),
      orderBy: [...ORDERED_EPISODE_ORDER_BY],
    });

    // The real delegate applies orderBy in SQLite. Sorting again is a small
    // defensive guard for test/injected delegates and keeps NextUp deterministic.
    return [...rows].sort(compareEpisodeOrder);
  };

  return {
    getOrderedCatalogEpisodes,
    async getOrderedEpisodes(seriesId?: number): Promise<readonly OrderedJellyfinEpisode[]> {
      const episodes = await getOrderedCatalogEpisodes(seriesId);
      return episodes.map(episode => ({ id: episode.id, seriesId: episode.seriesId }));
    },
    getProgress(episodeId: number, userId: string): Promise<PrismaPlaybackProgressRecord | null> {
      return delegates.playbackProgress.findFirst({
        where: {
          mediaType: 'EPISODE',
          mediaId: episodeId,
          userId,
        },
      });
    },
  };
}

/**
 * Derives shared-state NextUp rows and maps them through the catalog DTO mapper
 * without maintaining a second media catalog or playback store.
 */
export async function derivePrismaNextUpCatalogItems(
  playbackState: PrismaJellyfinPlaybackState,
  options: NextUpOptions = {},
): Promise<JellyfinCatalogItem[]> {
  const episodes = await playbackState.getOrderedCatalogEpisodes(options.seriesId);
  const episodeById = new Map(episodes.map(episode => [episode.id, episode]));
  const nextUp = await deriveNextUp({
    getOrderedEpisodes: async () => episodes.map(episode => ({
      id: episode.id,
      seriesId: episode.seriesId,
    })),
    getProgress: playbackState.getProgress,
  }, options);

  return nextUp.flatMap(episode => {
    const catalogEpisode = episodeById.get(episode.id);
    return catalogEpisode ? [mapEpisodeToItem(catalogEpisode)] : [];
  });
}
