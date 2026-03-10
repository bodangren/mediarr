import type { FastifyInstance, FastifyReply } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
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

// Types
type HealthStatus = 'ok' | 'warning' | 'error' | 'unknown';
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
type QueuedStatus = 'running' | 'queued' | 'paused';
type HistoryStatus = 'success' | 'failed';
type EventLevel = 'info' | 'warning' | 'error' | 'fatal';
type EventType = 'system' | 'indexer' | 'network' | 'download' | 'import' | 'health' | 'update' | 'backup' | 'other';

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
  if (isEventLevel(query.level)) filters.level = query.level;
  if (isEventType(query.type)) filters.type = query.type;
  const startDate = parseDate(query.startDate);
  if (startDate) filters.startDate = startDate;
  const endDate = parseDate(query.endDate);
  if (endDate) filters.endDate = endDate;
  return filters;
}

// In-memory state for tasks
interface ScheduledTask {
  id: string;
  taskName: string;
  interval: string;
  lastExecution: string | null;
  lastDuration: number | null;
  nextExecution: string;
  status: TaskStatus;
}

interface QueuedTask {
  id: number;
  taskName: string;
  started: string;
  duration: number | null;
  progress: number;
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

// Initial fixtures
const scheduledTasks: ScheduledTask[] = [
  {
    id: 'rss-sync',
    taskName: 'RSS Sync',
    interval: '15 minutes',
    lastExecution: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastDuration: 2345,
    nextExecution: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'health-check',
    taskName: 'Health Check',
    interval: '1 hour',
    lastExecution: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastDuration: 1234,
    nextExecution: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'backup-cleanup',
    taskName: 'Backup Cleanup',
    interval: '24 hours',
    lastExecution: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    lastDuration: 567,
    nextExecution: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'update-check',
    taskName: 'Update Check',
    interval: '6 hours',
    lastExecution: null,
    lastDuration: null,
    nextExecution: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
];

const queuedTasks: Map<number, QueuedTask> = new Map();
let queuedTaskIdCounter = 1;

let taskHistory: TaskHistoryEntry[] = [
  {
    id: 1,
    taskName: 'RSS Sync',
    started: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 3456,
    status: 'success',
    output: 'Processed 42 releases from 5 indexers',
  },
  {
    id: 2,
    taskName: 'Health Check',
    started: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    duration: 1234,
    status: 'success',
    output: 'All indexers healthy',
  },
  {
    id: 3,
    taskName: 'RSS Sync',
    started: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    duration: 4567,
    status: 'failed',
    output: 'Connection timeout to indexer "example.com"',
  },
];
let taskHistoryIdCounter = 4;

let systemEvents: SystemEvent[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    level: 'info',
    type: 'indexer',
    message: 'Indexer "Test Indexer" added successfully',
    source: 'IndexerService',
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    level: 'warning',
    type: 'network',
    message: 'Slow response from indexer "Slow Indexer"',
    source: 'HttpClient',
    details: { responseTime: 5000 },
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    level: 'error',
    type: 'download',
    message: 'Download failed for release "movie.2024.bluray.mkv"',
    source: 'TorrentManager',
    details: { error: 'Tracker connection failed' },
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    level: 'info',
    type: 'backup',
    message: 'Automatic backup completed',
    source: 'BackupService',
  },
];
let systemEventIdCounter = 5;

// Helper to filter events
function filterEvents(
  events: SystemEvent[],
  filters: {
    level?: EventLevel;
    type?: EventType;
    startDate?: Date;
    endDate?: Date;
  },
): SystemEvent[] {
  return events.filter(event => {
    if (filters.level && event.level !== filters.level) return false;
    if (filters.type && event.type !== filters.type) return false;
    if (filters.startDate) {
      const eventDate = new Date(event.timestamp);
      if (eventDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const eventDate = new Date(event.timestamp);
      if (eventDate > filters.endDate) return false;
    }
    return true;
  });
}

// Export state for testing
export const systemState = {
  get queuedTaskIdCounter() { return queuedTaskIdCounter; },
  set queuedTaskIdCounter(v) { queuedTaskIdCounter = v; },
  get taskHistory() { return taskHistory; },
  set taskHistory(v) { taskHistory = v; },
  get systemEvents() { return systemEvents; },
  set systemEvents(v) { systemEvents = v; },
  get queuedTasks() { return queuedTasks; },
};

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

    // Collect live data concurrently when service is available
    const diskPaths = [
      { path: '/data', label: 'Data Directory' },
      { path: '/data/downloads', label: 'Downloads' },
    ];
    const folderPaths = [
      { path: '/data/media', label: 'Media Root' },
      { path: '/data/downloads', label: 'Downloads Root' },
    ];

    const [diskSpace, processInfo, dbCheck, folderChecks, ffmpeg] = await Promise.all([
      svc
        ? svc.getDiskSpace(diskPaths)
        : Promise.resolve([
            { path: '/data', label: 'Data Directory', free: 0, total: 0 },
            { path: '/data/downloads', label: 'Downloads', free: 0, total: 0 },
          ]),
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

    const status = {
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

    return sendSuccess(reply, status);
  });

  // GET /api/tasks/scheduled
  app.get('/api/tasks/scheduled', async (_request, reply) => {
    if (deps.scheduler) {
      const liveJobs = deps.scheduler.listJobsMeta().map(job => ({
        id: job.name,
        taskName: formatJobName(job.name),
        interval: job.cronExpression,
        lastExecution: job.lastRunAt,
        lastDuration: job.lastDurationMs,
        nextExecution: job.nextRunAt,
        status: 'pending' as TaskStatus,
      }));
      return sendSuccess(reply, liveJobs);
    }
    return sendSuccess(reply, scheduledTasks);
  });

  // GET /api/tasks/queued
  app.get('/api/tasks/queued', async (_request, reply) => {
    const tasks = Array.from(queuedTasks.values());
    return sendSuccess(reply, tasks);
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

    let filtered = [...taskHistory];

    if (query.status === 'success' || query.status === 'failed') {
      filtered = filtered.filter(t => t.status === query.status);
    }
    if (typeof query.taskName === 'string' && query.taskName.trim()) {
      filtered = filtered.filter(t => t.taskName.includes(query.taskName as string));
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.started).getTime() - new Date(a.started).getTime());

    const { items, totalCount } = paginateArray(filtered, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  // GET /api/tasks/history/:id
  app.get('/api/tasks/history/:id', async (request, reply) => {
    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'task history');

    const entry = taskHistory.find(t => t.id === id);
    if (!entry) {
      throw new NotFoundError(`Task history entry with id ${id} not found`);
    }

    return sendSuccess(reply, entry);
  });

  // POST /api/tasks/scheduled/:taskId/run
  app.post('/api/tasks/scheduled/:taskId/run', async (request, reply) => {
    const params = request.params as { taskId?: string };
    const taskId = params.taskId;

    if (!taskId) {
      throw new ValidationError('Task ID is required');
    }

    // Use the real scheduler when available
    if (deps.scheduler) {
      const knownJobs = deps.scheduler.listJobs();
      if (!knownJobs.includes(taskId)) {
        throw new NotFoundError(`Scheduled task with id "${taskId}" not found`);
      }
      const taskName = formatJobName(taskId);
      const startedAt = new Date().toISOString();
      // Fire-and-forget (non-blocking response) — run in background
      void (async () => {
        try {
          await deps.scheduler!.runNow(taskId);
        } catch (err) {
          console.error(`Manual run of task '${taskId}' failed:`, err);
        }
      })();
      return sendSuccess(reply, { taskId, taskName, queuedAt: startedAt }, 202);
    }

    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task) {
      throw new NotFoundError(`Scheduled task with id "${taskId}" not found`);
    }

    // Create a queued task
    const queuedId = queuedTaskIdCounter++;
    const queuedTask: QueuedTask = {
      id: queuedId,
      taskName: task.taskName,
      started: new Date().toISOString(),
      duration: null,
      progress: 0,
      status: 'running',
    };
    queuedTasks.set(queuedId, queuedTask);

    // Publish command:started event
    if (eventHub) {
      eventHub.publish('command:started', {
        taskId: queuedId,
        taskName: task.taskName,
        queuedAt: queuedTask.started,
      });
    }

    // Simulate async completion (in real impl, this would be handled by a task runner)
    setTimeout(() => {
      queuedTasks.delete(queuedId);

      // Add to history
      const historyEntry: TaskHistoryEntry = {
        id: taskHistoryIdCounter++,
        taskName: task.taskName,
        started: queuedTask.started,
        duration: Math.floor(Math.random() * 5000) + 1000,
        status: Math.random() > 0.1 ? 'success' : 'failed',
        output: 'Task completed successfully',
      };
      taskHistory.unshift(historyEntry);

      // Publish command:completed event
      if (eventHub) {
        eventHub.publish('command:completed', {
          taskId: queuedId,
          taskName: task.taskName,
          historyId: historyEntry.id,
          status: historyEntry.status,
          duration: historyEntry.duration,
        });
      }
    }, 2000);

    return sendSuccess(reply, {
      taskId: queuedId,
      taskName: task.taskName,
      queuedAt: queuedTask.started,
    }, 202);
  });

  // DELETE /api/tasks/queued/:taskId
  app.delete('/api/tasks/queued/:taskId', async (request, reply) => {
    const params = request.params as { taskId?: string };
    const taskId = parseIdParam(params.taskId ?? '', 'queued task');

    const task = queuedTasks.get(taskId);
    if (!task) {
      throw new NotFoundError(`Queued task with id ${taskId} not found`);
    }

    queuedTasks.delete(taskId);

    return sendSuccess(reply, {
      id: taskId,
      taskName: task.taskName,
      cancelled: true,
    });
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

    const filtered = filterEvents(systemEvents, filters);
    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
    const level = isEventLevel(query.level) ? query.level : undefined;

    const initialCount = systemEvents.length;

    systemEvents = systemEvents.filter(event => {
      if (level && event.level !== level) return true;
      if (before && new Date(event.timestamp) >= before) return true;
      if (!level && !before) return false;
      return true;
    });

    const cleared = initialCount - systemEvents.length;

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

    const filtered = filterEvents(systemEvents, filters);
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const format = (query.format as 'csv' | 'json') || 'json';

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
