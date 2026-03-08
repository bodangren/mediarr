import type { PrismaClient } from '@prisma/client';
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
import type { SearchAggregationService } from '../services/SearchAggregationService';
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


export interface ApiDependencies {
  prisma: PrismaClient | Record<string, any>;
  mediaService?: Pick<
    MediaService,
    'setMonitored' | 'deleteMedia' | 'getMovieCandidatesForSearch'
  >;
  mediaSearchService?: Pick<
    MediaSearchService,
    'getSearchCandidates' | 'grabRelease' | 'searchMovie' | 'searchAllIndexers' | 'grabReleaseByGuid'
  >;
  searchAggregationService?: Pick<SearchAggregationService, 'searchAllIndexers'>;
  wantedService?: Pick<WantedService, 'getMissingEpisodes'>;
  wantedSearchService?: Pick<WantedSearchService, 'autoSearchMovie' | 'autoSearchEpisode' | 'autoSearchAll' | 'autoSearchSeries'>;
  torrentManager?: Pick<
    TorrentManager,
    | 'addTorrent'
    | 'pauseTorrent'
    | 'resumeTorrent'
    | 'removeTorrent'
    | 'setSpeedLimits'
    | 'setDownloadPaths'
    | 'getTorrentsStatus'
    | 'getTorrentStatus'
    | 'getActiveTorrents'
  >;
  importManager?: Pick<
    ImportManager,
    'retryImportByInfoHash' | 'retryImportByActivityEventId'
  >;
  indexerRepository?: Pick<IndexerRepository, 'findAll' | 'findById' | 'create' | 'update' | 'delete'>;
  mediaRepository?: Pick<MediaRepository, 'findMovieByTmdbId' | 'upsertMovie' | 'upsertSeries' | 'findSeriesByTvdbId' | 'upsertSeasonsAndEpisodes'>;
  indexerTester?: Pick<IndexerTester, 'test'>;
  indexerFactory?: Pick<IndexerFactory, 'fromDatabaseRecord' | 'getDefinition' | 'getCompatibilityReport'>;
  subtitleInventoryApiService?: Pick<
    SubtitleInventoryApiService,
    | 'listMovieVariantInventory'
    | 'listEpisodeVariantInventory'
    | 'manualSearch'
    | 'manualDownload'
      | 'uploadSubtitle'
  >;
  subtitleProviderFactory?: Pick<
    SubtitleProviderFactory,
    'getProviderNames' | 'resolveManualProvider'
  >;
  subtitleAutomationService?: Pick<
    SubtitleAutomationService,
    'runAutomationCycle' | 'onMovieImported' | 'onEpisodeImported'
  >;
  playbackService?: Pick<
    PlaybackService,
    'resolveStreamSource' | 'buildManifest' | 'recordHeartbeat' | 'resolveSubtitleTrack'
  >;
  settingsService?: Pick<SettingsService, 'get' | 'update'>;
  activityEventRepository?: Pick<ActivityEventRepository, 'query' | 'clear' | 'markAsFailed' | 'export'>;
  indexerHealthRepository?: Pick<IndexerHealthRepository, 'getByIndexerId'>;
  notificationRepository?: Pick<
    NotificationRepository,
    'findAll' | 'findById' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists'
  >;
  qualityProfileRepository?: Pick<
    QualityProfileRepository,
    'findAll' | 'findById' | 'findByName' | 'create' | 'update' | 'delete' | 'isInUse'
  >;
  downloadClientRepository?: Pick<
    DownloadClientRepository,
    'findAll' | 'findById' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists'
  >;
  customFormatRepository?: Pick<
    CustomFormatRepository,
    'findAll' | 'findById' | 'findByName' | 'create' | 'update' | 'delete' | 'exists' | 'nameExists' | 'findByQualityProfileId'
  >;
  metadataProvider?: Pick<MetadataProvider, 'searchMedia' | 'getMediaDetails' | 'getSeriesDetails' | 'findMovieByImdbId'>;
  eventHub?: ApiEventHub;
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
  >;
  importListProviderRegistry?: ImportListProviderFactory;
  importListSyncService?: Pick<ImportListSyncService, 'syncList' | 'syncAllEnabled'>;
  collectionRepository?: Pick<
    CollectionRepository,
    'findAll' | 'findById' | 'findByTmdbCollectionId' | 'create' | 'update' | 'delete' | 'getMovieCount' | 'getInLibraryCount' | 'exists' | 'existsByTmdbId'
  >;
  collectionService?: Pick<
    CollectionService,
    'fetchFromTMDB' | 'createCollection' | 'syncCollectionMovies' | 'searchMissingMovies' | 'linkMovieToCollection' | 'detectMovieCollection'
  >;
  scheduler?: Pick<Scheduler, 'listJobsMeta' | 'runNow' | 'listJobs'>;
  logReaderService?: Pick<LogReaderService, 'getEntries'>;
  backupService?: Pick<BackupService, 'create' | 'list' | 'delete' | 'getFilePath'>;

}

export interface ApiServerOptions {
  logger?: boolean;
  heartbeatIntervalMs?: number;
  torrentStatsIntervalMs?: number;
  activityPollIntervalMs?: number;
  healthPollIntervalMs?: number;
}
