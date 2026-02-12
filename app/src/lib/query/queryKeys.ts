import type { ListQuery, WantedQuery } from '../api/mediaApi';
import type { ActivityQuery } from '../api/activityApi';
import type { TorrentListQuery } from '../api/torrentApi';

export const queryKeys = {
  seriesList: (query: ListQuery) => ['series', 'list', query] as const,
  seriesDetail: (id: number) => ['series', 'detail', id] as const,

  moviesList: (query: ListQuery) => ['movies', 'list', query] as const,
  movieDetail: (id: number) => ['movies', 'detail', id] as const,

  wantedList: (query: WantedQuery) => ['media', 'wanted', query] as const,
  releaseCandidates: (request: Record<string, unknown>) => ['media', 'release-candidates', request] as const,

  indexers: () => ['indexers', 'list'] as const,
  torrents: (query: TorrentListQuery) => ['torrents', 'list', query] as const,
  activity: (query: ActivityQuery) => ['activity', 'list', query] as const,

  health: () => ['health'] as const,
  settings: () => ['settings'] as const,
};

export type QueryKeyFactory = typeof queryKeys;
