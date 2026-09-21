import 'dotenv/config';
import path from 'node:path';
import os from 'node:os';
import { assertValidEncryptionKey, preparePersistentStorage } from './config/startup';
import { resolveJellyfinConfig } from './config/jellyfin';
import { resolveSlimConfig } from './config/slim';
import { loadOrCreateJellyfinServerId } from './jellyfin/serverIdentity';
import { DatabaseClient } from './db/drizzleClient';
import { describeMigrationState, runMigrations } from './db/migrationRunner';
import { repairMalformedJsonColumns } from './maintenance/repairJsonColumns';
import { createApiServer } from './api/createApiServer';
import { createJellyfinServer } from './api/createJellyfinServer';
import { JellyfinDiscoveryService, resolveLanAddress } from './services/JellyfinDiscoveryService';
import { registerStaticServing } from './api/staticServing';
import { AppSettingsRepository } from './repositories/AppSettingsRepository';
import { SettingsService } from './services/SettingsService';
import { createServiceContainer, seedBaselineData } from './serviceContainer';
import { globalLogBuffer } from './services/LogReaderService';

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) {
    return fallback;
  }

  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const slimConfig = resolveSlimConfig({
    ...(process.env.MEDIARR_SLIM_MODE === undefined ? {} : { MEDIARR_SLIM_MODE: process.env.MEDIARR_SLIM_MODE }),
  });
  if (slimConfig.slim) {
    console.log('Slim mode enabled: -arr domains (torrent, indexers, RSS, import lists, subtitles, notifications, quality) stay dark.');
  }
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

  // Quality/category seeds are -arr domain data; slim mode must not run them.
  if (!slimConfig.slim) {
    await seedBaselineData(prisma);
  }

  const settings = await new SettingsService(new AppSettingsRepository(prisma)).get();

  const container = await createServiceContainer({
    slim: slimConfig.slim,
    prisma,
    databaseUrl,
    settings,
  });
  await container.initialize();

  const app = createApiServer(container.apiDependencies, { slimMode: container.slim });

  const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), 'app/dist');
  registerStaticServing(app, staticDir);

  const jellyfinApp = jellyfinConfig.enabled && jellyfinServerId !== null
    ? createJellyfinServer({ prisma, playbackService: container.playbackService }, {
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
    await container.stopBackgroundServices();
    await jellyfinDiscoveryService.stop().catch(error => console.warn('Failed to stop Jellyfin discovery cleanly:', error));
    await jellyfinApp?.close();
    await container.discoveryService.stop().catch(error => {
      console.warn('Failed to stop discovery service cleanly:', error);
    });
    await app.close();
    await container.close();
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
      const discoveryAnnouncement = container.discoveryService.start({
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
