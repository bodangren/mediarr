import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { DatabaseClient } from './db/drizzleClient';
import type { ApiDependencies } from './api/types';
import { ApiEventHub } from './api/eventHub';
import { ActivityEventRepository } from './repositories/ActivityEventRepository';
import { TaskExecutionsRepository } from './repositories/TaskExecutionsRepository';
import {
  type AppSettingsPayload,
  AppSettingsRepository,
} from './repositories/AppSettingsRepository';
import { CollectionRepository } from './repositories/CollectionRepository';
import { CustomFormatRepository } from './repositories/CustomFormatRepository';
import { DownloadClientRepository } from './repositories/DownloadClientRepository';
import { ImportListRepository } from './repositories/ImportListRepository';
import { IndexerHealthRepository } from './repositories/IndexerHealthRepository';
import { IndexerRepository } from './repositories/IndexerRepository';
import { MediaRepository } from './repositories/MediaRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { PlaybackRepository } from './repositories/PlaybackRepository';
import { QualityProfileRepository } from './repositories/QualityProfileRepository';
import { SubtitleVariantRepository } from './repositories/SubtitleVariantRepository';
import { TorrentRepository } from './repositories/TorrentRepository';
import { seedCategories } from './seeds/categories';
import { seedQualityDefinitions, seedQualityProfiles } from './seeds/qualities';
import { seedSmartDefaults } from './seeds/smartDefaults';
import { ActivityEventEmitter } from './services/ActivityEventEmitter';
import { ImportManager } from './services/ImportManager';
import { Organizer } from './services/Organizer';
import { CollectionService } from './services/CollectionService';
import {
  DataDirectoryInitializer,
  resolveRequiredDataDirectories,
} from './services/DataDirectoryInitializer';
import {
  createRuntimeTorrentManager,
  type TorrentRuntimePaths,
} from './services/createRuntimeTorrentManager';
import {
  BrowserAcceptanceIndexer,
  BrowserAcceptanceTorrentManager,
} from './services/BrowserAcceptanceAcquisitionFixture';
import {
  ImportListProviderRegistry,
  ImportListSyncService,
  TMDBListProvider,
  TMDBPopularProvider,
} from './services/importLists';
import { MediaSearchService } from './services/MediaSearchService';
import { MediaService } from './services/MediaService';
import { MetadataProvider } from './services/MetadataProvider';
import { MetadataRefreshService } from './services/MetadataRefreshService';
import { BrowserAcceptanceMetadataProvider } from './services/BrowserAcceptanceMetadataProvider';
import { BrowserAcceptanceSubtitleProvider } from './services/BrowserAcceptanceSubtitleProvider';
import { PlaybackService } from './services/PlaybackService';
import { OpenSubtitlesProvider } from './services/providers/OpenSubtitlesProvider';
import { AssrtProvider } from './services/providers/AssrtProvider';
import { SubdlProvider } from './services/providers/SubdlProvider';
import { RssSyncService } from './services/RssSyncService';
import { type SchedulerStateRepository, Scheduler } from './services/Scheduler';
import { SubtitleSyncService } from './services/SubtitleSyncService';
import { FfsubsyncAligner } from './services/FfsubsyncAligner';
import { BilingualSubtitleService } from './services/BilingualSubtitleService';
import { ensureLibraryRegistry } from './services/LibraryRegistry';
import { asc, eq, sql } from 'drizzle-orm';
import * as dbSchema from './db/schema';
import { orderSubtitlePathsByPriority } from './services/SubtitlePathPriority';
import { MiniMaxTranslator } from './services/MiniMaxTranslator';
import { XiaomiTranslator } from './services/XiaomiTranslator';
import { FallbackTranslator } from './services/FallbackTranslator';
import { SettingsService } from './services/SettingsService';
import { SubtitleAutomationService } from './services/SubtitleAutomationService';
import { SubtitleInventoryApiService } from './services/SubtitleInventoryApiService';
import { SubtitleNamingService } from './services/SubtitleNamingService';
import { SubtitleProviderFactory } from './services/SubtitleProviderFactory';
import { SubtitleScoringService } from './services/SubtitleScoringService';
import { ProviderBackedSubtitleFetchProvider } from './services/ProviderBackedSubtitleFetchProvider';
import { DiscoveryService } from './services/DiscoveryService';
import { VariantMissingSubtitleService } from './services/VariantMissingSubtitleService';
import { VariantSubtitleFetchService } from './services/VariantSubtitleFetchService';
import { VariantWantedService } from './services/VariantWantedService';
import { VariantBackfillService } from './services/VariantBackfillService';
import { VariantInventoryIndexer } from './services/VariantInventoryIndexer';
import { ProbeMetadataParser } from './services/ProbeMetadataParser';
import { FfprobeMetadataProbe } from './services/FfprobeMetadataProbe';
import { createVariantLifecycle, type VariantLifecycle } from './services/VariantLifecycle';
import { WantedService } from './services/WantedService';
import { WantedSearchService } from './services/WantedSearchService';
import { RssMediaMonitor } from './services/RssMediaMonitor';
import { BackupService } from './services/BackupService';
import { LibraryScanService } from './services/LibraryScanService';
import { EpisodeThumbnailService } from './services/EpisodeThumbnailService';
import { LibraryFolderImportService } from './services/LibraryFolderImportService';
import { downloadPending, pollAllSubscriptions, runRetention } from './services/YoutubeAutomation';
import { appendNightlyReceipt, buildNightlyReceipt, readIngestReceipts } from './services/MusicAutomation';
import { applyTidy, planTidy } from './services/StagingTidyService';
import { AdultThumbnailService, generateMissingAdultThumbnails } from './services/AdultThumbnailService';
import { snapshotCoverage } from './services/SubtitleCoverageAutomation';
import { queuePriorityWanted } from './services/SubtitleCoverageWanted';
import { globalLogBuffer } from './services/LogReaderService';
import { NotificationDispatchService } from './services/NotificationDispatchService';
import { NotificationTransportRegistry } from './services/notifications/NotificationTransportRegistry';
import { SeedingProtector } from './services/SeedingProtector';
import { SystemHealthService } from './services/SystemHealthService';
import { UpdateService } from './services/updates/UpdateService';
import { CatalogCache } from './services/indexers/CatalogCache';
import { DefinitionLoader } from './indexers/DefinitionLoader';
import { IndexerFactory } from './indexers/IndexerFactory';
import { HttpClient } from './indexers/HttpClient';
import { IndexerTester } from './indexers/IndexerTester';
import { IndexerServiceDiscovery } from './services/discovery/IndexerServiceDiscovery';
import { onReleaseParserDegraded } from './services/ReleaseParser';

export interface ServiceContainerOptions {
  /**
   * When true, the -arr domains (torrent engine, indexers, RSS sync, import
   * lists, subtitle automation, notifications, quality-profile seeds) are not
   * instantiated and their cron entries and API routes stay dark.
   */
  slim: boolean;
  prisma: DatabaseClient | Record<string, any>;
  /** Resolved database URL, used to derive the backup directory. */
  databaseUrl: string;
  /** Resolved application settings snapshot (loaded by the entrypoint). */
  settings: AppSettingsPayload;
  /** Environment overrides; defaults to process.env. */
  env?: NodeJS.ProcessEnv;
  /** Test seam: override the scheduler state repository (null disables persistence). */
  schedulerStateRepository?: SchedulerStateRepository | null;
  /** Test seam: substitute the torrent-engine factory (defaults to the real engine). */
  createTorrentManager?: (
    repository: TorrentRepository,
    paths?: TorrentRuntimePaths,
  ) => Promise<unknown>;
}

/**
 * The -arr domain services. Only instantiated in full mode; `null` in slim
 * mode, which is how the container advertises that the domains are dark.
 */
export interface ArrServices {
  torrentManager: unknown;
  indexerFactory: IndexerFactory;
  indexerTester: IndexerTester;
  indexerServiceDiscovery: Pick<IndexerServiceDiscovery, 'detect'> | { detect: () => Promise<unknown[]> };
  rssSyncService: RssSyncService;
  importListProviderRegistry: ImportListProviderRegistry;
  importListSyncService: ImportListSyncService;
  subtitleInventoryApiService: SubtitleInventoryApiService;
  subtitleProviderFactory: SubtitleProviderFactory;
  subtitleAutomationService: SubtitleAutomationService;
  variantLifecycle: VariantLifecycle;
  mediaSearchService: MediaSearchService;
  wantedService: WantedService;
  wantedSearchService: WantedSearchService;
  catalogCache: CatalogCache;
  notificationDispatchService: NotificationDispatchService;
  notificationTransportRegistry: NotificationTransportRegistry;
  seedingProtector: SeedingProtector | null;
  torrentManagerForLifecycle: unknown;
}

export interface ServiceContainer {
  readonly slim: boolean;
  readonly prisma: any;
  readonly settings: AppSettingsPayload;
  readonly eventHub: ApiEventHub;
  readonly scheduler: Scheduler;
  readonly settingsService: SettingsService;
  readonly updateService: UpdateService;
  readonly httpClient: HttpClient;
  readonly activityEventEmitter: ActivityEventEmitter;
  readonly organizer: Organizer;
  readonly importManager: ImportManager;
  readonly libraryScanService: LibraryScanService;
  readonly metadataProvider: MetadataProvider | BrowserAcceptanceMetadataProvider;
  readonly metadataRefreshService: MetadataRefreshService;
  readonly playbackService: PlaybackService;
  readonly playbackRepository: PlaybackRepository;
  readonly discoveryService: DiscoveryService;
  readonly backupService: BackupService;
  readonly systemHealthService: SystemHealthService;
  readonly mediaService: MediaService;
  readonly collectionService: CollectionService;
  readonly apiDependencies: ApiDependencies;
  /** The -arr services, or null when slim mode keeps them dark. */
  readonly arr: ArrServices | null;
  registerScheduledJobs(): void;
  initialize(): Promise<void>;
  /** Start missed-run recovery; call after the HTTP listener is up. */
  startSchedulerRecovery(): Promise<void>;
  stopBackgroundServices(): Promise<void>;
  close(): Promise<void>;
}

async function migrateOldQualityProfiles(prisma: DatabaseClient): Promise<void> {
  // Migrate legacy "UltraHD" profile (created before standardized presets) to "Ultra-HD"
  const oldProfile = await (prisma as any).qualityProfile.findUnique({ where: { name: 'UltraHD' } });
  if (!oldProfile) return;

  const newProfile = await (prisma as any).qualityProfile.findUnique({ where: { name: 'Ultra-HD' } });
  if (!newProfile) return;

  // Reassign any media using the old profile to the new one
  await Promise.all([
    (prisma as any).movie.updateMany({ where: { qualityProfileId: oldProfile.id }, data: { qualityProfileId: newProfile.id } }),
    (prisma as any).series.updateMany({ where: { qualityProfileId: oldProfile.id }, data: { qualityProfileId: newProfile.id } }),
    (prisma as any).media.updateMany({ where: { qualityProfileId: oldProfile.id }, data: { qualityProfileId: newProfile.id } }),
  ]);

  await (prisma as any).qualityProfile.delete({ where: { id: oldProfile.id } });
}

/**
 * Seeds the quality/category baseline data the full stack depends on. Slim
 * mode MUST NOT run these seeds: quality profiles and categories are -arr
 * domain data.
 */
export async function seedBaselineData(prisma: DatabaseClient): Promise<void> {
  await seedCategories(prisma);
  await seedQualityDefinitions(prisma);
  await seedQualityProfiles(prisma);
  await migrateOldQualityProfiles(prisma);
  await seedSmartDefaults(prisma);
}

/**
 * Bridges the gap between ImportManager (constructed synchronously, kept in
 * both modes) and the torrent engine (created asynchronously in
 * initialize(), full mode only). `on` subscriptions queue until the real
 * engine attaches; every other access forwards to the attached engine. In
 * slim mode no engine ever attaches and the bridge stays inert: kept routes
 * guard on `deps.torrentManager?.method`, which is undefined.
 */
function createTorrentManagerBridge(): { facade: any; attach: (target: any) => void } {
  let target: any = null;
  const pending: Array<{ event: string; listener: (payload: unknown) => void }> = [];
  const attach = (next: any): void => {
    target = next;
    for (const { event, listener } of pending) {
      next.on(event, listener);
    }
    pending.length = 0;
  };
  const facade: any = new Proxy({}, {
    get(_source, prop) {
      if (prop === 'attach') {
        return attach;
      }
      if (prop === 'then') {
        // The facade is not a thenable; guard against await confusion.
        return undefined;
      }
      if (target) {
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      }
      if (prop === 'on') {
        return (event: string, listener: (payload: unknown) => void) => {
          pending.push({ event, listener });
        };
      }
      return undefined;
    },
  });
  return { facade, attach };
}

export async function createServiceContainer(
  options: ServiceContainerOptions,
): Promise<ServiceContainer> {
  const slim = options.slim;
  const prisma: any = options.prisma;
  const settings = options.settings;
  const env = options.env ?? process.env;

  // Repositories are inert prisma wrappers; they exist in both modes.
  const activityEventRepository = new ActivityEventRepository(prisma);
  const taskExecutionsRepository = new TaskExecutionsRepository(prisma);
  const appSettingsRepository = new AppSettingsRepository(prisma);
  const collectionRepository = new CollectionRepository(prisma);
  const customFormatRepository = new CustomFormatRepository(prisma);
  const downloadClientRepository = new DownloadClientRepository(prisma);
  const importListRepository = new ImportListRepository(prisma);
  const indexerRepository = new IndexerRepository(prisma);
  const indexerHealthRepository = new IndexerHealthRepository(prisma);
  const mediaRepository = new MediaRepository(prisma);
  const notificationRepository = new NotificationRepository(prisma);
  const qualityProfileRepository = new QualityProfileRepository(prisma);
  const subtitleVariantRepository = new SubtitleVariantRepository(prisma);
  const playbackRepository = new PlaybackRepository(prisma);
  const torrentRepository = new TorrentRepository(prisma);

  // Create the event hub early so NotificationDispatchService can publish to it
  const eventHub = new ApiEventHub();

  if (!slim) {
    // Surface AI release-parser degradation instead of letting it hide. Every one of
    // these events used to be swallowed: the parser returned regex output or empty
    // slots, so a retired, rate-limited, or too-slow model was indistinguishable from a
    // healthy one. That is how the shipped default went 4-6x over its own abort deadline
    // without anyone noticing.
    onReleaseParserDegraded((event) => {
      eventHub.publish('parser:degraded', event);
    });
  }

  const activityEventEmitter = new ActivityEventEmitter(activityEventRepository);
  const scheduler = new Scheduler();
  if (options.schedulerStateRepository === undefined) {
    scheduler.setSchedulerStateRepository(appSettingsRepository);
  } else if (options.schedulerStateRepository !== null) {
    scheduler.setSchedulerStateRepository(options.schedulerStateRepository);
  }

  const httpClient = new HttpClient();
  const settingsService = new SettingsService(appSettingsRepository);
  const updateService = new UpdateService({
    currentVersion: env.npm_package_version ?? '1.0.0',
    githubRepo: env.UPDATE_GITHUB_REPO,
    stagingDir: env.UPDATE_STAGING_DIR,
  });
  const metadataProvider = env.BROWSER_ACCEPTANCE_METADATA_FIXTURE === 'true'
    ? new BrowserAcceptanceMetadataProvider(httpClient, settingsService)
    : new MetadataProvider(httpClient, settingsService);
  const collectionService = new CollectionService(prisma, httpClient, settingsService);
  const playbackService = new PlaybackService(
    prisma,
    playbackRepository,
    settingsService,
  );
  const organizer = new Organizer();
  const libraryScanService = new LibraryScanService(prisma);
  const discoveryService = new DiscoveryService();

  // Derive db path from database URL (strip "file:" prefix)
  const dbFilePath = options.databaseUrl.replace(/^file:/, '');
  const backupDir = env.BACKUP_DIR ?? path.resolve(path.dirname(dbFilePath), 'backups');
  const backupService = new BackupService(dbFilePath, backupDir);
  const systemHealthService = new SystemHealthService(prisma);
  const mediaService = new MediaService(prisma, metadataProvider, activityEventEmitter);

  // Artwork/overview backfill is a kept service: it repairs metadata that a
  // filesystem scan cannot know, and it runs in slim mode too.
  const metadataRefreshService = new MetadataRefreshService(prisma, metadataProvider as MetadataProvider);

  // ImportManager is a kept service (deterministic library backstop). It only
  // subscribes to torrent events, so slim mode passes null: there is no
  // torrent engine and nothing to listen to.
  const torrentManagerBridge = createTorrentManagerBridge();

  let arr: ArrServices | null = null;
  let variantImportHooks: { onMovieImported?: (movieId: number) => Promise<void> | void; onEpisodeImported?: (episodeId: number) => Promise<void> | void } = {};
  let importNotificationDispatch: NotificationDispatchService | undefined;

  if (!slim) {
    const notificationTransportRegistry = new NotificationTransportRegistry();
    const notificationDispatchService = new NotificationDispatchService(
      eventHub,
      notificationRepository,
      notificationTransportRegistry,
    );

    // Import list providers
    const importListProviderRegistry = new ImportListProviderRegistry();
    importListProviderRegistry.registerProvider(new TMDBPopularProvider(httpClient, settingsService));
    importListProviderRegistry.registerProvider(new TMDBListProvider(httpClient, settingsService));

    const importListSyncService = new ImportListSyncService(
      prisma,
      importListRepository,
      mediaRepository,
      importListProviderRegistry,
    );

    const variantBackfillService = new VariantBackfillService(
      prisma,
      subtitleVariantRepository,
    );
    const variantInventoryIndexer = new VariantInventoryIndexer(
      subtitleVariantRepository,
      new ProbeMetadataParser(),
      new FfprobeMetadataProbe(),
    );
    const catalogCache = new CatalogCache();

    const definitionLoader = new DefinitionLoader();
    const definitionsPath = env.DEFINITIONS_PATH ?? path.resolve(process.cwd(), 'server/definitions');
    let definitions: Awaited<ReturnType<DefinitionLoader['loadFromDirectory']>> = [];
    try {
      definitions = await definitionLoader.loadFromDirectory(definitionsPath);
      console.log(`Loaded ${definitions.length} indexer definitions from ${definitionsPath}`);
    } catch (error) {
      console.warn(`Failed to load indexer definitions from ${definitionsPath}:`, error);
    }
    const indexerFactory = new IndexerFactory(definitions, httpClient);
    const rssSyncService = new RssSyncService(
      prisma,
      httpClient,
      indexerHealthRepository,
      indexerFactory,
    );

    const indexerTester = new IndexerTester(
      httpClient,
      indexerHealthRepository,
      activityEventEmitter,
    );

    const browserAcceptanceAcquisitionFixture = env.BROWSER_ACCEPTANCE_ACQUISITION_FIXTURE === 'true';
    const fixtureIndexer = browserAcceptanceAcquisitionFixture ? new BrowserAcceptanceIndexer(httpClient) : null;

    const mediaSearchService = new MediaSearchService(
      (fixtureIndexer ? { findAllEnabled: async () => [{ id: fixtureIndexer.id, name: fixtureIndexer.name, implementation: fixtureIndexer.implementation, protocol: fixtureIndexer.protocol, enabled: true, priority: fixtureIndexer.priority, supportsRss: false, supportsSearch: true, settings: {} }] } : indexerRepository) as any,
      (fixtureIndexer ? { fromDatabaseRecord: () => fixtureIndexer } : indexerFactory) as any,
      torrentManagerBridge.facade,
      activityEventEmitter,
      customFormatRepository,
      notificationDispatchService,
      eventHub,
    );

    const openSubtitlesProvider = new OpenSubtitlesProvider(httpClient, settingsService);
    const assrtProvider = new AssrtProvider(httpClient, settingsService);
    const subdlProvider = new SubdlProvider(httpClient, settingsService);
    const browserAcceptanceSubtitleFixture = env.BROWSER_ACCEPTANCE_SUBTITLE_FIXTURE === 'true';

    const manualSubtitleProvider = env.MANUAL_SUBTITLE_PROVIDER?.toLowerCase() ?? 'opensubtitles';

    const subtitleProviderFactory = new SubtitleProviderFactory(
      {
        opensubtitles: openSubtitlesProvider,
        assrt: assrtProvider,
        subdl: subdlProvider,
        ...(browserAcceptanceSubtitleFixture
          ? { 'browser-acceptance': new BrowserAcceptanceSubtitleProvider() }
          : {}),
      },
      () => ({ manualProvider: manualSubtitleProvider }),
      {
        embedded: 'Embedded subtitle extraction is not available',
      },
    );

    const subtitleInventoryApiService = new SubtitleInventoryApiService(
      subtitleVariantRepository,
      new SubtitleNamingService(),
      subtitleProviderFactory,
      new SubtitleScoringService(),
      activityEventEmitter,
    );

    const subtitleMissingService = new VariantMissingSubtitleService(subtitleVariantRepository);
    const subtitleWantedService = new VariantWantedService(subtitleVariantRepository);
    const subtitleFetchService = new VariantSubtitleFetchService(
      subtitleVariantRepository,
      new SubtitleNamingService(),
      activityEventEmitter,
    );
    const subtitleFetchProvider = new ProviderBackedSubtitleFetchProvider(
      subtitleProviderFactory,
      new SubtitleScoringService(),
    );
    const subtitleAutomationService = new SubtitleAutomationService(
      subtitleVariantRepository,
      settingsService,
      subtitleMissingService,
      subtitleWantedService,
      subtitleFetchService,
      subtitleFetchProvider,
      () => subtitleProviderFactory.resolveAllManualProviders().length,
    );
    const variantLifecycle = createVariantLifecycle(
      variantBackfillService,
      subtitleVariantRepository,
      variantInventoryIndexer,
      subtitleAutomationService,
      catalogCache,
    );

    variantImportHooks = variantLifecycle.importHooks;
    importNotificationDispatch = notificationDispatchService;

    const wantedService = new WantedService(prisma);
    const wantedSearchService = new WantedSearchService(
      mediaSearchService,
      prisma,
      activityEventEmitter,
      async () => (await indexerRepository.findAll()).filter((indexer: any) => indexer.enabled !== false).length,
    );

    const indexerServiceDiscovery = browserAcceptanceAcquisitionFixture
      ? { detect: async () => [] }
      : new IndexerServiceDiscovery({ probeTimeoutMs: 2_000 });

    arr = {
      torrentManager: torrentManagerBridge.facade,
      indexerFactory,
      indexerTester,
      indexerServiceDiscovery,
      rssSyncService,
      importListProviderRegistry,
      importListSyncService,
      subtitleInventoryApiService,
      subtitleProviderFactory,
      subtitleAutomationService,
      variantLifecycle,
      mediaSearchService,
      wantedService,
      wantedSearchService,
      catalogCache,
      notificationDispatchService,
      notificationTransportRegistry,
      seedingProtector: null,
      torrentManagerForLifecycle: null,
    };
  }

  const importManager = new ImportManager(
    slim ? null : torrentManagerBridge.facade,
    organizer,
    prisma,
    activityEventEmitter,
    variantImportHooks,
    importNotificationDispatch,
  );

  const apiDependencies: ApiDependencies = slim
    ? {
        prisma,
        eventHub,
        mediaService,
        settingsService,
        activityEventRepository,
        taskExecutionsRepository,
        notificationRepository,
        qualityProfileRepository,
        downloadClientRepository,
        customFormatRepository,
        metadataProvider,
        importListRepository,
        collectionRepository,
        collectionService,
        scheduler,
        logReaderService: globalLogBuffer,
        backupService,
        libraryScanService,
        metadataRefreshService,
        systemHealthService,
        updateService,
        importManager,
        playbackService,
        mediaRepository,
      }
    : {
        prisma,
        eventHub,
        mediaService,
        mediaSearchService: arr!.mediaSearchService,
        searchAggregationService: arr!.mediaSearchService,
        wantedService: arr!.wantedService,
        wantedSearchService: arr!.wantedSearchService,
        torrentManager: torrentManagerBridge.facade as any,
        importManager,
        indexerRepository,
        mediaRepository,
        indexerTester: arr!.indexerTester,
        indexerFactory: arr!.indexerFactory,
        indexerServiceDiscovery: arr!.indexerServiceDiscovery as any,
        subtitleInventoryApiService: arr!.subtitleInventoryApiService,
        subtitleProviderFactory: arr!.subtitleProviderFactory,
        subtitleAutomationService: arr!.subtitleAutomationService,
        ...arr!.variantLifecycle.apiDependencies,
        playbackService,
        settingsService,
        activityEventRepository,
        taskExecutionsRepository,
        indexerHealthRepository,
        notificationRepository,
        notificationTransportRegistry: arr!.notificationTransportRegistry,
        qualityProfileRepository,
        downloadClientRepository,
        customFormatRepository,
        metadataProvider,
        importListRepository,
        importListProviderRegistry: arr!.importListProviderRegistry,
        importListSyncService: arr!.importListSyncService,
        collectionRepository,
        collectionService,
        scheduler,
        logReaderService: globalLogBuffer,
        backupService,
        libraryScanService,
        metadataRefreshService,
        systemHealthService,
        updateService,
        catalogCache: arr!.catalogCache,
      };

  const registerScheduledJobs = (): void => {
    if (arr) {
      const rssInterval = settings.schedulerIntervals.rssSyncMinutes;
      const rssCron = `*/${rssInterval} * * * *`;

      try {
        scheduler.schedule('rss-sync', rssCron, async () => {
          console.log('Starting scheduled RSS sync...');
          await arr!.rssSyncService.sync();
          console.log('RSS sync completed');
        });
        console.log(`Scheduler started. RSS Sync scheduled for every ${rssInterval} minutes (${rssCron}).`);
      } catch (error) {
        console.error('Failed to schedule RSS sync:', error);
      }

      // Schedule import list sync every 6 hours
      try {
        scheduler.schedule('import-list-sync', '0 */6 * * *', async () => {
          console.log('Starting scheduled import list sync...');
          const results = await arr!.importListSyncService.syncAllEnabled();
          let totalAdded = 0;
          for (const [, result] of results) {
            totalAdded += result.added;
          }
          console.log(`Import list sync completed. Added ${totalAdded} items across ${results.size} lists.`);
        });
        console.log('Import list sync scheduled for every 6 hours.');
      } catch (error) {
        console.error('Failed to schedule import list sync:', error);
      }

      const wantedSearchInterval = settings.schedulerIntervals.wantedSearchMinutes;
      const wantedSearchCron = `*/${wantedSearchInterval} * * * *`;
      scheduler.scheduleWantedSearch(arr.wantedSearchService, 'wanted-search', wantedSearchCron);
      console.log(`Wanted search scheduled every ${wantedSearchInterval} minutes (${wantedSearchCron}).`);
      const subtitleScanInterval = Math.max(5, settings.schedulerIntervals.availabilityCheckMinutes);
      const subtitleScanCron = `*/${subtitleScanInterval} * * * *`;
      scheduler.scheduleSubtitleWantedSearch(
        { runAutomationCycle: () => arr!.subtitleAutomationService.runTargetedAutomationCycle({ recentDays: 7 }) },
        'subtitle-wanted-search',
        subtitleScanCron,
      );

      // Alignment is deterministic and idempotent; bounded per 15-minute cycle. The host has CPU
      // headroom (load ~1.4 on 4 threads while YouTube downloads), and the ledger/hash fixes removed the
      // wasted re-alignments, so this cadence roughly doubles the background pass rate.
      const subtitleSyncService = new SubtitleSyncService({
        statePath: path.join(env.CONFIG_DIR ?? path.dirname(options.databaseUrl.replace(/^file:/, '')), 'subtitle-sync-state.json'),
        candidates: async () => {
          const [movies, episodes] = await Promise.all([
            prisma.movie.findMany({ where: { path: { not: null } }, select: { path: true } }),
            prisma.episode.findMany({ where: { path: { not: null } }, select: { path: true } }),
          ]);
          const found: Array<{ videoPath: string; srtPath: string }> = [];
          for (const row of [...movies, ...episodes]) {
            const videoPath = row.path;
            if (!videoPath) continue;
            const base = videoPath.replace(/\.[^.\\/]+$/, '');
            for (const ext of ['.zho.srt', '.zh.srt']) {
              const srtPath = base + ext;
              if (existsSync(srtPath)) {
                found.push({ videoPath, srtPath });
                break;
              }
            }
          }
          return found;
        },
        aligner: new FfsubsyncAligner(),
      });
      // FR-17: every exposed Chinese sidecar must be bilingual EN+ZH.
      const translators = [];
      if (env.XIAOMI_API_KEY) translators.push(new XiaomiTranslator({ apiKey: env.XIAOMI_API_KEY }));
      const minimaxKey = env.MINIMAX_API_KEY ?? env.MINIMAX_CN_API_KEY;
      if (minimaxKey) translators.push(new MiniMaxTranslator({ apiKey: minimaxKey }));
      const rawTranslator = translators.length > 0 ? new FallbackTranslator(translators) : null;
      // Hard deadline around the translator chain.
      //
      // The provider requests carry no timeout of their own, and a hung socket
      // left `bilingual-subs` RUNNING for 17+ minutes (observed 2026-11-08,
      // an ESTABLISHED connection to the provider with no progress), blocking
      // that scheduled slot until the next restart. Failing the translation
      // lets the cycle record the file and move on.
      const TRANSLATE_TIMEOUT_MS = 120_000;
      const translator = rawTranslator
        ? {
            translate: (cues: string[]) => Promise.race([
              rawTranslator.translate(cues),
              new Promise<never>((_resolve, reject) => {
                const timer = setTimeout(
                  () => reject(new Error(`translation timed out after ${TRANSLATE_TIMEOUT_MS} ms`)),
                  TRANSLATE_TIMEOUT_MS,
                );
                timer.unref?.();
              }),
            ]),
          }
        : null;
      const bilingualService = new BilingualSubtitleService({
        statePath: path.join(env.CONFIG_DIR ?? path.dirname(options.databaseUrl.replace(/^file:/, '')), 'bilingual-state.json'),
        translator,
        candidates: async () => {
          // Scan only the configured media roots. Walking all of /data pinned
          // the event loop for minutes on 2026-11-07: the tree there is ~17k
          // directories / 90k files (Downloads, Backups, archive folders) and
          // every request was starved while it ran.
          const configured = [
            settings.mediaManagement.movieRootFolder,
            settings.mediaManagement.tvRootFolder,
          ].filter((value): value is string => typeof value === 'string' && value.length > 0);
          const roots = configured.length > 0
            ? [...new Set(configured)]
            : [env.MEDIA_DIR ?? '/data'];

          const found: string[] = [];
          const MAX_ENTRIES = 50_000;
          const MAX_FILES = 4_000;
          const SKIP_DIRECTORIES = new Set([
            'downloads', 'backup', 'backups', '#recycle', '@eadir', '.git',
            'node_modules', '.trash', '$recycle.bin', 'system volume information',
          ]);
          let scanned = 0;
          let budgetHit = false;

          const walk = async (dir: string): Promise<void> => {
            if (budgetHit || found.length >= MAX_FILES) {
              budgetHit = true;
              return;
            }
            let entries;
            try {
              entries = await readdir(dir, { withFileTypes: true });
            } catch {
              return;
            }
            for (const entry of entries) {
              if (found.length >= MAX_FILES) { budgetHit = true; return; }
              scanned += 1;
              if (scanned >= MAX_ENTRIES) { budgetHit = true; return; }
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                if (SKIP_DIRECTORIES.has(entry.name.toLowerCase())) continue;
                await walk(full);
              } else if (/\.(zho|zh)\.srt$/i.test(entry.name)
                && !/\.(orig|bak|tmp|sync|verify)$/i.test(entry.name)
                && !/\.(sync|verify|bilingual)\./i.test(entry.name)) {
                found.push(full);
              }
            }
          };
          for (const root of roots) {
            await walk(root);
            if (budgetHit) break;
          }
          if (budgetHit) {
            console.warn(
              `Bilingual scan stopped at its budget (${scanned} entries, ${found.length} sidecars); `
              + 'the remainder is picked up next cycle',
            );
          }
          // Highest viewing priority first, not filesystem order (track
          // feature_subtitle_coverage_priority_20261108). Any failure here degrades to the unordered
          // list — the cycle must never stop because the ordering query failed.
          try {
            const [tracks, variants, progressRows] = await Promise.all([
              prisma.variantSubtitleTrack.findMany(),
              prisma.mediaFileVariant.findMany(),
              prisma.playbackProgress.findMany(),
            ]);
            const mediaByPath = new Map<string, { kind: 'movie' | 'episode'; id: number; addedAt: Date | null }>();
            const mediaByVariant = new Map<number, { kind: 'movie' | 'episode'; id: number }>();
            for (const variant of variants as Array<{ id: number; movieId: number | null; episodeId: number | null }>) {
              if (variant.movieId != null) mediaByVariant.set(variant.id, { kind: 'movie', id: variant.movieId });
              else if (variant.episodeId != null) mediaByVariant.set(variant.id, { kind: 'episode', id: variant.episodeId });
            }
            for (const track of tracks as Array<{ variantId: number; filePath: string | null }>) {
              if (!track.filePath) continue;
              const media = mediaByVariant.get(track.variantId);
              if (media) mediaByPath.set(track.filePath, { ...media, addedAt: null });
            }
            const movies = new Map<number, { mediaId: number; progress: number; isWatched: boolean; lastWatched: Date | null }>();
            const episodes = new Map<number, { mediaId: number; progress: number; isWatched: boolean; lastWatched: Date | null }>();
            for (const row of progressRows as Array<{ mediaType: string; mediaId: number; progress: number; isWatched: unknown; lastWatched: unknown }>) {
              const snapshot = {
                mediaId: row.mediaId,
                progress: Number(row.progress ?? 0),
                isWatched: row.isWatched === true || row.isWatched === 1,
                lastWatched: row.lastWatched == null
                  ? null
                  : row.lastWatched instanceof Date
                    ? row.lastWatched
                    : new Date(Number(row.lastWatched) * 1000),
              };
              const target = row.mediaType === 'MOVIE' ? movies : episodes;
              const current = target.get(row.mediaId);
              if (!current || (snapshot.lastWatched?.getTime() ?? 0) > (current.lastWatched?.getTime() ?? 0)) {
                target.set(row.mediaId, snapshot);
              }
            }
            const orderedPaths = orderSubtitlePathsByPriority(found, (candidate) => mediaByPath.get(candidate) ?? null, {
              movies,
              episodes,
            });
            console.info(
              `[bilingual-subs] ${orderedPaths.length} sidecar(s) ordered by viewing priority `
              + `(${mediaByPath.size} mapped to media)`,
            );
            return orderedPaths;
          } catch (error) {
            console.warn('[bilingual-subs] priority ordering unavailable, using scan order:', error);
            return found;
          }
        },
      });
      // Guard the cycle: two overlapping runs were observed on 2026-11-07 and
      // each re-walked the library, doubling CPU and stalling requests.
      let bilingualCycleRunning = false;
      scheduler.schedule('bilingual-subs', '15 */2 * * *', async () => {
        if (bilingualCycleRunning) {
          console.warn('Bilingual cycle skipped: the previous cycle is still running');
          return;
        }
        bilingualCycleRunning = true;
        try {
          const result = await bilingualService.runCycle({ limit: 3 });
          console.log(
            `Bilingual cycle: scanned ${result.scanned}, bilingual ${result.bilingual}, merged ${result.merged}, `
            + `translated ${result.translated}, flagged ${result.flagged}, failed ${result.failed}`,
          );
        } finally {
          bilingualCycleRunning = false;
        }
      });

      scheduler.schedule('subtitle-sync', '*/15 * * * *', async () => {
        const result = await subtitleSyncService.runCycle({ limit: 5 });
        console.log(
          `Subtitle sync cycle: scanned ${result.scanned}, aligned ${result.aligned}, skipped ${result.skipped}, failed ${result.failed}`,
        );
      });
    }

    try {
      scheduler.scheduleLibraryScan(
        libraryScanService,
        settingsService,
        'library-scan',
        undefined,
        async () => {
          const summary = await metadataRefreshService.refreshAll();
          console.log(
            `Metadata refresh completed: ${summary.moviesRefreshed} movie(s), ${summary.seriesRefreshed} series refreshed, ${summary.failures} failure(s).`,
          );
        },
      );
      console.log('Library scan scheduled daily at 2 AM.');

      // Series folders on disk that the scan never registers are invisible
      // forever (scanEpisodes only validates known rows). This closes the loop
      // by importing them through the same pipeline as "Import Existing".
      const folderImportService = new LibraryFolderImportService(
        prisma,
        metadataProvider as any,
      );
      const episodeThumbnailService = new EpisodeThumbnailService(prisma);
      scheduler.schedule('episode-thumbnails', '*/10 * * * *', async () => {
        const result = await episodeThumbnailService.generateMissing(40);
        if (result.generated > 0 || result.failed > 0) {
          console.log(
            `Episode thumbnails: generated ${result.generated}, skipped ${result.skipped}, failed ${result.failed}`,
          );
        }
      });

      const youtubeRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
      const configDir = process.env.CONFIG_DIR ?? '/config';

      // A process that died mid-download leaves rows DOWNLOADING forever, and nothing retries them
      // until the 30-minute stale guard inside downloadPending. After a restart no process owns any
      // claim, so clear them all once at boot (2026-11-09: four claims survived two restarts).
      void (async () => {
        try {
          const reset = await prisma.drizzle
            .update(dbSchema.youtubeVideos)
            .set({ status: 'PENDING' })
            .where(eq(dbSchema.youtubeVideos.status, 'DOWNLOADING'));
          const changes = (reset as { changes?: number }).changes ?? 0;
          if (changes > 0) console.log(`YouTube: reset ${changes} stale DOWNLOADING claim(s) at boot`);
        } catch (error) {
          console.warn('YouTube: could not reset stale DOWNLOADING claims:', error);
        }
      })();

      scheduler.schedule('subtitle-wanted-priority', '30 6 * * *', async () => {
        const result = await queuePriorityWanted(prisma.drizzle, {
          configDir: process.env.CONFIG_DIR ?? '/config',
          days: 14,
          limit: 200,
        });
        console.log(
          `Priority subtitle wanted: ${result.variants} variants, queued en ${result.queuedEn}, zho ${result.queuedZho}`,
        );
      });

      scheduler.schedule('subtitle-coverage', '15 6 * * *', async () => {
        const snapshot = await snapshotCoverage(prisma.drizzle, {
          configDir: process.env.CONFIG_DIR ?? '/config',
          days: 14,
          limit: 100,
        });
        console.log(
          `Subtitle coverage: ${snapshot.items.length} priority items, `
          + `dual ${snapshot.counts.dual}, zho-only ${snapshot.counts['zho-only']}, `
          + `en-only ${snapshot.counts['en-only']}, none ${snapshot.counts.none}`,
        );
      });

      scheduler.schedule('adult-thumbnails', '*/10 * * * *', async () => {
        const rows = await prisma.drizzle
          .select({ id: dbSchema.adultItems.id, path: dbSchema.adultItems.path })
          .from(dbSchema.adultItems)
          .orderBy(asc(dbSchema.adultItems.id));
        const result = await generateMissingAdultThumbnails({
          rows,
          thumbnails: new AdultThumbnailService(),
          limit: 8,
        });
        if (result.generated > 0 || result.failures.length > 0) {
          console.log(
            `Adult thumbnails: generated ${result.generated}, `
            + `failed ${result.failures.length}, scanned ${result.scanned}`,
          );
        }
      });

      scheduler.schedule('staging-tidy', '30 4 * * *', async () => {
        const candidates = await planTidy();
        if (candidates.length === 0) return;
        const result = await applyTidy(candidates);
        console.log(
          `Staging tidy: deleted ${result.deleted} abandoned file(s), ${result.bytes} bytes`
          + (result.failed.length > 0 ? `, failed ${result.failed.length}` : ''),
        );
      });

      scheduler.schedule('music-nightly-receipt', '10 5 * * *', async () => {
        const drizzle = prisma.drizzle;
        // Every music table is a plain SQLite table; one count helper avoids three typed variants.
        const countRows = async (table: any): Promise<number> => {
          const rows = await drizzle.select({ n: sql<number>`count(*)` }).from(table);
          return Number(rows[0]?.n ?? 0);
        };
        const [tracks, artists, albums] = await Promise.all([
          countRows(dbSchema.musicTracks),
          countRows(dbSchema.musicArtists),
          countRows(dbSchema.musicAlbums),
        ]);
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const ingests = (await readIngestReceipts(configDir, 500))
          .filter((receipt) => Date.parse(receipt.at) >= weekAgo);
        const receipt = buildNightlyReceipt({ tracks, artists, albums, ingests });
        await appendNightlyReceipt(configDir, receipt);
        console.log(
          `Music nightly receipt: tracks ${tracks}, artists ${artists}, albums ${albums}, `
          + `ingests ${receipt.ingests.attempted} (failed ${receipt.ingests.failed})`,
        );
      });

      scheduler.schedule('youtube-poll', '20 * * * *', async () => {
        const receipt = await pollAllSubscriptions(prisma.drizzle, { configDir });
        console.log(
          `YouTube poll: ${receipt.subscriptions} subscriptions, queued ${receipt.queued}, `
          + `failures ${receipt.failures}`,
        );
      });

      scheduler.schedule('youtube-download', '*/20 * * * *', async () => {
        const receipt = await downloadPending(prisma.drizzle, {
          configDir,
          mediaRoot: youtubeRoot,
          // Measured 2026-11-09: a 4-item batch of 1080p60 sources (each needing a libx264 encode on
          // this CPU) ran 35+ min, so the job outlived its 20-minute slot and history only showed
          // restart-failed rows. 2 keeps a batch inside one slot and produces a receipt each cycle;
          // throughput is unchanged because the scheduler serialises the job anyway.
          limit: 2,
          onFailure: (failure) => importNotificationDispatch?.notifyYoutubeFailure(failure),
        });
        if (receipt.attempted > 0 || receipt.failed.length > 0) {
          console.log(
            `YouTube download: attempted ${receipt.attempted}, downloaded ${receipt.downloaded}, `
            + `failed ${receipt.failed.length}`,
          );
        }
      });

      scheduler.schedule('youtube-retention', '45 5 * * *', async () => {
        const mediaRoot = process.env.YOUTUBE_DIR ?? '/data/Youtube';
        const receipt = await runRetention(prisma.drizzle, {
          configDir,
          mediaRoot,
          quarantineRoot: process.env.QUARANTINE_DIR ?? `${mediaRoot}/_quarantine`,
          dryRun: false,
        });
        console.log(
          `YouTube retention: ${receipt.candidates} candidates, moved ${receipt.moved.length}, `
          + `failed ${receipt.failed.length}`,
        );
      });

      scheduler.schedule('folder-import', '40 2 * * *', async () => {
        const settings = await settingsService.get();
        const result = await folderImportService.run({
          movieRootFolder: settings.mediaManagement.movieRootFolder,
          tvRootFolder: settings.mediaManagement.tvRootFolder,
        });
        console.log(
          `Folder import: scanned ${result.foldersScanned}, skipped ${result.foldersSkipped}, `
          + `imported ${result.imported}, failed ${result.failed}`
          + (result.unmatched.length > 0 ? `, unmatched ${result.unmatched.join(', ')}` : ''),
        );
      });
    } catch (error) {
      console.error('Failed to schedule library scan:', error);
    }

    try {
      scheduler.schedule('auto-update-check', '0 4 * * *', async () => {
        const latestSettings = await settingsService.get();
        if (!latestSettings.update.autoUpdateEnabled) {
          return;
        }

        const check = await updateService.checkForUpdate({
          branch: latestSettings.update.branch,
        });

        if (!check.updateAvailable || !check.release) {
          return;
        }

        await updateService.downloadUpdate({
          version: check.release.version,
        });
        console.log(`Auto-update download completed for ${check.release.version}`);
      });
      console.log('Auto-update check scheduled daily at 4 AM (download-only when enabled).');
    } catch (error) {
      console.error('Failed to schedule auto-update check:', error);
    }
  };

  let backgroundServicesStopped = false;
  let initialized = false;

  const stopBackgroundServices = async (): Promise<void> => {
    if (backgroundServicesStopped) {
      return;
    }
    backgroundServicesStopped = true;
    if (arr?.seedingProtector) {
      arr.seedingProtector.stop();
    }
    arr?.variantLifecycle.close();
    const torrentManager = arr?.torrentManagerForLifecycle;
    if (torrentManager && (torrentManager as any).destroy) {
      await (torrentManager as any).destroy();
    }
  };

  const container: ServiceContainer = {
    slim,
    prisma,
    settings,
    eventHub,
    scheduler,
    settingsService,
    updateService,
    httpClient,
    activityEventEmitter,
    organizer,
    importManager,
    libraryScanService,
    metadataProvider,
    metadataRefreshService,
    playbackService,
    playbackRepository,
    discoveryService,
    backupService,
    systemHealthService,
    mediaService,
    collectionService,
    apiDependencies,
    arr,
    registerScheduledJobs,
    initialize: async (): Promise<void> => {
      if (initialized) {
        return;
      }
      initialized = true;

      await new DataDirectoryInitializer(resolveRequiredDataDirectories({
        mediaDir: env.MEDIA_DIR ?? '/data',
        incompleteDirectory: settings.torrentLimits.incompleteDirectory,
        completeDirectory: settings.torrentLimits.completeDirectory,
        movieRootFolder: settings.mediaManagement.movieRootFolder,
        tvRootFolder: settings.mediaManagement.tvRootFolder,
      })).initialize();

      // Library containers (kind + root) for the shared foundation: Movies/TV from settings, Adult
      // from adultRootFolder. Idempotent and additive; movies/TV queries are unaffected.
      try {
        // The generic client accessors do not expose the new tables yet; use drizzle directly for
        // this boot-time seeding (three tiny statements, no relations needed).
        const libraryDb = {
          library: {
            findMany: () => prisma.drizzle.select().from(dbSchema.libraries),
            create: async ({ data }: { data: Record<string, unknown> }) =>
              (await prisma.drizzle.insert(dbSchema.libraries).values(data).returning())[0],
            update: async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
              await prisma.drizzle.update(dbSchema.libraries).set(data).where(eq(dbSchema.libraries.id, where.id));
            },
          },
        };
        const libraries = await ensureLibraryRegistry(libraryDb, {
          movieRootFolder: settings.mediaManagement.movieRootFolder,
          tvRootFolder: settings.mediaManagement.tvRootFolder,
          adultRootFolder: settings.mediaManagement.adultRootFolder,
        });
        console.info(`[boot] libraries: ${libraries.map((row) => `${row.kind}${row.enabled ? '' : ' (off)'}`).join(', ')}`);
      } catch (error) {
        console.warn('[boot] library registry seeding failed:', error);
      }

      if (arr) {
        const browserAcceptanceAcquisitionFixture = env.BROWSER_ACCEPTANCE_ACQUISITION_FIXTURE === 'true';
        const createTorrentManager = options.createTorrentManager ?? createRuntimeTorrentManager;
        const torrentManager: any = browserAcceptanceAcquisitionFixture
          ? new BrowserAcceptanceTorrentManager(torrentRepository, {
              incompleteDirectory: settings.torrentLimits.incompleteDirectory,
              completeDirectory: settings.torrentLimits.completeDirectory,
              sourceFile: env.BROWSER_ACCEPTANCE_ACQUISITION_SOURCE_FILE,
              completionDelayMs: Number.parseInt(
                env.BROWSER_ACCEPTANCE_COMPLETION_DELAY_MS ?? '',
                10,
              ) || undefined,
            })
          : await createTorrentManager(torrentRepository, {
              incomplete: settings.torrentLimits.incompleteDirectory,
              complete: settings.torrentLimits.completeDirectory,
              seedRatioLimit: settings.torrentLimits.seedRatioLimit,
              seedTimeLimitMinutes: settings.torrentLimits.seedTimeLimitMinutes,
              seedLimitAction: settings.torrentLimits.seedLimitAction,
              maxActiveDownloads: settings.torrentLimits.maxActiveDownloads,
            });
        if (browserAcceptanceAcquisitionFixture) {
          await torrentManager.initialize();
        }
        torrentManagerBridge.attach(torrentManager);

        const seedingProtector = new SeedingProtector(torrentManager as any, torrentRepository, prisma as any);
        torrentManager.setPrisma?.(prisma as any);
        seedingProtector.start();

        // Initialize background automation services
        new RssMediaMonitor(arr.rssSyncService, torrentManager, prisma, metadataProvider, customFormatRepository);

        await arr.variantLifecycle.start();

        await arr.catalogCache.load();
        arr.catalogCache.watch();

        arr.seedingProtector = seedingProtector;
        arr.torrentManagerForLifecycle = torrentManager;
      }

      registerScheduledJobs();
      // Recovery of missed runs is deliberately deferred until after app.listen():
      // a missed library scan must not delay the HTTP listener (2026-11-07).
    },
    startSchedulerRecovery: async (): Promise<void> => {
      try {
        await scheduler.start();
      } catch (error) {
        console.error('Scheduler recovery failed:', error);
      }
    },
    stopBackgroundServices,
    close: async (): Promise<void> => {
      await stopBackgroundServices();
      if (prisma && typeof prisma.$disconnect === 'function') {
        await prisma.$disconnect();
      }
    },
  };

  return container;
}
