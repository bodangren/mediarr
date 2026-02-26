import type { ListQuery, WantedQuery } from '../api/mediaApi';
import type { ActivityQuery } from '../api/activityApi';
import type { CalendarListParams } from '../../types/calendar';
import type { BlocklistQuery } from '../../types/blocklist';
import type { EventsQuery, TaskHistoryQuery } from '../api/systemApi';
import type { UpdateHistoryQuery } from '../api/updatesApi';
import type { TorrentListQuery } from '../api/torrentApi';
import type { MissingEpisodesQuery, CutoffUnmetEpisodesQuery, MissingMoviesQuery, CutoffUnmetMoviesQuery } from '../../types/wanted';
import type { WantedQueryParams } from '../api/subtitleWantedApi';
import type { HistoryQueryParams, StatsQueryParams } from '../api/subtitleHistoryApi';
import type { BlacklistQueryParams } from '../api/subtitleBlacklistApi';

export const queryKeys = {
  seriesList: (query: ListQuery) => ['series', 'list', query] as const,
  seriesDetail: (id: number) => ['series', 'detail', id] as const,
  filtersList: (type: 'series' | 'indexer') => ['filters', type] as const,

  moviesList: (query: ListQuery) => ['movies', 'list', query] as const,
  movieDetail: (id: number) => ['movies', 'detail', id] as const,

  wantedList: (query: WantedQuery) => ['media', 'wanted', query] as const,
  missingEpisodes: (query: MissingEpisodesQuery) => ['episodes', 'missing', query] as const,
  cutoffUnmetEpisodes: (query: CutoffUnmetEpisodesQuery) => ['episodes', 'cutoff-unmet', query] as const,
  missingMovies: (query: MissingMoviesQuery) => ['movies', 'missing', query] as const,
  cutoffUnmetMovies: (query: CutoffUnmetMoviesQuery) => ['movies', 'cutoff-unmet', query] as const,
  releaseCandidates: (request: Record<string, unknown>) => ['media', 'release-candidates', request] as const,

  calendar: (params: CalendarListParams) => ['calendar', 'list', params] as const,

  collections: () => ['collections', 'list'] as const,
  collectionDetail: (id: number) => ['collections', 'detail', id] as const,

  discoverMovies: (mode: string) => ['discover', 'movies', mode] as const,

  indexers: () => ['indexers', 'list'] as const,


  torrents: (query: TorrentListQuery) => ['torrents', 'list', query] as const,
  activity: (query: ActivityQuery) => ['activity', 'list', query] as const,
  blocklist: (query: BlocklistQuery) => ['blocklist', 'list', query] as const,
  downloadClients: () => ['download-clients', 'list'] as const,
  notifications: () => ['notifications', 'list'] as const,
  tags: () => ['tags', 'list'] as const,
  tagDetails: (id: number) => ['tags', 'details', id] as const,

  qualityProfiles: () => ['quality-profiles', 'list'] as const,
  qualityProfile: (id: number) => ['quality-profiles', 'detail', id] as const,
  customFormats: () => ['custom-formats', 'list'] as const,
  customFormat: (id: number) => ['custom-formats', 'detail', id] as const,
  customFormatSchema: () => ['custom-formats', 'schema'] as const,
  languageProfiles: () => ['language-profiles', 'list'] as const,

  health: () => ['health'] as const,
  settings: () => ['settings'] as const,
  settingsProxies: () => ['settings', 'proxies'] as const,
  settingsCategories: () => ['settings', 'categories'] as const,
  systemStatus: () => ['system', 'status'] as const,
  systemEvents: (query: EventsQuery) => ['system', 'events', query] as const,

  tasksScheduled: () => ['tasks', 'scheduled'] as const,
  tasksQueued: () => ['tasks', 'queued'] as const,
  tasksHistory: (query: TaskHistoryQuery) => ['tasks', 'history', query] as const,
  taskDetails: (id: number) => ['tasks', 'details', id] as const,

  backups: () => ['backups', 'list'] as const,
  backupSchedule: () => ['backups', 'schedule'] as const,

  logsFiles: () => ['logs', 'files'] as const,
  logsFileContents: (filename: string, query?: { limit?: number }) =>
    ['logs', 'file', filename, query] as const,

  updatesCurrent: () => ['updates', 'current'] as const,
  updatesAvailable: () => ['updates', 'available'] as const,
  updatesHistory: (query: UpdateHistoryQuery) => ['updates', 'history', query] as const,
  updatesProgress: (updateId: string) => ['updates', 'progress', updateId] as const,

  // Subtitle wanted
  subtitleWantedCount: () => ['subtitle-wanted', 'count'] as const,
  subtitleWantedSeries: (query: WantedQueryParams) => ['subtitle-wanted', 'series', query] as const,
  subtitleWantedMovies: (query: WantedQueryParams) => ['subtitle-wanted', 'movies', query] as const,

  // Subtitle history
  subtitleHistory: (type: 'series' | 'movies', params: HistoryQueryParams) =>
    ['subtitle-history', type, params] as const,
  subtitleHistoryStats: (params: StatsQueryParams) => ['subtitle-history-stats', params] as const,

  // Subtitle blacklist
  subtitleBlacklistSeries: (params: BlacklistQueryParams) =>
    ['subtitle-blacklist', 'series', params] as const,
  subtitleBlacklistMovies: (params: BlacklistQueryParams) =>
    ['subtitle-blacklist', 'movies', params] as const,

  // Subtitle providers
  subtitleProviders: () => ['subtitle-providers'] as const,
  subtitleProvider: (id: string) => ['subtitle-provider', id] as const,

  // Import lists
  importLists: () => ['import-lists'] as const,
  importList: (id: number) => ['import-lists', 'detail', id] as const,
  importListProviders: () => ['import-lists', 'providers'] as const,
  importListExclusions: () => ['import-lists', 'exclusions'] as const,
};

export type QueryKeyFactory = typeof queryKeys;
