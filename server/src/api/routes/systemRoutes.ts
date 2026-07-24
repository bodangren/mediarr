import type { FastifyInstance } from 'fastify';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/domainErrors';
import {
  buildSuccessEnvelope,
  paginateArray,
  parsePaginationParams,
  sendPaginatedSuccess,
  sendSuccess,
} from '../contracts';
import { parseDate, parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';
import type { ApiEventHub } from '../eventHub';
import type { TaskExecutionRecord } from '../../repositories/TaskExecutionsRepository';
import type { ActivityEvent } from '../../types/modelTypes';

// Types
type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'disabled';
type QueuedStatus = 'running' | 'queued' | 'paused';
type HistoryStatus = 'success' | 'failed';
type EventLevel = 'info' | 'warning' | 'error' | 'fatal';
type EventType = 'system' | 'indexer' | 'network' | 'download' | 'import' | 'health' | 'update' | 'backup' | 'other';
type PersistedTaskStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

const EVENT_LEVELS: ReadonlySet<EventLevel> = new Set(['info', 'warning', 'error', 'fatal']);
const EVENT_TYPES: ReadonlySet<EventType> = new Set(['system', 'indexer', 'network', 'download', 'import', 'health', 'update', 'backup', 'other']);

function isEventLevel(v: unknown): v is EventLevel {
  return typeof v === 'string' && EVENT_LEVELS.has(v as EventLevel);
}

function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && EVENT_TYPES.has(v as EventType);
}

function parseEventFilters(query: Record<string, unknown>): {
  level?: EventLevel;
  type?: EventType;
  startDate?: Date;
  endDate?: Date;
} {
  const filters: { level?: EventLevel; type?: EventType; startDate?: Date; endDate?: Date } = {};
  if (query.level !== undefined && !isEventLevel(query.level)) {
    throw new ValidationError('Invalid system event level');
  }
  if (query.type !== undefined && !isEventType(query.type)) {
    throw new ValidationError('Invalid system event type');
  }
  if (isEventLevel(query.level)) filters.level = query.level;
  if (isEventType(query.type)) filters.type = query.type;
  const startDate = parseDate(query.startDate);
  if (query.startDate !== undefined && !startDate) {
    throw new ValidationError('Invalid system event startDate');
  }
  if (startDate) filters.startDate = startDate;
  const endDate = parseDate(query.endDate);
  if (query.endDate !== undefined && !endDate) {
    throw new ValidationError('Invalid system event endDate');
  }
  if (endDate) filters.endDate = endDate;
  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError('system event startDate must not be after endDate');
  }
  return filters;
}

// In-memory state for tasks
interface ScheduledTask {
  id: string;
  taskName: string;
  interval: string;
  lastExecution: string | null;
  lastDuration: number | null;
  nextExecution: string | null;
  status: TaskStatus;
}

interface QueuedTask {
  id: number;
  taskName: string;
  started: string;
  duration: number | null;
  progress: number | null;
  status: QueuedStatus;
}

interface TaskHistoryEntry {
  id: number;
  taskName: string;
  started: string;
  duration: number;
  status: HistoryStatus;
  output: string | null;
}

interface SystemEvent {
  id: number;
  timestamp: string;
  level: EventLevel;
  type: EventType;
  message: string;
  source?: string;
  details?: Record<string, unknown>;
}

type TaskExecutionRepository = NonNullable<ApiDependencies['taskExecutionsRepository']>;
type ActivityEventRepository = NonNullable<ApiDependencies['activityEventRepository']>;

function requireScheduler(deps: ApiDependencies): NonNullable<ApiDependencies['scheduler']> {
  if (!deps.scheduler) {
    throw new Error('Scheduler is not configured');
  }
  return deps.scheduler;
}

function requireTaskExecutionsRepository(deps: ApiDependencies): TaskExecutionRepository {
  const repository = deps.taskExecutionsRepository;
  if (!repository) {
    throw new Error('Task execution repository is not configured');
  }
  return repository;
}

function requireActivityEventRepository(deps: ApiDependencies): ActivityEventRepository {
  const repository = deps.activityEventRepository;
  if (!repository) {
    throw new Error('Activity event repository is not configured');
  }
  return repository;
}

function normalizeTaskStatus(status: string): PersistedTaskStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'RUNNING' || normalized === 'SUCCESS' || normalized === 'FAILED') {
    return normalized;
  }
  throw new Error(`Unsupported persisted task status "${status}"`);
}

function toHistoryEntry(record: TaskExecutionRecord): TaskHistoryEntry {
  const status = normalizeTaskStatus(record.status);
  if (status === 'RUNNING') {
    throw new Error(`Running task execution ${record.id} cannot be represented as history`);
  }
  return {
    id: record.id,
    taskName: record.taskName,
    started: record.startedAt.toISOString(),
    duration: record.durationMs
      ?? (record.completedAt ? record.completedAt.getTime() - record.startedAt.getTime() : 0),
    status: status === 'SUCCESS' ? 'success' : 'failed',
    output: record.errorMessage,
  };
}

function toQueuedTask(record: TaskExecutionRecord): QueuedTask {
  if (normalizeTaskStatus(record.status) !== 'RUNNING') {
    throw new Error(`Task execution ${record.id} is not running`);
  }
  return {
    id: record.id,
    taskName: record.taskName,
    started: record.startedAt.toISOString(),
    duration: record.durationMs,
    progress: null,
    status: 'running',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classifyEventType(event: ActivityEvent): EventType {
  const discriminator = `${event.eventType} ${event.sourceModule}`.toLowerCase();
  if (discriminator.includes('indexer') || discriminator.includes('rss')) return 'indexer';
  if (discriminator.includes('network') || discriminator.includes('http')) return 'network';
  if (discriminator.includes('download') || discriminator.includes('torrent')) return 'download';
  if (discriminator.includes('import')) return 'import';
  if (discriminator.includes('health')) return 'health';
  if (discriminator.includes('update')) return 'update';
  if (discriminator.includes('backup')) return 'backup';
  if (discriminator.includes('system') || discriminator.includes('scheduler') || discriminator.includes('task')) return 'system';
  return 'other';
}

function toSystemEvent(event: ActivityEvent): SystemEvent {
  return {
    id: event.id,
    timestamp: event.occurredAt.toISOString(),
    level: event.success ? 'info' : 'error',
    type: classifyEventType(event),
    message: event.summary,
    source: event.sourceModule,
    ...(isRecord(event.details) ? { details: event.details } : {}),
  };
}

function filterEvents(
  events: SystemEvent[],
  filters: ReturnType<typeof parseEventFilters>,
): SystemEvent[] {
  return events.filter(event => {
    if (filters.level && event.level !== filters.level) return false;
    if (filters.type && event.type !== filters.type) return false;
    const occurredAt = new Date(event.timestamp);
    if (filters.startDate && occurredAt < filters.startDate) return false;
    if (filters.endDate && occurredAt > filters.endDate) return false;
    return true;
  });
}

/** Convert a kebab-case job name like 'rss-sync' to 'RSS Sync'. */
function formatJobName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function registerSystemRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
  eventHub?: ApiEventHub,
): void {
  // GET /api/system/status
  app.get('/api/system/status', async (_request, reply) => {
    const svc = deps.systemHealthService;

    // Resolve disk-space and folder paths dynamically from AppSettings when available
    const diskPaths: Array<{ path: string; label: string }> = [];
    let folderPaths: Array<{ path: string; label: string }> = [];

    if (deps.settingsService) {
      try {
        const settings = await deps.settingsService.get();
        const seen = new Set<string>();
        const addDisk = (path: string, label: string) => {
          if (path && !seen.has(path)) {
            seen.add(path);
            diskPaths.push({ path, label });
          }
        };
        addDisk(settings.mediaManagement.movieRootFolder, 'Movies');
        addDisk(settings.mediaManagement.tvRootFolder, 'TV Shows');
        addDisk(settings.torrentLimits.incompleteDirectory, 'Downloads (Incomplete)');
        addDisk(settings.torrentLimits.completeDirectory, 'Downloads (Complete)');

        folderPaths = [
          ...(settings.mediaManagement.movieRootFolder
            ? [{ path: settings.mediaManagement.movieRootFolder, label: 'Movies' }]
            : []),
          ...(settings.mediaManagement.tvRootFolder
            ? [{ path: settings.mediaManagement.tvRootFolder, label: 'TV Shows' }]
            : []),
        ];
      } catch {
        // Fall back to empty paths; non-fatal
      }
    }

    const [diskSpace, processInfo, dbCheck, folderChecks, ffmpeg] = await Promise.all([
      svc
        ? svc.getDiskSpace(diskPaths)
        : Promise.resolve([]),
      svc
        ? Promise.resolve(svc.getProcessInfo())
        : Promise.resolve({
            version: process.version,
            os: process.platform,
            isLinux: process.platform === 'linux',
            isWindows: process.platform === 'win32',
            isDocker: false,
            startTime: new Date(Date.now() - 3600000).toISOString(),
            uptime: 3600,
          }),
      svc
        ? svc.checkDatabase()
        : Promise.resolve({ status: 'unknown' as HealthStatus, message: 'Health service not initialized' }),
      svc
        ? svc.checkRootFolders(folderPaths)
        : Promise.resolve([]),
      svc
        ? svc.detectFFmpeg()
        : Promise.resolve({ version: undefined, status: 'unknown' as HealthStatus }),
    ]);

    // Build health checks list from real results
    const healthChecks = [
      {
        type: 'database',
        source: 'SQLite',
        message: dbCheck.message,
        status: dbCheck.status,
        lastChecked: new Date().toISOString(),
      },
      ...folderChecks,
    ];
    const overallHealth: HealthStatus = healthChecks.some(c => c.status === 'error')
      ? 'error'
      : healthChecks.some(c => c.status === 'warning')
        ? 'warning'
        : 'ok';

    const status: Record<string, unknown> = {
      health: {
        overall: overallHealth,
        checks: healthChecks,
      },
      system: {
        version: '1.0.0',
        branch: 'main',
        commit: process.env.GIT_COMMIT ?? 'unknown',
        startTime: processInfo.startTime,
        uptime: processInfo.uptime,
        os: processInfo.os,
        isLinux: processInfo.isLinux,
        isWindows: processInfo.isWindows,
        isDocker: processInfo.isDocker,
      },
      database: {
        type: 'SQLite',
        version: ('version' in dbCheck ? dbCheck.version : undefined) ?? 'unknown',
        migration: ('migration' in dbCheck ? dbCheck.migration : undefined) ?? 'unknown',
        location: ('location' in dbCheck ? dbCheck.location : undefined) ?? 'unknown',
      },
      diskSpace,
      dependencies: {
        required: [
          { name: 'Node.js', version: processInfo.version, status: 'ok' as HealthStatus },
          {
            name: 'SQLite',
            version: ('version' in dbCheck ? dbCheck.version : undefined) ?? 'unknown',
            status: dbCheck.status === 'ok' ? 'ok' as HealthStatus : 'error' as HealthStatus,
          },
        ],
        optional: [
          {
            name: 'FFmpeg',
            version: ffmpeg.version,
            status: ffmpeg.status,
            reason: ffmpeg.status === 'unknown' ? 'Not installed or not in PATH' : undefined,
          },
          { name: 'Mono', version: undefined, status: 'unknown' as HealthStatus, reason: 'Not installed' },
        ],
      },
    };

    // Additive scheduler health — only included when the runtime wires a
    // Scheduler instance into the API deps. Pre-existing health consumers
    // that ignore this field keep working unchanged.
    if (deps.scheduler) {
      status.scheduler = deps.scheduler.getHealth();
    }

    return sendSuccess(reply, status);
  });

  // GET /api/tasks/scheduled
  app.get('/api/tasks/scheduled', async (_request, reply) => {
    const running = await requireTaskExecutionsRepository(deps).query({
      page: 1,
      pageSize: 100,
      status: 'running',
    });
    const runningNames = new Set(running.items.map(item => item.taskName));
    const liveJobs: ScheduledTask[] = requireScheduler(deps).listJobsMeta().map(job => ({
      id: job.name,
      taskName: formatJobName(job.name),
      interval: job.cronExpression,
      lastExecution: job.lastRunAt,
      lastDuration: job.lastDurationMs,
      nextExecution: job.nextRunAt,
      status: !job.enabled
        ? 'disabled'
        : runningNames.has(job.name) ? 'running' : 'pending',
    }));
    return sendSuccess(reply, liveJobs);
  });

  // GET /api/tasks/queued
  app.get('/api/tasks/queued', async (_request, reply) => {
    const result = await requireTaskExecutionsRepository(deps).query({
      page: 1,
      pageSize: 100,
      status: 'running',
    });
    return sendSuccess(reply, result.items.map(toQueuedTask));
  });

  // GET /api/tasks/history
  app.get('/api/tasks/history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
          status: { type: 'string' },
          taskName: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    if (query.status !== undefined && query.status !== 'success' && query.status !== 'failed') {
      throw new ValidationError('Task history status must be success or failed');
    }
    const status = query.status === 'success' || query.status === 'failed'
      ? query.status
      : undefined;
    const taskName = typeof query.taskName === 'string' && query.taskName.trim()
      ? query.taskName.trim()
      : undefined;
    const result = await requireTaskExecutionsRepository(deps).query({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(status ? { status } : {}),
      ...(taskName ? { taskName } : {}),
    });

    return sendPaginatedSuccess(reply, result.items.map(toHistoryEntry), {
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.total,
    });
  });

  // GET /api/tasks/history/:id
  app.get('/api/tasks/history/:id', async (request, reply) => {
    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'task history');

    const entry = await requireTaskExecutionsRepository(deps).findById(id);
    if (!entry) {
      throw new NotFoundError(`Task history entry with id ${id} not found`);
    }

    return sendSuccess(reply, toHistoryEntry(entry));
  });

  // POST /api/tasks/scheduled/:taskId/run
  app.post('/api/tasks/scheduled/:taskId/run', async (request, reply) => {
    const params = request.params as { taskId?: string };
    const taskId = params.taskId;

    if (!taskId) {
      throw new ValidationError('Task ID is required');
    }

    const scheduler = requireScheduler(deps);
    const activityEvents = requireActivityEventRepository(deps);
    if (!scheduler.listJobs().includes(taskId)) {
      throw new NotFoundError(`Scheduled task with id "${taskId}" not found`);
    }
    const taskName = formatJobName(taskId);
    const queuedAt = new Date().toISOString();
    eventHub?.publish('command:started', { taskId, taskName, queuedAt });

    try {
      const executed = await scheduler.triggerTask(taskId);
      if (!executed) {
        throw new ConflictError(`Scheduled task "${taskId}" is disabled or already running`);
      }
      await activityEvents.create({
        eventType: 'TASK_EXECUTED',
        sourceModule: 'Scheduler',
        entityRef: `task:${taskId}`,
        summary: `Manual task "${taskName}" completed`,
        success: true,
      });
      eventHub?.publish('command:completed', { taskId, taskName, status: 'success' });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      await activityEvents.create({
        eventType: 'TASK_FAILED',
        sourceModule: 'Scheduler',
        entityRef: `task:${taskId}`,
        summary: `Manual task "${taskName}" failed`,
        success: false,
        details: { error: message },
      });
      eventHub?.publish('command:completed', { taskId, taskName, status: 'failed' });
      throw error;
    }

    return sendSuccess(reply, { taskId, taskName, queuedAt }, 202);
  });

  // DELETE /api/tasks/queued/:taskId
  app.delete('/api/tasks/queued/:taskId', async (request) => {
    const params = request.params as { taskId?: string };
    const taskId = parseIdParam(params.taskId ?? '', 'queued task');

    const task = await requireTaskExecutionsRepository(deps).findById(taskId);
    if (!task || normalizeTaskStatus(task.status) !== 'RUNNING') {
      throw new NotFoundError(`Queued task with id ${taskId} not found`);
    }
    throw new ConflictError('Running scheduler tasks cannot be cancelled');
  });

  // GET /api/system/events
  app.get('/api/system/events', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
          level: { type: 'string' },
          type: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    const filters = parseEventFilters(query);

    const persisted = await requireActivityEventRepository(deps).export({
      ...(filters.level === 'info' ? { success: true } : {}),
      ...(filters.level === 'error' ? { success: false } : {}),
      ...(filters.startDate ? { from: filters.startDate } : {}),
      ...(filters.endDate ? { to: filters.endDate } : {}),
    });
    const filtered = filterEvents(persisted.map(toSystemEvent), filters);
    const { items, totalCount } = paginateArray(filtered, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  // DELETE /api/system/events/clear
  app.delete('/api/system/events/clear', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          before: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;

    const before = parseDate(query.before);
    if (query.before !== undefined && !before) {
      throw new ValidationError('Invalid system event before date');
    }
    if (query.level !== undefined && !isEventLevel(query.level)) {
      throw new ValidationError('Invalid system event level');
    }
    const level = isEventLevel(query.level) ? query.level : undefined;

    const cleared = level === 'warning' || level === 'fatal'
      ? 0
      : await requireActivityEventRepository(deps).clear({
        ...(level === 'info' ? { success: true } : {}),
        ...(level === 'error' ? { success: false } : {}),
        ...(before ? { to: new Date(before.getTime() - 1) } : {}),
      });

    return sendSuccess(reply, {
      cleared,
      level,
      before: before?.toISOString(),
    });
  });

  // GET /api/system/events/export
  app.get('/api/system/events/export', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          type: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          format: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;

    const filters = parseEventFilters(query);
    if (query.format !== undefined && query.format !== 'csv' && query.format !== 'json') {
      throw new ValidationError('System event export format must be csv or json');
    }

    const persisted = await requireActivityEventRepository(deps).export({
      ...(filters.level === 'info' ? { success: true } : {}),
      ...(filters.level === 'error' ? { success: false } : {}),
      ...(filters.startDate ? { from: filters.startDate } : {}),
      ...(filters.endDate ? { to: filters.endDate } : {}),
    });
    const filtered = filterEvents(persisted.map(toSystemEvent), filters);

    const format = query.format ?? 'json';

    if (format === 'csv') {
      const header = 'id,timestamp,level,type,message,source\n';
      const rows = filtered.map(e =>
        `${e.id},${e.timestamp},${e.level},${e.type},"${e.message.replace(/"/g, '""')}",${e.source || ''}`
      ).join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="system-events.csv"');
      return reply.send(header + rows);
    }

    // JSON format
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="system-events.json"');
    return reply.send(JSON.stringify(buildSuccessEnvelope(filtered), null, 2));
  });
}
