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
import type { MediaService } from '../services/MediaService';
import type { MediaSearchService } from '../services/MediaSearchService';
import type { WantedService } from '../services/WantedService';
import type { TorrentManager } from '../services/TorrentManager';
import type { SettingsService } from '../services/SettingsService';
import type { SubtitleInventoryApiService } from '../services/SubtitleInventoryApiService';
import type { MetadataProvider } from '../services/MetadataProvider';
import type { IndexerFactory } from '../indexers/IndexerFactory';
import type { IndexerTester } from '../indexers/IndexerTester';
import type { ApiEventHub } from './eventHub';
import type { ImportListProviderFactory } from '../services/importLists/ImportListProvider';
import type { ImportListSyncService } from '../services/importLists/ImportListSyncService';

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
  wantedService?: Pick<WantedService, 'getMissingEpisodes'>;
  torrentManager?: Pick<
    TorrentManager,
    | 'addTorrent'
    | 'pauseTorrent'
    | 'resumeTorrent'
    | 'removeTorrent'
    | 'setSpeedLimits'
    | 'getTorrentsStatus'
    | 'getTorrentStatus'
  >;
  indexerRepository?: Pick<IndexerRepository, 'findAll' | 'findById' | 'create' | 'update' | 'delete'>;
  mediaRepository?: Pick<MediaRepository, 'findMovieByTmdbId' | 'upsertMovie' | 'upsertSeries'>;
  indexerTester?: Pick<IndexerTester, 'test'>;
  indexerFactory?: Pick<IndexerFactory, 'fromDatabaseRecord'>;
  subtitleInventoryApiService?: Pick<
    SubtitleInventoryApiService,
    | 'listMovieVariantInventory'
    | 'listEpisodeVariantInventory'
    | 'manualSearch'
    | 'manualDownload'
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
  metadataProvider?: Pick<MetadataProvider, 'searchMedia'>;
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
}

export interface ApiServerOptions {
  logger?: boolean;
  heartbeatIntervalMs?: number;
  torrentStatsIntervalMs?: number;
  activityPollIntervalMs?: number;
  healthPollIntervalMs?: number;
}
