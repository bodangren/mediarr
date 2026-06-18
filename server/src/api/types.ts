import type { DatabaseClient } from '../db/drizzleClient';
import type { IndexerRepository } from '../repositories/IndexerRepository';
import type { MediaRepository } from '../repositories/MediaRepository';
import type { ActivityEventRepository } from '../repositories/ActivityEventRepository';
import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';
import type { NotificationRepository } from '../repositories/NotificationRepository';
import type { QualityProfileRepository } from '../repositories/QualityProfileRepository';
import type { DownloadClientRepository } from '../repositories/DownloadClientRepository';
import type { CustomFormatRepository } from '../repositories/CustomFormatRepository';
import type { ImportListRepository } from '../repositories/ImportListRepository';
import type { CollectionRepository } from '../repositories/CollectionRepository';
import type { MediaService } from '../services/MediaService';
import type { MediaSearchService } from '../services/MediaSearchService';
import type { WantedService } from '../services/WantedService';
import type { WantedSearchService } from '../services/WantedSearchService';
import type { TorrentManager } from '../services/TorrentManager';
import type { SettingsService } from '../services/SettingsService';
import type { SubtitleInventoryApiService } from '../services/SubtitleInventoryApiService';
import type { SubtitleProviderFactory } from '../services/SubtitleProviderFactory';
import type { SubtitleAutomationService } from '../services/SubtitleAutomationService';
import type { PlaybackService } from '../services/PlaybackService';
import type { MetadataProvider } from '../services/MetadataProvider';
import type { CollectionService } from '../services/CollectionService';
import type { ImportManager } from '../services/ImportManager';
import type { IndexerFactory } from '../indexers/IndexerFactory';
import type { IndexerTester } from '../indexers/IndexerTester';
import type { ApiEventHub } from './eventHub';
import type { ImportListProviderFactory } from '../services/importLists/ImportListProvider';
import type { ImportListSyncService } from '../services/importLists/ImportListSyncService';
import type { Scheduler } from '../services/Scheduler';
import type { LogReaderService } from '../services/LogReaderService';
import type { BackupService } from '../services/BackupService';
import type { LibraryScanService } from '../services/LibraryScanService';
import type { SystemHealthService } from '../services/SystemHealthService';
import type { UpdateService } from '../services/updates/UpdateService';
import type { CatalogCache } from '../services/indexers/CatalogCache';


export interface ApiDependencies {
  prisma: DatabaseClient | Record<string, any>;
  mediaService?: Pick<
    MediaService,
    'setMonitored' | 'deleteMedia' | 'getMovieCandidatesForSearch' | 'setEpisodeMonitored'
  > | undefined;
  mediaSearchService?: Pick<
    MediaSearchService,
    'getSearchCandidates' | 'grabRelease' | 'searchMovie' | 'searchAllIndexers' | 'grabReleaseByGuid'
  > | undefined;
  searchAggregationService?: Pick<MediaSearchService, 'searchAllIndexers'> | undefined;
  wantedService?: Pick<WantedService, 'getMissingEpisodes'> | undefined;
  wantedSearchService?: Pick<WantedSearchService, 'autoSearchMovie' | 'autoSearchEpisode' | 'autoSearchAll' | 'autoSearchSeries'> | undefined;
  torrentManager?: Pick<
    TorrentManager,
    | 'addTorrent'
    | 'pauseTorrent'
    | 'resumeTorrent'
    | 'removeTorrent'
    | 'setPriority'
    | 'setSpeedLimits'
    | 'setDownloadPaths'
    | 'getTorrentsStatus'
    | 'getTorrentStatus'
    | 'getActiveTorrents'
  > | undefined;
  importManager?: Pick<
    ImportManager,
    'retryImportByInfoHash' | 'retryImportByActivityEventId'
  > | undefined;
  indexerRepository?: Pick<IndexerRepository, 'findAll' | 'findById' | 'create' | 'update' | 'delete'> | undefined;
  mediaRepository?: Pick<MediaRepository, 'findMovieByTmdbId' | 'upsertMovie' | 'upsertSeries' | 'findSeriesByTvdbId' | 'upsertSeasonsAndEpisodes'> | undefined;
  indexerTester?: Pick<IndexerTester, 'test'> | undefined;
  indexerFactory?: Pick<IndexerFactory, 'fromDatabaseRecord' | 'getDefinition' | 'getCompatibilityReport'> | undefined;
  subtitleInventoryApiService?: Pick<
    SubtitleInventoryApiService,
    | 'listMovieVariantInventory'
    | 'listEpisodeVariantInventory'
    | 'manualSearch'
    | 'manualDownload'
    | 'uploadSubtitle'
    | 'scanMovieDisk'
    | 'scanEpisodeDisk'
    | 'deleteSubtitleTrack'
  > | undefined;
  subtitleProviderFactory?: Pick<
    SubtitleProviderFactory,
    'getProviderNames' | 'resolveManualProvider'
  > | undefined;
  subtitleAutomationService?: Pick<
    SubtitleAutomationService,
    'runAutomationCycle' | 'runTargetedAutomationCycle' | 'onMovieImported' | 'onEpisodeImported'
  > | undefined;
  playbackService?: Pick<
    PlaybackService,
    'resolveStreamSource' | 'buildManifest' | 'recordHeartbeat' | 'resolveSubtitleTrack' | 'getContinueWatching'
  > | undefined;
  settingsService?: Pick<SettingsService, 'get' | 'update'> | undefined;
  activityEventRepository?: Pick<ActivityEventRepository, 'query' | 'clear' | 'markAsFailed' | 'export'> | undefined;
  indexerHealthRepository?: Pick<IndexerHealthRepository, 'getByIndexerId'> | undefined;
  notificationRepository?: Pick<
    NotificationRepository,
    'findAll' | 'findById' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists'
  > | undefined;
  qualityProfileRepository?: Pick<
    QualityProfileRepository,
    'findAll' | 'findById' | 'findByName' | 'create' | 'update' | 'delete' | 'isInUse'
  > | undefined;
  downloadClientRepository?: Pick<
    DownloadClientRepository,
    'findAll' | 'findById' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists'
  > | undefined;
  customFormatRepository?: Pick<
    CustomFormatRepository,
    'findAll' | 'findById' | 'findByName' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists' | 'findByQualityProfileId'
  > | undefined;
  metadataProvider?: Pick<MetadataProvider, 'searchMedia' | 'getMediaDetails' | 'getSeriesDetails' | 'findMovieByImdbId'> | undefined;
  eventHub?: ApiEventHub | undefined;
  importListRepository?: Pick<
    ImportListRepository,
    | 'findAll'
    | 'findById'
    | 'create'
    | 'update'
    | 'delete'
    | 'updateLastSync'
    | 'findAllExclusions'
    | 'findExclusionById'
    | 'createExclusion'
    | 'deleteExclusion'
    | 'isExcluded'
  > | undefined;
  importListProviderRegistry?: ImportListProviderFactory | undefined;
  importListSyncService?: Pick<ImportListSyncService, 'syncList' | 'syncAllEnabled'> | undefined;
  collectionRepository?: Pick<
    CollectionRepository,
    'findAll' | 'findById' | 'findByTmdbCollectionId' | 'create' | 'update' | 'delete' | 'getMovieCount' | 'getInLibraryCount' | 'exists' | 'existsByTmdbId'
  > | undefined;
  collectionService?: Pick<
    CollectionService,
    'fetchFromTMDB' | 'createCollection' | 'syncCollectionMovies' | 'searchMissingMovies' | 'linkMovieToCollection' | 'detectMovieCollection'
  > | undefined;
  scheduler?: Pick<Scheduler, 'listJobsMeta' | 'runNow' | 'listJobs' | 'isScheduled' | 'reschedule'> | undefined;
  logReaderService?: Pick<LogReaderService, 'getEntries'> | undefined;
  backupService?: Pick<BackupService, 'create' | 'list' | 'delete' | 'getFilePath'> | undefined;
  libraryScanService?: Pick<LibraryScanService, 'scanAll'> | undefined;
  systemHealthService?: Pick<
    SystemHealthService,
    'getDiskSpace' | 'getProcessInfo' | 'checkDatabase' | 'checkRootFolders' | 'detectFFmpeg'
  > | undefined;
  updateService?: Pick<
    UpdateService,
    | 'getCurrentVersionInfo'
    | 'getLatestRelease'
    | 'listHistory'
    | 'checkForUpdate'
    | 'downloadUpdate'
    | 'installUpdate'
    | 'getProgress'
    | 'listProgress'
    | 'resetForTests'
  > | undefined;
  catalogCache?: Pick<CatalogCache, 'get' | 'load' | 'invalidate'> | undefined;

}

export interface ApiServerOptions {
  logger?: boolean | undefined;
  heartbeatIntervalMs?: number | undefined;
  torrentStatsIntervalMs?: number | undefined;
  activityPollIntervalMs?: number | undefined;
  healthPollIntervalMs?: number | undefined;
}
