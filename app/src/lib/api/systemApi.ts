import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

// Health status types
const healthStatusSchema = z.enum(['ok', 'warning', 'error', 'unknown']);

// System health check schema
const healthCheckSchema = z.object({
  type: z.string(),
  source: z.string(),
  message: z.string(),
  status: healthStatusSchema,
  lastChecked: z.string().optional(),
});

// System information schema
const systemInfoSchema = z.object({
  version: z.string(),
  branch: z.string(),
  commit: z.string(),
  startTime: z.string(),
  uptime: z.number(),
  dotNetVersion: z.string().optional(),
  os: z.string(),
  osVersion: z.string().optional(),
  isMono: z.boolean().optional(),
  isLinux: z.boolean().optional(),
  isWindows: z.boolean().optional(),
  isDocker: z.boolean().optional(),
});

// Database information schema
const databaseInfoSchema = z.object({
  type: z.string(),
  version: z.string(),
  migration: z.string(),
  location: z.string(),
});

// Disk space schema
const diskSpaceSchema = z.object({
  path: z.string(),
  label: z.string(),
  free: z.number(),
  total: z.number(),
});

// System status schema (main endpoint)
const systemStatusSchema = z.object({
  health: z.object({
    overall: healthStatusSchema,
    checks: z.array(healthCheckSchema),
  }),
  system: systemInfoSchema,
  database: databaseInfoSchema,
  diskSpace: z.array(diskSpaceSchema),
  dependencies: z.object({
    required: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
        status: healthStatusSchema,
      }),
    ),
    optional: z.array(
      z.object({
        name: z.string(),
        version: z.string().optional(),
        status: healthStatusSchema,
        reason: z.string().optional(),
      }),
    ),
  }),
});

// Health snapshot (lightweight endpoint for dashboard)
const healthSnapshotSchema = z.object({
  status: healthStatusSchema,
  indexers: z.array(
    z.object({
      indexerId: z.number(),
      indexerName: z.string(),
      severity: healthStatusSchema,
      snapshot: z.unknown().nullable().optional(),
    }),
  ),
});

// Scheduled task schema
const scheduledTaskSchema = z.object({
  id: z.union([z.string(), z.number()]),
  taskName: z.string(),
  interval: z.string(),
  lastExecution: z.string().nullable(),
  lastDuration: z.number().nullable(),
  nextExecution: z.string(),
  status: z.union([z.literal('pending'), z.literal('running'), z.literal('completed'), z.literal('failed')]),
});

// Queued task schema
const queuedTaskSchema = z.object({
  id: z.union([z.string(), z.number()]),
  taskName: z.string(),
  started: z.string(),
  duration: z.number().nullable(),
  progress: z.number().min(0).max(100),
  status: z.union([z.literal('running'), z.literal('queued'), z.literal('paused')]),
});

// Task history schema
const taskHistorySchema = z.object({
  id: z.number(),
  taskName: z.string(),
  started: z.string(),
  duration: z.number(),
  status: z.union([z.literal('success'), z.literal('failed')]),
  output: z.string().nullable(),
});

// Task details schema (same as history but with required output)
const taskDetailsSchema = z.object({
  id: z.number(),
  taskName: z.string(),
  started: z.string(),
  duration: z.number(),
  status: z.union([z.literal('success'), z.literal('failed')]),
  output: z.string().nullable(),
});

// Run task result schema
const runTaskResultSchema = z.object({
  taskId: z.union([z.string(), z.number()]),
  taskName: z.string(),
  queuedAt: z.string(),
});

// Cancel task result schema
const cancelTaskResultSchema = z.object({
  id: z.union([z.string(), z.number()]),
  taskName: z.string(),
  cancelled: z.boolean(),
});

// System event log schema
const eventLevelSchema = z.enum(['info', 'warning', 'error', 'fatal']);
const eventTypeSchema = z.enum([
  'system',
  'indexer',
  'network',
  'download',
  'import',
  'health',
  'update',
  'backup',
  'other',
]);

const systemEventSchema = z.object({
  id: z.number(),
  timestamp: z.string(),
  level: eventLevelSchema,
  type: eventTypeSchema,
  message: z.string(),
  source: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Event clear result schema
const eventClearResultSchema = z.object({
  cleared: z.number(),
  level: eventLevelSchema.optional(),
  before: z.string().optional(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type SystemInfo = z.infer<typeof systemInfoSchema>;
export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;
export type DiskSpace = z.infer<typeof diskSpaceSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>;
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>;
export type QueuedTask = z.infer<typeof queuedTaskSchema>;
export type TaskHistory = z.infer<typeof taskHistorySchema>;
export type TaskDetails = z.infer<typeof taskDetailsSchema>;
export type RunTaskResult = z.infer<typeof runTaskResultSchema>;
export type CancelTaskResult = z.infer<typeof cancelTaskResultSchema>;
export type EventLevel = z.infer<typeof eventLevelSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type SystemEvent = z.infer<typeof systemEventSchema>;
export type EventClearResult = z.infer<typeof eventClearResultSchema>;

export interface TaskHistoryQuery {
  page?: number;
  pageSize?: number;
  status?: 'success' | 'failed';
  taskName?: string;
}

export interface EventsQuery {
  page?: number;
  pageSize?: number;
  level?: EventLevel;
  type?: EventType;
  startDate?: string;
  endDate?: string;
}

export function createSystemApi(client: ApiHttpClient) {
  return {
    // Get comprehensive system status
    getStatus(): Promise<SystemStatus> {
      return client.request(
        {
          path: '/api/system/status',
        },
        systemStatusSchema,
      );
    },

    // Get health snapshot (lightweight)
    getHealth(): Promise<HealthSnapshot> {
      return client.request(
        {
          path: routeMap.health,
        },
        healthSnapshotSchema,
      );
    },

    // Check if system is healthy
    isHealthy(): Promise<{ ok: boolean; uptime: number }> {
      return client.request(
        {
          path: '/api/health',
        },
        z.object({
          ok: z.boolean(),
          uptime: z.number(),
        }),
      );
    },

    // Get scheduled tasks
    getScheduledTasks(): Promise<ScheduledTask[]> {
      return client.request(
        {
          path: routeMap.tasksScheduled,
        },
        z.array(scheduledTaskSchema),
      );
    },

    // Get queued/running tasks
    getQueuedTasks(): Promise<QueuedTask[]> {
      return client.request(
        {
          path: routeMap.tasksQueued,
        },
        z.array(queuedTaskSchema),
      );
    },

    // Get task history with pagination
    getTaskHistory(query: TaskHistoryQuery = {}): Promise<{ items: TaskHistory[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
      return client.requestPaginated(
        {
          path: routeMap.tasksHistory,
          query,
        },
        taskHistorySchema,
      );
    },

    // Get task details including output
    getTaskDetails(id: number): Promise<TaskDetails> {
      return client.request(
        {
          path: routeMap.taskDetails(id),
        },
        taskDetailsSchema,
      );
    },

    // Run a scheduled task
    runTask(taskId: string | number): Promise<RunTaskResult> {
      return client.request(
        {
          path: routeMap.taskRun(taskId),
          method: 'POST',
        },
        runTaskResultSchema,
      );
    },

    // Cancel a queued/running task
    cancelTask(taskId: number): Promise<CancelTaskResult> {
      return client.request(
        {
          path: routeMap.taskCancel(taskId),
          method: 'DELETE',
        },
        cancelTaskResultSchema,
      );
    },

    // Get system event logs
    getEvents(query: EventsQuery = {}): Promise<{ items: SystemEvent[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
      return client.requestPaginated(
        {
          path: routeMap.systemEvents,
          query,
        },
        systemEventSchema,
      );
    },

    // Clear system events
    clearEvents(options: { level?: EventLevel; before?: string } = {}): Promise<EventClearResult> {
      return client.request(
        {
          path: routeMap.systemEventsClear,
          method: 'DELETE',
          query: options,
        },
        eventClearResultSchema,
      );
    },

    // Export system events
    exportEvents(query: EventsQuery & { format: 'csv' | 'json' }): Promise<Blob> {
      return client.requestBlob(
        {
          path: routeMap.systemEventsExport,
          query,
          method: 'GET',
        },
      );
    },
  };
}
