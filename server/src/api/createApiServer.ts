import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { registerApiErrorHandler } from './errors';
import { ApiEventHub } from './eventHub';
import { registerBackupRoutes } from './routes/backupRoutes';
import { registerBlocklistRoutes } from './routes/blocklistRoutes';
import { registerCollectionRoutes } from './routes/collectionRoutes';
import { registerCategorySettingsRoutes } from './routes/categorySettingsRoutes';
import { registerCustomFormatRoutes } from './routes/customFormatRoutes';
import { registerDownloadClientRoutes } from './routes/downloadClientRoutes';
import { registerEventsRoutes } from './routes/eventsRoutes';
import { registerFilesystemRoutes } from './routes/filesystemRoutes';
import { registerFilterRoutes } from './routes/filterRoutes';
import { registerImportListRoutes } from './routes/importListRoutes';
import { registerIndexerRoutes } from './routes/indexerRoutes';

import { registerLogsRoutes } from './routes/logsRoutes';
import { registerMediaRoutes } from './routes/mediaRoutes';
import { registerMovieRoutes } from './routes/movieRoutes';
import { registerNotificationRoutes } from './routes/notificationRoutes';
import { registerOperationsRoutes } from './routes/operationsRoutes';
import { registerProxySettingsRoutes } from './routes/proxySettingsRoutes';
import { registerQualityProfileRoutes } from './routes/qualityProfileRoutes';
import { registerReleaseRoutes } from './routes/releaseRoutes';
import { registerSeriesRoutes } from './routes/seriesRoutes';
import { registerSubtitleRoutes } from './routes/subtitleRoutes';
import { registerSystemRoutes } from './routes/systemRoutes';
import { registerTorrentRoutes } from './routes/torrentRoutes';
import { registerUpdatesRoutes } from './routes/updatesRoutes';
import type { ApiDependencies, ApiServerOptions } from './types';

interface PollState {
  lastActivityId?: number;
  lastHealthSignature?: string;
}

function stableSignature(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (entry instanceof Date) {
      return entry.toISOString();
    }

    return entry;
  });
}

async function pollTorrentStats(
  deps: ApiDependencies,
  eventHub: ApiEventHub,
): Promise<void> {
  if (!deps.torrentManager?.getTorrentsStatus) {
    return;
  }

  const stats = await deps.torrentManager.getTorrentsStatus();
  eventHub.publish('torrent:stats', stats);
}

async function pollActivity(
  deps: ApiDependencies,
  eventHub: ApiEventHub,
  state: PollState,
): Promise<void> {
  if (!deps.activityEventRepository?.query) {
    return;
  }

  const queried = await deps.activityEventRepository.query({
    page: 1,
    pageSize: 20,
  });

  if (queried.items.length === 0) {
    return;
  }

  const newest = queried.items[0];
  if (state.lastActivityId === undefined) {
    state.lastActivityId = newest?.id;
    return;
  }

  const freshItems = queried.items
    .filter(item => item.id > (state.lastActivityId ?? 0))
    .sort((left, right) => left.id - right.id);

  for (const event of freshItems) {
    eventHub.publish('activity:new', event);
    state.lastActivityId = event.id;
  }
}

async function pollHealth(
  deps: ApiDependencies,
  eventHub: ApiEventHub,
  state: PollState,
): Promise<void> {
  if (!deps.indexerRepository?.findAll || !deps.indexerHealthRepository?.getByIndexerId) {
    return;
  }

  const indexers = await deps.indexerRepository.findAll();
  const health = await Promise.all(indexers.map(async indexer => ({
    indexerId: indexer.id,
    indexerName: indexer.name,
    snapshot: await deps.indexerHealthRepository!.getByIndexerId(indexer.id),
  })));

  const signature = stableSignature(health);

  if (state.lastHealthSignature === undefined) {
    state.lastHealthSignature = signature;
    return;
  }

  if (signature !== state.lastHealthSignature) {
    eventHub.publish('health:update', health);
    state.lastHealthSignature = signature;
  }
}

export function createApiServer(
  dependencies: ApiDependencies,
  options: ApiServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        allowUnionTypes: true,
      },
    },
  });

  const eventHub = dependencies.eventHub ?? new ApiEventHub(options.heartbeatIntervalMs ?? 30000);

  app.setErrorHandler((error, request, reply) => {
    return registerApiErrorHandler(request, reply, error);
  });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  registerSeriesRoutes(app, dependencies);
  registerMovieRoutes(app, dependencies);
  registerMediaRoutes(app, dependencies);
  registerReleaseRoutes(app, dependencies);
  registerTorrentRoutes(app, dependencies);
  registerIndexerRoutes(app, dependencies);
  registerSubtitleRoutes(app, dependencies);
  registerOperationsRoutes(app, dependencies);
  registerProxySettingsRoutes(app, dependencies);
  registerCategorySettingsRoutes(app, dependencies);
  registerEventsRoutes(app, eventHub);
  registerSystemRoutes(app, dependencies, eventHub);
  registerBackupRoutes(app, dependencies);
  registerLogsRoutes(app, dependencies);
  registerUpdatesRoutes(app, dependencies);
  registerNotificationRoutes(app, dependencies);
  registerBlocklistRoutes(app, dependencies);
  registerQualityProfileRoutes(app, dependencies);
  registerDownloadClientRoutes(app, dependencies);

  registerCustomFormatRoutes(app, dependencies);
  registerFilterRoutes(app, dependencies);
  registerImportListRoutes(app, dependencies);
  registerCollectionRoutes(app, dependencies);
  registerFilesystemRoutes(app, dependencies);

  const pollState: PollState = {};
  const intervals: NodeJS.Timeout[] = [];

  app.addHook('onReady', async () => {
    intervals.push(
      setInterval(() => {
        void pollTorrentStats(dependencies, eventHub).catch(error => {
          console.error('Failed to poll torrent stats:', error);
        });
      }, options.torrentStatsIntervalMs ?? 5000),
    );

    intervals.push(
      setInterval(() => {
        void pollActivity(dependencies, eventHub, pollState).catch(error => {
          console.error('Failed to poll activity:', error);
        });
      }, options.activityPollIntervalMs ?? 1000),
    );

    intervals.push(
      setInterval(() => {
        void pollHealth(dependencies, eventHub, pollState).catch(error => {
          console.error('Failed to poll health:', error);
        });
      }, options.healthPollIntervalMs ?? 3000),
    );
  });

  app.addHook('onClose', async () => {
    for (const timer of intervals) {
      clearInterval(timer);
    }

    eventHub.close();
  });

  return app;
}
