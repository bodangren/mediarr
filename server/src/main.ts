import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { createApiServer } from './api/createApiServer';
import { DefinitionLoader } from './indexers/DefinitionLoader';
import { IndexerFactory } from './indexers/IndexerFactory';
import { HttpClient } from './indexers/HttpClient';
import { IndexerTester } from './indexers/IndexerTester';
import { ActivityEventRepository } from './repositories/ActivityEventRepository';
import { AppSettingsRepository } from './repositories/AppSettingsRepository';
import { IndexerHealthRepository } from './repositories/IndexerHealthRepository';
import { IndexerRepository } from './repositories/IndexerRepository';
import { MediaRepository } from './repositories/MediaRepository';
import { SubtitleVariantRepository } from './repositories/SubtitleVariantRepository';
import { TorrentRepository } from './repositories/TorrentRepository';
import { seedCategories } from './seeds/categories';
import { ActivityEventEmitter } from './services/ActivityEventEmitter';
import { DataDirectoryInitializer } from './services/DataDirectoryInitializer';
import { MediaSearchService } from './services/MediaSearchService';
import { MediaService } from './services/MediaService';
import { MetadataProvider } from './services/MetadataProvider';
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

  await prisma.qualityProfile.upsert({
    where: { name: 'HD-1080p' },
    update: {},
    create: { name: 'HD-1080p' },
  });

  await prisma.qualityProfile.upsert({
    where: { name: 'UltraHD' },
    update: {},
    create: { name: 'UltraHD' },
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

async function startApi(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:/config/mediarr.db';
  const port = parsePort(process.env.API_PORT, 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  await ensureBaselineData(prisma);
  try {
    await new DataDirectoryInitializer().initialize();
  } catch (error) {
    console.warn('Data directory initialization skipped:', error);
  }

  const activityEventRepository = new ActivityEventRepository(prisma);
  const activityEventEmitter = new ActivityEventEmitter(activityEventRepository);

  const indexerRepository = new IndexerRepository(prisma);
  const indexerHealthRepository = new IndexerHealthRepository(prisma);
  const mediaRepository = new MediaRepository(prisma);
  const subtitleVariantRepository = new SubtitleVariantRepository(prisma);
  const appSettingsRepository = new AppSettingsRepository(prisma);

  const httpClient = new HttpClient();
  const settingsService = new SettingsService(appSettingsRepository);
  const metadataProvider = new MetadataProvider(httpClient, settingsService);

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

  const manualSubtitleProvider = {
    async search(): Promise<ManualSearchCandidate[]> {
      return [];
    },
    async download(candidate: ManualSearchCandidate): Promise<ManualSearchCandidate> {
      return candidate;
    },
  };

  const subtitleProviderFactory = new SubtitleProviderFactory(
    { embedded: manualSubtitleProvider },
    () => ({ manualProvider: 'embedded' }),
  );

  const subtitleInventoryApiService = new SubtitleInventoryApiService(
    subtitleVariantRepository,
    new SubtitleNamingService(),
    subtitleProviderFactory,
  );

  const mediaService = new MediaService(prisma, metadataProvider, activityEventEmitter);
  const mediaSearchService = new MediaSearchService(
    indexerRepository,
    indexerFactory,
    torrentManager,
    activityEventEmitter,
  );
  const wantedService = new WantedService(prisma);

  const app = createApiServer({
    prisma,
    mediaService,
    mediaSearchService,
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
    metadataProvider,
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
