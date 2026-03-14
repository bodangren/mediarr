import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { createApiServer } from './api/createApiServer';
import { registerStaticServing } from './api/staticServing';
import { DefinitionLoader } from './indexers/DefinitionLoader';
import { IndexerFactory } from './indexers/IndexerFactory';
import { HttpClient } from './indexers/HttpClient';
import { IndexerTester } from './indexers/IndexerTester';
import { ActivityEventRepository } from './repositories/ActivityEventRepository';
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
import { ActivityEventEmitter } from './services/ActivityEventEmitter';
import { ImportManager } from './services/ImportManager';
import { Organizer } from './services/Organizer';

import { CollectionService } from './services/CollectionService';
import { DataDirectoryInitializer } from './services/DataDirectoryInitializer';
import {
  ImportListProviderRegistry,
  ImportListSyncService,
  TMDBListProvider,
  TMDBPopularProvider,
} from './services/importLists';
import { SearchAggregationService } from './services/SearchAggregationService';
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
import {
  SubtitleInventoryApiService,
  type ManualSearchCandidate,
} from './services/SubtitleInventoryApiService';
import { SubtitleNamingService } from './services/SubtitleNamingService';
import { SubtitleProviderFactory } from './services/SubtitleProviderFactory';
import { SubtitleScoringService } from './services/SubtitleScoringService';
import { ProviderBackedSubtitleFetchProvider } from './services/ProviderBackedSubtitleFetchProvider';
import { DiscoveryService } from './services/DiscoveryService';
import { VariantMissingSubtitleService } from './services/VariantMissingSubtitleService';
import { VariantSubtitleFetchService } from './services/VariantSubtitleFetchService';
import { VariantWantedService } from './services/VariantWantedService';
import { WantedService } from './services/WantedService';
import { WantedSearchService } from './services/WantedSearchService';
import { RssMediaMonitor } from './services/RssMediaMonitor';
import { BackupService } from './services/BackupService';
import { LibraryScanService } from './services/LibraryScanService';
import { globalLogBuffer } from './services/LogReaderService';
import { NotificationDispatchService } from './services/NotificationDispatchService';
import { SeedingProtector } from './services/SeedingProtector';
import { SystemHealthService } from './services/SystemHealthService';
import { ApiEventHub } from './api/eventHub';

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) {
    return fallback;
  }

  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function migrateOldQualityProfiles(prisma: PrismaClient): Promise<void> {
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

async function ensureBaselineData(prisma: PrismaClient): Promise<void> {
  await seedCategories(prisma);
  await seedQualityDefinitions(prisma);
  await seedQualityProfiles(prisma);
  await migrateOldQualityProfiles(prisma);
}

interface RuntimeTorrentManager {
  initialize?: () => Promise<void>;
  destroy?: () => Promise<void>;
  setDownloadPaths?: (paths: { incomplete?: string; complete?: string }) => void;
  addTorrent: (input: {
    magnetUrl?: string;
    path?: string;
    torrentFileBase64?: string;
    name?: string;
    size?: number;
  }) => Promise<{ infoHash: string; name: string }>;
  pauseTorrent: (infoHash: string) => Promise<void>;
  resumeTorrent: (infoHash: string) => Promise<void>;
  removeTorrent: (infoHash: string) => Promise<void>;
  setSpeedLimits: (limits: { download?: number; upload?: number }) => void;
  getTorrentsStatus: () => Promise<unknown[]>;
  getTorrentStatus: (infoHash: string) => Promise<unknown>;
  getActiveTorrents: () => Promise<unknown[]>;
}

function mapTorrentRecord(torrent: {
  infoHash: string;
  name: string;
  status: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  size: bigint;
  downloaded: bigint;
  uploaded: bigint;
  eta: number | null;
  path: string;
  completedAt: Date | null;
}) {
  return {
    infoHash: torrent.infoHash,
    name: torrent.name,
    status: torrent.status,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    size: torrent.size.toString(),
    downloaded: torrent.downloaded.toString(),
    uploaded: torrent.uploaded.toString(),
    eta: torrent.eta,
    path: torrent.path,
    completedAt: torrent.completedAt,
  };
}

function createFallbackTorrentManager(
  repository: TorrentRepository,
): RuntimeTorrentManager {
  let incompleteDownloadPath = '/data/downloads/incomplete';

  return {
    setDownloadPaths(paths) {
      if (paths.incomplete !== undefined) {
        incompleteDownloadPath = paths.incomplete;
      }
    },
    async addTorrent(input) {
      const infoHash = crypto
        .createHash('sha1')
        .update(`${input.magnetUrl ?? ''}:${Date.now()}:${Math.random()}`)
        .digest('hex');
      const downloadPath = (input.path ?? incompleteDownloadPath).trim();
      if (!downloadPath) {
        throw new Error('Incomplete download directory is not configured. Configure it in Settings > Clients.');
      }

      const row = await repository.upsert({
        infoHash,
        name: input.name ?? input.magnetUrl ?? 'Manual Torrent',
        status: 'downloading',
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(input.size ?? 0),
        downloaded: BigInt(0),
        uploaded: BigInt(0),
        ratio: 0,
        path: downloadPath,
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: input.magnetUrl ?? null,
        torrentFile: null,
        episodeId: null,
        movieId: null,
      });

      return {
        infoHash: row.infoHash,
        name: row.name,
      };
    },
    async pauseTorrent(infoHash) {
      await repository.updateStatus(infoHash, 'paused');
    },
    async resumeTorrent(infoHash) {
      await repository.updateStatus(infoHash, 'downloading');
    },
    async removeTorrent(infoHash) {
      await repository.delete(infoHash);
    },
    setSpeedLimits() {},
    async getTorrentsStatus() {
      const rows = await repository.findAll();
      return rows.map(mapTorrentRecord);
    },
    async getTorrentStatus(infoHash) {
      const row = await repository.findByInfoHash(infoHash);
      if (!row) {
        throw new Error(`Torrent with infoHash '${infoHash}' not found in database`);
      }

      return mapTorrentRecord(row);
    },
    async getActiveTorrents() {
      const rows = await repository.findByStatuses(['downloading', 'queued']);
      return rows.map(mapTorrentRecord);
    },
  };
}

async function createRuntimeTorrentManager(
  repository: TorrentRepository,
  paths?: {
    incomplete?: string;
    complete?: string;
    seedRatioLimit?: number;
    seedTimeLimitMinutes?: number;
    seedLimitAction?: 'pause' | 'remove';
    maxActiveDownloads?: number;
  }
): Promise<RuntimeTorrentManager> {
  try {
    const module = await import('./services/TorrentManager');
    const manager = module.TorrentManager.getInstance(repository);
    if (paths) {
      manager.setDownloadPaths(paths);
    }
    await manager.initialize();
    return manager;
  } catch (error) {
    console.warn('Falling back to database-backed torrent manager:', error);
    return createFallbackTorrentManager(repository);
  }
}

async function resolveDatabaseUrl(configuredUrl: string | undefined): Promise<string> {
  const fallbackUrl = `file:${path.resolve(process.cwd(), 'mediarr.db')}`;
  const databaseUrl = configuredUrl ?? 'file:/config/mediarr.db';

  if (!databaseUrl.startsWith('file:')) {
    return databaseUrl;
  }

  const sqlitePath = databaseUrl.slice('file:'.length);
  if (!sqlitePath) {
    return fallbackUrl;
  }

  const directory = path.dirname(sqlitePath);
  try {
    await fs.mkdir(directory, { recursive: true });
    return databaseUrl;
  } catch (error) {
    console.warn(
      `Falling back to local database path because '${directory}' is unavailable:`,
      error,
    );
    return fallbackUrl;
  }
}

async function repairMalformedJsonColumns(prisma: PrismaClient): Promise<void> {
  const requiredAppSettingsDefaults: Record<string, string> = {
    torrentLimits: JSON.stringify(DEFAULT_APP_SETTINGS.torrentLimits),
    schedulerIntervals: JSON.stringify(DEFAULT_APP_SETTINGS.schedulerIntervals),
    pathVisibility: JSON.stringify(DEFAULT_APP_SETTINGS.pathVisibility),
  };

  const nullableAppSettingsColumns = ['apiKeys', 'host', 'security', 'logging', 'update'];

  try {
    const repairs: Array<{ label: string; changes: number }> = [];

    const qualityProfileRes = await prisma.$executeRawUnsafe(`
      UPDATE "QualityProfile"
      SET "items" = '[]'
      WHERE "items" IS NULL OR json_valid("items") = 0
    `);
    repairs.push({ label: 'QualityProfile.items', changes: qualityProfileRes });

    const notificationRes = await prisma.$executeRawUnsafe(`
      UPDATE "Notification"
      SET "config" = '{}'
      WHERE "config" IS NULL OR json_valid("config") = 0
    `);
    repairs.push({ label: 'Notification.config', changes: notificationRes });

    const activityEventRes = await prisma.$executeRawUnsafe(`
      UPDATE "ActivityEvent"
      SET "details" = NULL
      WHERE "details" IS NOT NULL AND json_valid("details") = 0
    `);
    repairs.push({ label: 'ActivityEvent.details', changes: activityEventRes });

    const torrentEtaDownscaleRes = await prisma.$executeRawUnsafe(`
      UPDATE "Torrent"
      SET "eta" = CAST("eta" / 1000 AS INTEGER)
      WHERE "eta" > 2147483647
    `);
    repairs.push({ label: 'Torrent.eta.downscaled', changes: torrentEtaDownscaleRes });

    const torrentEtaClampRes = await prisma.$executeRawUnsafe(`
      UPDATE "Torrent"
      SET "eta" = 2147483647
      WHERE "eta" > 2147483647
    `);
    repairs.push({ label: 'Torrent.eta.clamped', changes: torrentEtaClampRes });

    const torrentEtaNegativeRes = await prisma.$executeRawUnsafe(`
      UPDATE "Torrent"
      SET "eta" = NULL
      WHERE "eta" < 0
    `);
    repairs.push({ label: 'Torrent.eta.negative-null', changes: torrentEtaNegativeRes });

    for (const [column, defaultJson] of Object.entries(requiredAppSettingsDefaults)) {
      // Column names cannot be bound as parameters in SQL, so we use $executeRawUnsafe
      // for the identifier only. The value is passed as a positional parameter to prevent
      // any risk of injection from the JSON string content.
      const res = await prisma.$executeRawUnsafe(
        `UPDATE "AppSettings" SET "${column}" = ? WHERE "${column}" IS NULL OR json_valid("${column}") = 0`,
        defaultJson,
      );
      repairs.push({ label: `AppSettings.${column}`, changes: res });
    }

    for (const column of nullableAppSettingsColumns) {
      const res = await prisma.$executeRawUnsafe(`
        UPDATE "AppSettings"
        SET "${column}" = NULL
        WHERE "${column}" IS NOT NULL AND json_valid("${column}") = 0
      `);
      repairs.push({ label: `AppSettings.${column}`, changes: res });
    }

    const changed = repairs.filter((repair) => repair.changes > 0);
    if (changed.length > 0) {
      console.warn(
        'Repaired malformed JSON in SQLite:',
        changed.map((repair) => `${repair.label}=${repair.changes}`).join(', '),
      );
    }
  } catch (err) {
    console.error('Failed to run JSON repairs:', err);
  }
}

async function startApi(): Promise<void> {
  // Install global log buffer before any other output
  globalLogBuffer.install();

  const databaseUrl = await resolveDatabaseUrl(process.env.DATABASE_URL);
  const port = parsePort(process.env.API_PORT, 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';

  const prisma = new PrismaClient({
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

  // Create the event hub early so NotificationDispatchService can publish to it
  const eventHub = new ApiEventHub();

  const notificationDispatchService = new NotificationDispatchService(eventHub);

  const httpClient = new HttpClient();
  const settingsService = new SettingsService(appSettingsRepository);
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
  const libraryScanService = new LibraryScanService(prisma);
  const discoveryService = new DiscoveryService();
  const rssSyncService = new RssSyncService(prisma, httpClient, indexerHealthRepository);

  const settings = await settingsService.get();
  try {
    await new DataDirectoryInitializer([
      settings.torrentLimits.incompleteDirectory,
      settings.torrentLimits.completeDirectory,
    ]).initialize();
  } catch (error) {
    console.warn('Data directory initialization skipped:', error);
  }
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

  const definitionLoader = new DefinitionLoader();
  const definitionsPath = process.env.DEFINITIONS_PATH ?? path.resolve(process.cwd(), 'server/definitions');
  let definitions: any[] = [];
  try {
    definitions = await definitionLoader.loadFromDirectory(definitionsPath);
    console.log(`Loaded ${definitions.length} indexer definitions from ${definitionsPath}`);
  } catch (error) {
    console.warn(`Failed to load indexer definitions from ${definitionsPath}:`, error);
  }

  const indexerFactory = new IndexerFactory(definitions, httpClient);
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
  seedingProtector.start();

  const openSubtitlesProvider = new OpenSubtitlesProvider(httpClient, settingsService);
  const assrtProvider = new AssrtProvider(httpClient, settingsService);
  const subdlProvider = new SubdlProvider(httpClient, settingsService);

  const manualSubtitleProvider = process.env.MANUAL_SUBTITLE_PROVIDER?.toLowerCase() ?? 'opensubtitles';

  const subtitleProviderFactory = new SubtitleProviderFactory(
    {
      embedded: {
        async search() { return []; },
        async download(c: ManualSearchCandidate) { return c; }
      },
      opensubtitles: openSubtitlesProvider,
      assrt: assrtProvider,
      subdl: subdlProvider,
    },
    () => ({ manualProvider: manualSubtitleProvider }),
  );

  const subtitleInventoryApiService = new SubtitleInventoryApiService(
    subtitleVariantRepository,
    new SubtitleNamingService(),
    subtitleProviderFactory,
    new SubtitleScoringService(),
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

  const importManager = new ImportManager(
    torrentManager,
    organizer,
    prisma,
    activityEventEmitter,
    {
      onMovieImported: async (movieId: number) => {
        await subtitleAutomationService.onMovieImported(movieId);
      },
      onEpisodeImported: async (episodeId: number) => {
        await subtitleAutomationService.onEpisodeImported(episodeId);
      },
    },
    notificationDispatchService,
  );

  const mediaService = new MediaService(prisma, metadataProvider, activityEventEmitter);
  const searchAggregationService = new SearchAggregationService(
    indexerRepository as any,
    indexerFactory as any,
    torrentManager,
    activityEventEmitter,
    customFormatRepository,
    notificationDispatchService,
  );
  const mediaSearchService = searchAggregationService;
  const wantedService = new WantedService(prisma);
  const wantedSearchService = new WantedSearchService(mediaSearchService, prisma, activityEventEmitter);

  // Initialize background automation services
  new RssMediaMonitor(rssSyncService, torrentManager, prisma, metadataProvider, customFormatRepository);
  scheduler.scheduleWantedSearch(wantedSearchService);
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


  // Derive db path from database URL (strip "file:" prefix)
  const dbFilePath = databaseUrl.replace(/^file:/, '');
  const backupDir = process.env.BACKUP_DIR ?? path.resolve(path.dirname(dbFilePath), 'backups');
  const backupService = new BackupService(dbFilePath, backupDir);
  const systemHealthService = new SystemHealthService(prisma);

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
    playbackService,
    settingsService,
    activityEventRepository,
    indexerHealthRepository,
    notificationRepository,
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
  });

  const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), 'app/dist');
  registerStaticServing(app, staticDir);

  const close = async (): Promise<void> => {
    seedingProtector.stop();
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
