import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { eq, desc, sql } from 'drizzle-orm';
import { registerApiErrorHandler } from './errors';
import { ApiEventHub } from './eventHub';
import * as schema from '../db/schema';
import type { DatabaseClient } from '../db/drizzleClient';
import { registerBackupRoutes } from './routes/backupRoutes';
import { registerBlocklistRoutes } from './routes/blocklistRoutes';
import { registerCollectionRoutes } from './routes/collectionRoutes';
import { registerCategorySettingsRoutes } from './routes/categorySettingsRoutes';
import { registerCustomFormatRoutes } from './routes/customFormatRoutes';
import { registerDownloadClientRoutes } from './routes/downloadClientRoutes';
import { registerEventsRoutes } from './routes/eventsRoutes';
import { registerTestRoutes } from './routes/testRoutes';
import { registerFilesystemRoutes } from './routes/filesystemRoutes';
import { registerFilterRoutes } from './routes/filterRoutes';
import { registerImportListRoutes } from './routes/importListRoutes';
import { registerImportRoutes } from './routes/importRoutes';
import { registerLibraryRoutes } from './routes/libraryRoutes';
import { registerIndexerRoutes } from './routes/indexerRoutes';

import { registerLogsRoutes } from './routes/logsRoutes';
import { registerMediaRoutes } from './routes/mediaRoutes';
import { registerMediaSettingsRoutes } from './routes/mediaSettingsRoutes';
import { registerMovieRoutes } from './routes/movieRoutes';
import { registerNotificationRoutes } from './routes/notificationRoutes';
import { registerOperationsRoutes } from './routes/operationsRoutes';
import { registerProxySettingsRoutes } from './routes/proxySettingsRoutes';
import { registerQualityProfileRoutes } from './routes/qualityProfileRoutes';
import { registerReleaseRoutes } from './routes/releaseRoutes';
import { registerSeriesRoutes } from './routes/seriesRoutes';
import { registerPlaybackRoutes } from './routes/playbackRoutes';
import { registerCalendarRoutes } from './routes/calendarRoutes';
import { registerDashboardRoutes } from './routes/dashboardRoutes';
import { registerStatsRoutes } from './routes/statsRoutes';
import { registerSubtitleRoutes } from './routes/subtitleRoutes';
import { registerSystemRoutes } from './routes/systemRoutes';
import { registerTorrentRoutes } from './routes/torrentRoutes';
import { registerUpdatesRoutes } from './routes/updatesRoutes';
import { registerSetupRoutes } from './routes/setupRoutes';
import { registerImageRoutes } from './routes/imageRoutes';
import { registerSchedulerRoutes } from './routes/schedulerRoutes';
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
    state.lastActivityId = newest?.id ?? state.lastActivityId;
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
  registerPlaybackRoutes(app, dependencies);
  registerCalendarRoutes(app, dependencies);
  registerDashboardRoutes(app, dependencies);
  registerStatsRoutes(app, dependencies);
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
  registerSetupRoutes(app, dependencies);
  registerNotificationRoutes(app, dependencies);
  registerBlocklistRoutes(app, dependencies);
  registerQualityProfileRoutes(app, dependencies);
  registerDownloadClientRoutes(app, dependencies);
  registerMediaSettingsRoutes(app, dependencies);
  registerImageRoutes(app, dependencies);

  if (dependencies.scheduler && dependencies.settingsService) {
    const prisma = dependencies.prisma as DatabaseClient;
    const taskExecutionsRepo = {
      create: async (input: {
        taskName: string;
        startedAt: Date;
        status: string;
      }) => {
        const rows = await prisma.drizzle
          .insert(schema.taskExecutions)
          .values({
            taskName: input.taskName,
            startedAt: input.startedAt,
            completedAt: undefined,
            status: input.status as typeof schema.TaskExecutionStatusEnum[number],
            durationMs: undefined,
            errorMessage: undefined,
          })
          .returning();
        const row = rows[0]!;
        return {
          id: row.id,
          taskName: row.taskName,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
          status: row.status,
          durationMs: row.durationMs,
          errorMessage: row.errorMessage,
        };
      },
      update: async (id: number, input: {
        status: string;
        completedAt: Date;
        durationMs: number;
        errorMessage: string | null;
      }) => {
        await prisma.drizzle
          .update(schema.taskExecutions)
          .set({
            status: input.status as typeof schema.TaskExecutionStatusEnum[number],
            completedAt: input.completedAt,
            durationMs: input.durationMs,
            errorMessage: input.errorMessage ?? undefined,
          })
          .where(eq(schema.taskExecutions.id, id));
      },
      prune: async (taskName: string, retainCount: number) => {
        const cutoffRows = await prisma.drizzle
          .select({ id: schema.taskExecutions.id })
          .from(schema.taskExecutions)
          .where(eq(schema.taskExecutions.taskName, taskName))
          .orderBy(desc(schema.taskExecutions.id))
          .limit(1)
          .offset(retainCount - 1);
        const cutoffId = cutoffRows[0]?.id;
        if (cutoffId == null) {
          return 0;
        }
        const result = await prisma.drizzle
          .delete(schema.taskExecutions)
          .where(sql`${schema.taskExecutions.taskName} = ${taskName} AND ${schema.taskExecutions.id} < ${cutoffId}`);
        return result.rowsAffected;
      },
      query: async (input: { page: number; pageSize: number; status?: string }) => {
        const { page, pageSize, status: statusFilter } = input;
        const offset = (page - 1) * pageSize;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let baseQuery = prisma.drizzle.select().from(schema.taskExecutions) as any;
        if (statusFilter) {
          baseQuery = baseQuery.where(
            eq(schema.taskExecutions.status, statusFilter.toUpperCase() as typeof schema.TaskExecutionStatusEnum[number]),
          );
        }
        const countResult = await prisma.drizzle
          .select({ count: sql<number>`count(*)` })
          .from(schema.taskExecutions)
          .where(
            statusFilter
              ? eq(schema.taskExecutions.status, statusFilter.toUpperCase() as typeof schema.TaskExecutionStatusEnum[number])
              : undefined,
          );
        const total = countResult[0]?.count ?? 0;
        const items = await baseQuery
          .orderBy(desc(schema.taskExecutions.startedAt))
          .limit(pageSize)
          .offset(offset);
        return {
          items: items.map((row: typeof schema.taskExecutions.$inferSelect) => ({
            id: row.id,
            taskName: row.taskName,
            status: row.status,
            startedAt: row.startedAt,
            completedAt: row.completedAt,
            durationMs: row.durationMs,
            errorMessage: row.errorMessage,
          })),
          total,
          page,
          pageSize,
        };
      },
    };

    dependencies.scheduler.setTaskExecutionsRepository(taskExecutionsRepo);

    registerSchedulerRoutes(app, {
      scheduler: dependencies.scheduler,
      settingsService: dependencies.settingsService,
      taskExecutionsRepository: taskExecutionsRepo,
    });
  }

  registerCustomFormatRoutes(app, dependencies);
  registerFilterRoutes(app, dependencies);
  registerImportListRoutes(app, dependencies);
  registerCollectionRoutes(app, dependencies);
  registerFilesystemRoutes(app, dependencies);
  registerImportRoutes(app, dependencies);
  registerLibraryRoutes(app, dependencies);
  registerTestRoutes(app, eventHub);

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
