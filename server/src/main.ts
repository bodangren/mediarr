import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';
import { assertValidEncryptionKey, preparePersistentStorage } from './config/startup';
import { resolveJellyfinConfig } from './config/jellyfin';
import { loadOrCreateJellyfinServerId } from './jellyfin/serverIdentity';
import { DatabaseClient } from './db/drizzleClient';
import { describeMigrationState, runMigrations } from './db/migrationRunner';
import { repairMalformedJsonColumns } from './maintenance/repairJsonColumns';
import { createApiServer } from './api/createApiServer';
import { createJellyfinServer } from './api/createJellyfinServer';
import { JellyfinDiscoveryService, resolveLanAddress } from './services/JellyfinDiscoveryService';
import { registerStaticServing } from './api/staticServing';
import { CatalogCache } from './services/indexers/CatalogCache';
import { DefinitionLoader } from './indexers/DefinitionLoader';
import { IndexerFactory } from './indexers/IndexerFactory';
import { HttpClient } from './indexers/HttpClient';
import { IndexerTester } from './indexers/IndexerTester';
import { ActivityEventRepository } from './repositories/ActivityEventRepository';
import { TaskExecutionsRepository } from './repositories/TaskExecutionsRepository';
import {
  AppSettingsRepository,
  DEFAULT_APP_SETTINGS,
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
import { createRuntimeTorrentManager } from './services/createRuntimeTorrentManager';
import {
  ImportListProviderRegistry,
  ImportListSyncService,
  TMDBListProvider,
  TMDBPopularProvider,
} from './services/importLists';
import { MediaSearchService } from './services/MediaSearchService';
import { MediaService } from './services/MediaService';
import { MetadataProvider } from './services/MetadataProvider';
import { PlaybackService } from './services/PlaybackService';
import { OpenSubtitlesProvider } from './services/providers/OpenSubtitlesProvider';
import { AssrtProvider } from './services/providers/AssrtProvider';
import { SubdlProvider } from './services/providers/SubdlProvider';
import { RssSyncService } from './services/RssSyncService';
import { Scheduler } from './services/Scheduler';
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
import { createVariantLifecycle } from './services/VariantLifecycle';
import { WantedService } from './services/WantedService';
import { WantedSearchService } from './services/WantedSearchService';
import { RssMediaMonitor } from './services/RssMediaMonitor';
import { BackupService } from './services/BackupService';
import { LibraryScanService } from './services/LibraryScanService';
import { globalLogBuffer } from './services/LogReaderService';
import { NotificationDispatchService } from './services/NotificationDispatchService';
import { NotificationTransportRegistry } from './services/notifications/NotificationTransportRegistry';
import { SeedingProtector } from './services/SeedingProtector';
import { SystemHealthService } from './services/SystemHealthService';
import { UpdateService } from './services/updates/UpdateService';
import { ApiEventHub } from './api/eventHub';
import { onReleaseParserDegraded } from './services/ReleaseParser';

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) {
    return fallback;
  }

  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

async function ensureBaselineData(prisma: DatabaseClient): Promise<void> {
  await seedCategories(prisma);
  await seedQualityDefinitions(prisma);
  await seedQualityProfiles(prisma);
  await migrateOldQualityProfiles(prisma);
  await seedSmartDefaults(prisma);
}

async function resolveDatabaseUrl(configuredUrl: string | undefined): Promise<string> {
  const databaseUrl = configuredUrl ?? 'file:/config/mediarr.db';
  return preparePersistentStorage({
    databaseUrl,
    configDir: process.env.NODE_ENV === 'production' ? process.env.CONFIG_DIR : undefined,
  });
}

async function startApi(): Promise<void> {
  // Install global log buffer before any other output
  globalLogBuffer.install();

  assertValidEncryptionKey(process.env.ENCRYPTION_KEY);
  const databaseUrl = await resolveDatabaseUrl(process.env.DATABASE_URL);

  // Migrations must complete before anything opens the schema, and before the
  // server can bind and serve requests against a half-migrated database. The
  // container entrypoint also runs this, but a bare-metal `npm run start:api`
  // has no other migration step, so startup owns it.
  const migrationState = describeMigrationState(databaseUrl, process.cwd());
  if (migrationState.pending.length > 0) {
    console.log(
      `Applying ${migrationState.pending.length} pending migration(s): ${migrationState.pending.join(', ')}`,
    );
    runMigrations(databaseUrl, { projectRoot: process.cwd() });
  }
  console.log(
    `Database schema at ${describeMigrationState(databaseUrl, process.cwd()).current ?? 'baseline'} (0 pending).`,
  );

  const port = parsePort(process.env.API_PORT, 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const jellyfinConfig = resolveJellyfinConfig({
    ...(process.env.JELLYFIN_ENABLED === undefined ? {} : { JELLYFIN_ENABLED: process.env.JELLYFIN_ENABLED }),
    ...(process.env.JELLYFIN_PORT === undefined ? {} : { JELLYFIN_PORT: process.env.JELLYFIN_PORT }),
  });
  const jellyfinLanAddress = jellyfinConfig.enabled ? resolveLanAddress() : null;
  if (jellyfinConfig.enabled && !jellyfinLanAddress) {
    throw new Error('JELLYFIN_ENABLED requires a non-loopback LAN address for discovery.');
  }
  const jellyfinServerId = jellyfinConfig.enabled
    ? await loadOrCreateJellyfinServerId({ configDir: process.env.CONFIG_DIR ?? path.dirname(databaseUrl.replace(/^file:/, '')) })
    : null;

  // Bonjour publishes A records for active LAN interfaces automatically. Its
  // SRV target must be a fully qualified mDNS hostname; an unqualified host
  // can resolve through the local hosts file to a loopback address instead.
  const mdnsHost = process.env.MDNS_HOST ?? `${os.hostname()}.local`;

  const prisma: any = new DatabaseClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  await prisma.$connect();
  
  await repairMalformedJsonColumns(prisma);

  await ensureBaselineData(prisma);

  const activityEventRepository = new ActivityEventRepository(prisma);
  const taskExecutionsRepository = new TaskExecutionsRepository(prisma);
  const activityEventEmitter = new ActivityEventEmitter(activityEventRepository);

  const downloadClientRepository = new DownloadClientRepository(prisma);
  const customFormatRepository = new CustomFormatRepository(prisma);
  const importListRepository = new ImportListRepository(prisma);
  const indexerRepository = new IndexerRepository(prisma);
  const indexerHealthRepository = new IndexerHealthRepository(prisma);
  const mediaRepository = new MediaRepository(prisma);
  const notificationRepository = new NotificationRepository(prisma);
  const qualityProfileRepository = new QualityProfileRepository(prisma);
  const subtitleVariantRepository = new SubtitleVariantRepository(prisma);
  const playbackRepository = new PlaybackRepository(prisma);
  const appSettingsRepository = new AppSettingsRepository(prisma);
  const torrentRepository = new TorrentRepository(prisma);
  const collectionRepository = new CollectionRepository(prisma);

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

  // Create the event hub early so NotificationDispatchService can publish to it
  const eventHub = new ApiEventHub();

  // Surface AI release-parser degradation instead of letting it hide. Every one of
  // these events used to be swallowed: the parser returned regex output or empty
  // slots, so a retired, rate-limited, or too-slow model was indistinguishable from a
  // healthy one. That is how the shipped default went 4-6x over its own abort deadline
  // without anyone noticing.
  onReleaseParserDegraded(event => {
    eventHub.publish('parser:degraded', event);
  });

  const notificationTransportRegistry = new NotificationTransportRegistry();
  const notificationDispatchService = new NotificationDispatchService(
    eventHub,
    notificationRepository,
    notificationTransportRegistry,
  );

  const httpClient = new HttpClient();
  const settingsService = new SettingsService(appSettingsRepository);
  const updateService = new UpdateService({
    currentVersion: process.env.npm_package_version ?? '1.0.0',
    githubRepo: process.env.UPDATE_GITHUB_REPO,
    stagingDir: process.env.UPDATE_STAGING_DIR,
  });
  const metadataProvider = new MetadataProvider(httpClient, settingsService);
  const collectionService = new CollectionService(prisma, httpClient, settingsService);
  const playbackService = new PlaybackService(
    prisma,
    playbackRepository,
    settingsService,
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

  const scheduler = new Scheduler();
  scheduler.setSchedulerStateRepository(appSettingsRepository);
  const libraryScanService = new LibraryScanService(prisma);
  const discoveryService = new DiscoveryService();
  const definitionLoader = new DefinitionLoader();
  const definitionsPath = process.env.DEFINITIONS_PATH ?? path.resolve(process.cwd(), 'server/definitions');
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

  const settings = await settingsService.get();
  await new DataDirectoryInitializer(resolveRequiredDataDirectories({
    mediaDir: process.env.MEDIA_DIR ?? '/data',
    incompleteDirectory: settings.torrentLimits.incompleteDirectory,
    completeDirectory: settings.torrentLimits.completeDirectory,
    movieRootFolder: settings.mediaManagement.movieRootFolder,
    tvRootFolder: settings.mediaManagement.tvRootFolder,
  })).initialize();
  const rssInterval = settings.schedulerIntervals.rssSyncMinutes;
  const rssCron = `*/${rssInterval} * * * *`;

  try {
    scheduler.schedule('rss-sync', rssCron, async () => {
      console.log('Starting scheduled RSS sync...');
      await rssSyncService.sync();
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
      const results = await importListSyncService.syncAllEnabled();
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

  const indexerTester = new IndexerTester(
    httpClient,
    indexerHealthRepository,
    activityEventEmitter,
  );

  const torrentManager = await createRuntimeTorrentManager(torrentRepository, {
    incomplete: settings.torrentLimits.incompleteDirectory,
    complete: settings.torrentLimits.completeDirectory,
    seedRatioLimit: settings.torrentLimits.seedRatioLimit,
    seedTimeLimitMinutes: settings.torrentLimits.seedTimeLimitMinutes,
    seedLimitAction: settings.torrentLimits.seedLimitAction,
    maxActiveDownloads: settings.torrentLimits.maxActiveDownloads,
  });

  const organizer = new Organizer();

  const seedingProtector = new SeedingProtector(torrentManager as any, torrentRepository, prisma as any);
  torrentManager.setPrisma?.(prisma as any);
  seedingProtector.start();

  const openSubtitlesProvider = new OpenSubtitlesProvider(httpClient, settingsService);
  const assrtProvider = new AssrtProvider(httpClient, settingsService);
  const subdlProvider = new SubdlProvider(httpClient, settingsService);

  const manualSubtitleProvider = process.env.MANUAL_SUBTITLE_PROVIDER?.toLowerCase() ?? 'opensubtitles';

  const subtitleProviderFactory = new SubtitleProviderFactory(
    {
      opensubtitles: openSubtitlesProvider,
      assrt: assrtProvider,
      subdl: subdlProvider,
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
  );
  const variantLifecycle = createVariantLifecycle(
    variantBackfillService,
    subtitleVariantRepository,
    variantInventoryIndexer,
    subtitleAutomationService,
    catalogCache,
  );
  await variantLifecycle.start();

  const importManager = new ImportManager(
    torrentManager,
    organizer,
    prisma,
    activityEventEmitter,
    variantLifecycle.importHooks,
    notificationDispatchService,
  );

  const mediaService = new MediaService(prisma, metadataProvider, activityEventEmitter);
  const searchAggregationService = new MediaSearchService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager,
    activityEventEmitter,
    customFormatRepository,
    notificationDispatchService,
    eventHub,
  );
  const mediaSearchService = searchAggregationService;
  const wantedService = new WantedService(prisma);
  const wantedSearchService = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  // Initialize background automation services
  new RssMediaMonitor(rssSyncService, torrentManager, prisma, metadataProvider, customFormatRepository);
  const wantedSearchInterval = settings.schedulerIntervals.wantedSearchMinutes;
  const wantedSearchCron = `*/${wantedSearchInterval} * * * *`;
  scheduler.scheduleWantedSearch(wantedSearchService, 'wanted-search', wantedSearchCron);
  console.log(`Wanted search scheduled every ${wantedSearchInterval} minutes (${wantedSearchCron}).`);
  const subtitleScanInterval = Math.max(5, settings.schedulerIntervals.availabilityCheckMinutes);
  const subtitleScanCron = `*/${subtitleScanInterval} * * * *`;
  scheduler.scheduleSubtitleWantedSearch(
    { runAutomationCycle: () => subtitleAutomationService.runTargetedAutomationCycle({ recentDays: 7 }) },
    'subtitle-wanted-search',
    subtitleScanCron,
  );

  try {
    scheduler.scheduleLibraryScan(libraryScanService, settingsService);
    console.log('Library scan scheduled daily at 2 AM.');
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


  // Derive db path from database URL (strip "file:" prefix)
  const dbFilePath = databaseUrl.replace(/^file:/, '');
  const backupDir = process.env.BACKUP_DIR ?? path.resolve(path.dirname(dbFilePath), 'backups');
  const backupService = new BackupService(dbFilePath, backupDir);
  const systemHealthService = new SystemHealthService(prisma);

  await catalogCache.load();
  catalogCache.watch();

  await scheduler.start();

  const app = createApiServer({
    prisma,
    eventHub,
    mediaService,
    mediaSearchService,
    searchAggregationService,
    wantedService,
    wantedSearchService,
    torrentManager: torrentManager as any,
    importManager,
    indexerRepository,
    mediaRepository,
    indexerTester,
    indexerFactory,
    subtitleInventoryApiService,
    subtitleProviderFactory,
    subtitleAutomationService,
    ...variantLifecycle.apiDependencies,
    playbackService,
    settingsService,
    activityEventRepository,
    taskExecutionsRepository,
    indexerHealthRepository,
    notificationRepository,
    notificationTransportRegistry,
    qualityProfileRepository,
    downloadClientRepository,
    customFormatRepository,
    metadataProvider,
    importListRepository,
    importListProviderRegistry,
    importListSyncService,
    collectionRepository,
    collectionService,
    scheduler,
    logReaderService: globalLogBuffer,
    backupService,
    libraryScanService,
    systemHealthService,
    updateService,
    catalogCache,
  });

  const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), 'app/dist');
  registerStaticServing(app, staticDir);

  const jellyfinApp = jellyfinConfig.enabled && jellyfinServerId !== null
    ? createJellyfinServer({ prisma, playbackService }, {
        serverId: jellyfinServerId,
        serverName: process.env.JELLYFIN_SERVER_NAME?.trim() || 'Mediarr',
        lanAddress: jellyfinLanAddress!,
        port: jellyfinConfig.port,
      })
    : undefined;
  const jellyfinDiscoveryService = new JellyfinDiscoveryService();
  if (jellyfinApp && jellyfinServerId !== null) {
    await jellyfinApp.listen({ host, port: jellyfinConfig.port });
    await jellyfinDiscoveryService.start(jellyfinConfig.port, jellyfinServerId, process.env.JELLYFIN_SERVER_NAME?.trim() || 'Mediarr');
    console.log(`Jellyfin compatibility surface listening on http://${host}:${jellyfinConfig.port}`);
  }

  const close = async (): Promise<void> => {
    seedingProtector.stop();
    await jellyfinDiscoveryService.stop().catch(error => console.warn('Failed to stop Jellyfin discovery cleanly:', error));
    await jellyfinApp?.close();
    variantLifecycle.close();
    await discoveryService.stop().catch(error => {
      console.warn('Failed to stop discovery service cleanly:', error);
    });
    await app.close();
    if (torrentManager.destroy) {
      await torrentManager.destroy();
    }
    await prisma.$disconnect();
  };

  process.on('SIGINT', () => {
    void close().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void close().finally(() => process.exit(0));
  });

  await app.listen({ host, port });
  if (settings.streaming.discoveryEnabled) {
    try {
      const configuredServiceName = settings.streaming.discoveryServiceName.trim();
      const discoveryAnnouncement = discoveryService.start({
        port,
        name: configuredServiceName.length > 0
          ? configuredServiceName
          : (process.env.MDNS_SERVICE_NAME ?? 'Mediarr'),
        type: 'mediarr',
        host: mdnsHost,
        txt: {
          version: '1.0.0',
        },
      });
      console.log(
        `Discovery broadcast active as _${discoveryAnnouncement.type}._tcp on port ${discoveryAnnouncement.port}`,
      );
    } catch (error) {
      console.warn('Failed to start discovery service:', error);
    }
  } else {
    console.log('Discovery broadcast disabled by streaming settings.');
  }
  console.log(`Mediarr API listening on http://${host}:${port}`);
}

void startApi().catch(error => {
  console.error('Failed to start Mediarr API:', error);
  process.exit(1);
});
