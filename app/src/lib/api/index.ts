import { createActivityApi } from './activityApi';


import { createBackupApi } from './backupApi';
import { createBlocklistApi } from './blocklistApi';
import { createCalendarApi } from './calendarApi';
import { createCategorySettingsApi } from './categorySettingsApi';
import { createCollectionApi } from './collectionApi';
import { createCustomFormatApi } from './customFormatApi';
import { createDiscoverApi } from './discoverApi';
import { createEventsApi } from './eventsApi';
import { createFilesystemApi } from './filesystemApi';
import { createFiltersApi } from './filters';
import { createHealthApi } from './healthApi';
import { ApiHttpClient, type ApiHttpClientConfig } from './httpClient';
import { createImportApi } from './importApi';
import { createImportListsApi } from './importListsApi';
import { createIndexerApi } from './indexerApi';
import { createLanguageProfilesApi } from './languageProfilesApi';
import { createLogsApi } from './logsApi';
import { createMediaApi } from './mediaApi';
import { createMovieApi } from './movieApi';
import { createQualityProfileApi } from './qualityProfileApi';
import { createReleaseApi } from './releaseApi';
import { createSeriesApi } from './seriesApi';
import { createSettingsApi } from './settingsApi';
import { createProxySettingsApi } from './proxySettingsApi';
import { createSubtitleApi } from './subtitleApi';
import { createSubtitleBlacklistApi } from './subtitleBlacklistApi';
import { createSubtitleHistoryApi } from './subtitleHistoryApi';
import { createSubtitleProvidersApi } from './subtitleProvidersApi';
import { createSubtitleWantedApi } from './subtitleWantedApi';
import { createTagsApi } from './tagsApi';
import { createTorrentApi } from './torrentApi';
import { createDownloadClientApi } from './downloadClientsApi';
import { createMediaManagementApi } from './mediaManagementApi';
import { createNotificationsApi } from './notificationsApi';
import { createSystemApi } from './systemApi';
import { createUpdatesApi } from './updatesApi';
import { createWantedApi } from './wantedApi';

export function createApiClients(config: ApiHttpClientConfig = {}) {
  const httpClient = new ApiHttpClient(config);

  return {
    httpClient,
    mediaApi: createMediaApi(httpClient),
    releaseApi: createReleaseApi(httpClient),
    torrentApi: createTorrentApi(httpClient),
    importApi: createImportApi(httpClient),
    indexerApi: createIndexerApi(httpClient),


    downloadClientApi: createDownloadClientApi(httpClient),
    mediaManagementApi: createMediaManagementApi(httpClient),
    importListsApi: createImportListsApi(httpClient),
    tagsApi: createTagsApi(httpClient),
    subtitleApi: createSubtitleApi(httpClient),
    subtitleBlacklistApi: createSubtitleBlacklistApi(httpClient),
    subtitleHistoryApi: createSubtitleHistoryApi(httpClient),
    subtitleProvidersApi: createSubtitleProvidersApi(httpClient),
    subtitleWantedApi: createSubtitleWantedApi(httpClient),
    activityApi: createActivityApi(httpClient),
    calendarApi: createCalendarApi(httpClient),
    categorySettingsApi: createCategorySettingsApi(httpClient),
    collectionApi: createCollectionApi(httpClient),
    discoverApi: createDiscoverApi(httpClient),
    filtersApi: createFiltersApi(httpClient),
    blocklistApi: createBlocklistApi(httpClient),
    settingsApi: createSettingsApi(httpClient),
    healthApi: createHealthApi(httpClient),
    notificationsApi: createNotificationsApi(httpClient),
    proxySettingsApi: createProxySettingsApi(httpClient),
    systemApi: createSystemApi(httpClient),
    backupApi: createBackupApi(httpClient),
    logsApi: createLogsApi(httpClient),
    updatesApi: createUpdatesApi(httpClient),
    qualityProfileApi: createQualityProfileApi(httpClient),
    customFormatApi: createCustomFormatApi(httpClient),
    languageProfilesApi: createLanguageProfilesApi(httpClient),
    wantedApi: createWantedApi(httpClient),
    movieApi: createMovieApi(httpClient),
    seriesApi: createSeriesApi(httpClient),
    filesystemApi: createFilesystemApi(httpClient),
    eventsApi: createEventsApi({
      baseUrl: config.baseUrl,
    }),
  };
}

export { ApiClientError, ContractViolationError } from './errors';
export { ApiHttpClient } from './httpClient';
export { routeMap } from './routeMap';

// Subtitle types
export type {
  SubtitleVariantInventory,
  ManualSearchCandidate,
  SubtitleTrack,
  EpisodeSubtitle,
  SeriesSubtitleVariant,
  SeriesSyncResult,
  DiskScanResult,
  SubtitleSearchResult,
  BulkUpdateMoviesResult,
  BulkUpdateMoviesInput,
  SubtitleUploadRecord,
  SubtitleUploadInput,
} from './subtitleApi';
export type { ManualSearchInput, ManualDownloadInput } from './subtitleApi';

// Subtitle Blacklist types
export type {
  BlacklistedSubtitle,
  BlacklistOperationResult,
  BlacklistQueryParams,
} from './subtitleBlacklistApi';

// Subtitle History types
export type {
  SubtitleHistoryEntry,
  HistoryQueryParams,
  HistoryStats,
  StatsQueryParams,
} from './subtitleHistoryApi';

// Subtitle Wanted types
export type {
  WantedSeriesEntry,
  WantedMovieEntry,
  WantedCount,
  WantedQueryParams,
  SearchTriggerResult,
  SeriesItemSearchResult,
  MovieItemSearchResult,
} from './subtitleWantedApi';

// Subtitle Providers types
export type {
  SubtitleProvider,
  ProviderSettings,
  ProviderTestResult,
} from './subtitleProvidersApi';

// Language Profile types
export type {
  LanguageProfile,
  LanguageSetting,
  LanguageProfileInput,
  LanguageSettingInput,
} from './languageProfilesApi';

// Collection types
export type { MovieCollection, CollectionMovie, CollectionEditForm } from './collectionApi';

// Discover types
export type { DiscoverMovie, DiscoverRecommendationsParams } from './discoverApi';

// Import types
export type {
  DetectedSeries,
  SeriesSearchResult,
  ImportSeriesRequest,
  ScanFolderRequest,
} from './importApi';

// Wanted types
export type { MissingMovie, CutoffUnmetMovie } from './wantedApi';

// Movie types
export type { Movie, UpdateMovieInput } from './movieApi';

// Series types
export type { Series, BulkSeriesChanges, BulkUpdateResult } from './seriesApi';
export type { CustomFilter, FilterCondition, FilterConditionsGroup } from './filters';
export type { ProxySettingsItem, ProxySettingsInput } from './proxySettingsApi';

// Release types
export type { ReleaseCandidate, GrabResult, SearchParams } from './releaseApi';

// Import List types
export type {
  ImportList,
  ImportListExclusion,
  ProviderInfo,
  SyncResult,
  CreateImportListInput,
  UpdateImportListInput,
  CreateExclusionInput,
  TMDBPopularConfig,
  TMDBListConfig,
  ProviderType,
} from './importListsApi';
export type { CategorySettingsItem, CategorySettingsInput } from './categorySettingsApi';
