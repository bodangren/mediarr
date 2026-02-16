import type { ListQuery, WantedQuery } from '../api/mediaApi';
import type { ActivityQuery } from '../api/activityApi';
import type { CalendarListParams } from '../../types/calendar';
import type { BlocklistQuery } from '../../types/blocklist';
import type { EventsQuery, TaskHistoryQuery } from '../api/systemApi';
import type { UpdateHistoryQuery } from '../api/updatesApi';
import type { TorrentListQuery } from '../api/torrentApi';
import type { MissingEpisodesQuery, CutoffUnmetEpisodesQuery } from '../../types/wanted';

export const queryKeys = {
  seriesList: (query: ListQuery) => ['series', 'list', query] as const,
  seriesDetail: (id: number) => ['series', 'detail', id] as const,

  moviesList: (query: ListQuery) => ['movies', 'list', query] as const,
  movieDetail: (id: number) => ['movies', 'detail', id] as const,

  wantedList: (query: WantedQuery) => ['media', 'wanted', query] as const,
  missingEpisodes: (query: MissingEpisodesQuery) => ['episodes', 'missing', query] as const,
  cutoffUnmetEpisodes: (query: CutoffUnmetEpisodesQuery) => ['episodes', 'cutoff-unmet', query] as const,
  releaseCandidates: (request: Record<string, unknown>) => ['media', 'release-candidates', request] as const,

  calendar: (params: CalendarListParams) => ['calendar', 'list', params] as const,

  indexers: () => ['indexers', 'list'] as const,
  applications: () => ['applications', 'list'] as const,
  torrents: (query: TorrentListQuery) => ['torrents', 'list', query] as const,
  activity: (query: ActivityQuery) => ['activity', 'list', query] as const,
  blocklist: (query: BlocklistQuery) => ['blocklist', 'list', query] as const,
  downloadClients: () => ['download-clients', 'list'] as const,
  notifications: () => ['notifications', 'list'] as const,
  tags: () => ['tags', 'list'] as const,
  tagDetails: (id: number) => ['tags', 'details', id] as const,

  qualityProfiles: () => ['quality-profiles', 'list'] as const,
  qualityProfile: (id: number) => ['quality-profiles', 'detail', id] as const,
  languageProfiles: () => ['language-profiles', 'list'] as const,

  health: () => ['health'] as const,
  settings: () => ['settings'] as const,
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
};

export type QueryKeyFactory = typeof queryKeys;
