import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { createApiServer } from './api/createApiServer';
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
import { QualityProfileRepository } from './repositories/QualityProfileRepository';
import { SubtitleVariantRepository } from './repositories/SubtitleVariantRepository';
import { TorrentRepository } from './repositories/TorrentRepository';
import { seedCategories } from './seeds/categories';
import { seedQualityDefinitions } from './seeds/qualities';
import { ActivityEventEmitter } from './services/ActivityEventEmitter';

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
import { OpenSubtitlesProvider } from './services/providers/OpenSubtitlesProvider';
import { RssSyncService } from './services/RssSyncService';
import { Scheduler } from './services/Scheduler';
import { SettingsService } from './services/SettingsService';
import {
  SubtitleInventoryApiService,
  type ManualSearchCandidate,
} from './services/SubtitleInventoryApiService';
import { SubtitleNamingService } from './services/SubtitleNamingService';
import { SubtitleProviderFactory } from './services/SubtitleProviderFactory';
import { WantedService } from './services/WantedService';

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) {
    return fallback;
  }

  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureBaselineData(prisma: PrismaClient): Promise<void> {
  await seedCategories(prisma);
  await seedQualityDefinitions(prisma);

  // Default quality profiles with proper items structure
  const hd1080pItems = [
    { quality: { id: 1, name: 'SDTV', source: 'television', resolution: 480 }, allowed: true },
    { quality: { id: 4, name: 'DVD', source: 'dvd', resolution: 480 }, allowed: true },
    { quality: { id: 5, name: 'HDTV-720p', source: 'television', resolution: 720 }, allowed: true },
    { quality: { id: 6, name: 'WEBRip-720p', source: 'web', resolution: 720 }, allowed: true },
    { quality: { id: 7, name: 'WEBDL-720p', source: 'web', resolution: 720 }, allowed: true },
    { quality: { id: 8, name: 'Bluray-720p', source: 'bluray', resolution: 720 }, allowed: true },
    { quality: { id: 9, name: 'HDTV-1080p', source: 'television', resolution: 1080 }, allowed: true },
    { quality: { id: 10, name: 'WEBRip-1080p', source: 'web', resolution: 1080 }, allowed: true },
    { quality: { id: 11, name: 'WEBDL-1080p', source: 'web', resolution: 1080 }, allowed: true },
    { quality: { id: 12, name: 'Bluray-1080p', source: 'bluray', resolution: 1080 }, allowed: true },
    { quality: { id: 13, name: 'Bluray-1080p Remux', source: 'bluray', resolution: 1080 }, allowed: false },
  ];

  const ultraHdItems = [
    ...hd1080pItems,
    { quality: { id: 14, name: 'HDTV-2160p', source: 'television', resolution: 2160 }, allowed: true },
    { quality: { id: 15, name: 'WEBRip-2160p', source: 'web', resolution: 2160 }, allowed: true },
    { quality: { id: 16, name: 'WEBDL-2160p', source: 'web', resolution: 2160 }, allowed: true },
    { quality: { id: 17, name: 'Bluray-2160p', source: 'bluray', resolution: 2160 }, allowed: true },
    { quality: { id: 18, name: 'Bluray-2160p Remux', source: 'bluray', resolution: 2160 }, allowed: false },
  ];

  await prisma.qualityProfile.upsert({
    where: { name: 'HD-1080p' },
    update: {},
    create: { name: 'HD-1080p', cutoff: 11, items: hd1080pItems },
  });

  await prisma.qualityProfile.upsert({
    where: { name: 'UltraHD' },
    update: {},
    create: { name: 'UltraHD', cutoff: 16, items: ultraHdItems },
  });
}

interface RuntimeTorrentManager {
  initialize?: () => Promise<void>;
  destroy?: () => Promise<void>;
  addTorrent: (input: {
    magnetUrl?: string;
    path?: string;
    torrentFileBase64?: string;
  }) => Promise<{ infoHash: string; name: string }>;
  pauseTorrent: (infoHash: string) => Promise<void>;
  resumeTorrent: (infoHash: string) => Promise<void>;
  removeTorrent: (infoHash: string) => Promise<void>;
  setSpeedLimits: (limits: { download?: number; upload?: number }) => void;
  getTorrentsStatus: () => Promise<unknown[]>;
  getTorrentStatus: (infoHash: string) => Promise<unknown>;
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
  return {
    async addTorrent(input) {
      const infoHash = crypto
        .createHash('sha1')
        .update(`${input.magnetUrl ?? ''}:${Date.now()}:${Math.random()}`)
        .digest('hex');

      const row = await repository.upsert({
        infoHash,
        name: input.magnetUrl ?? 'Manual Torrent',
        status: 'downloading',
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        eta: null,
        size: BigInt(0),
        downloaded: BigInt(0),
        uploaded: BigInt(0),
        ratio: 0,
        path: input.path ?? '/data/downloads/incomplete',
        completedAt: null,
        stopAtRatio: null,
        stopAtTime: null,
        magnetUrl: input.magnetUrl ?? null,
        torrentFile: null,
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
  };
}

async function createRuntimeTorrentManager(
  repository: TorrentRepository,
): Promise<RuntimeTorrentManager> {
  try {
    const module = await import('./services/TorrentManager');
    const manager = module.TorrentManager.getInstance(repository);
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

    for (const [column, defaultJson] of Object.entries(requiredAppSettingsDefaults)) {
      // Prisma raw parameterized queries shouldn't dynamically bind column names, 
      // but since column names are hardcoded, we can use unsafe raw
      const res = await prisma.$executeRawUnsafe(`
        UPDATE "AppSettings"
        SET "${column}" = '${defaultJson}'
        WHERE "${column}" IS NULL OR json_valid("${column}") = 0
      `);
      repairs.push({ label: \`AppSettings.\${column}\`, changes: res });
    }

    for (const column of nullableAppSettingsColumns) {
      const res = await prisma.$executeRawUnsafe(`
        UPDATE "AppSettings"
        SET "${column}" = NULL
        WHERE "${column}" IS NOT NULL AND json_valid("${column}") = 0
      `);
      repairs.push({ label: \`AppSettings.\${column}\`, changes: res });
    }

    const changed = repairs.filter((repair) => repair.changes > 0);
    if (changed.length > 0) {
      console.warn(
        'Repaired malformed JSON in SQLite:',
        changed.map((repair) => \`\${repair.label}=\${repair.changes}\`).join(', '),
      );
    }
  } catch (err) {
    console.error('Failed to run JSON repairs:', err);
  }
}

async function startApi(): Promise<void> {
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
  try {
    await new DataDirectoryInitializer().initialize();
  } catch (error) {
    console.warn('Data directory initialization skipped:', error);
  }

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
  const appSettingsRepository = new AppSettingsRepository(prisma);
  const torrentRepository = new TorrentRepository(prisma);
  const collectionRepository = new CollectionRepository(prisma);

  const httpClient = new HttpClient();
  const settingsService = new SettingsService(appSettingsRepository);
  const metadataProvider = new MetadataProvider(httpClient, settingsService);
  const collectionService = new CollectionService(prisma, httpClient, settingsService);

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
  const rssSyncService = new RssSyncService(prisma, httpClient, indexerHealthRepository);

  const settings = await settingsService.get();
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

  const torrentManager = await createRuntimeTorrentManager(torrentRepository);

  const openSubtitlesProvider = new OpenSubtitlesProvider(httpClient, settingsService);

  const subtitleProviderFactory = new SubtitleProviderFactory(
    { 
        embedded: {
            async search() { return []; },
            async download(c: any) { return c; }
        },
        opensubtitles: openSubtitlesProvider
    },
    () => ({ manualProvider: 'opensubtitles' }),
  );

  const subtitleInventoryApiService = new SubtitleInventoryApiService(
    subtitleVariantRepository,
    new SubtitleNamingService(),
    subtitleProviderFactory,
  );

  const mediaService = new MediaService(prisma, metadataProvider, activityEventEmitter);
  const searchAggregationService = new SearchAggregationService(
    indexerRepository,
    indexerFactory,
    torrentManager,
    activityEventEmitter,
    customFormatRepository,
  );
  const mediaSearchService = searchAggregationService;
  const wantedService = new WantedService(prisma);


  const app = createApiServer({
    prisma,
    mediaService,
    mediaSearchService,
    searchAggregationService,
    wantedService,
    torrentManager,
    indexerRepository,
    mediaRepository,
    indexerTester,
    indexerFactory,
    subtitleInventoryApiService,
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

  });

  const close = async (): Promise<void> => {
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
  console.log(`Mediarr API listening on http://${host}:${port}`);
}

void startApi().catch(error => {
  console.error('Failed to start Mediarr API:', error);
  process.exit(1);
});
