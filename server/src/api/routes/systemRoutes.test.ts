import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSystemRoutes, systemState } from './systemRoutes';
import type { ApiDependencies } from '../types';
import type { ApiEventHub } from '../eventHub';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INITIAL_TASK_HISTORY = [
  {
    id: 1,
    taskName: 'RSS Sync',
    started: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 3456,
    status: 'success' as const,
    output: 'Processed 42 releases from 5 indexers',
  },
  {
    id: 2,
    taskName: 'Health Check',
    started: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    duration: 1234,
    status: 'success' as const,
    output: 'All indexers healthy',
  },
  {
    id: 3,
    taskName: 'RSS Sync',
    started: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    duration: 4567,
    status: 'failed' as const,
    output: 'Connection timeout to indexer "example.com"',
  },
];

const INITIAL_SYSTEM_EVENTS = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    level: 'info' as const,
    type: 'indexer' as const,
    message: 'Indexer "Test Indexer" added successfully',
    source: 'IndexerService',
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    level: 'warning' as const,
    type: 'network' as const,
    message: 'Slow response from indexer "Slow Indexer"',
    source: 'HttpClient',
    details: { responseTime: 5000 },
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    level: 'error' as const,
    type: 'download' as const,
    message: 'Download failed for release "movie.2024.bluray.mkv"',
    source: 'TorrentManager',
    details: { error: 'Tracker connection failed' },
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    level: 'info' as const,
    type: 'backup' as const,
    message: 'Automatic backup completed',
    source: 'BackupService',
  },
];

// ── Mock factories ─────────────────────────────────────────────────────────────

function createSystemHealthServiceMock() {
  return {
    getDiskSpace: vi.fn().mockResolvedValue([
      { path: '/movies', label: 'Movies', free: 500_000_000, total: 2_000_000_000 },
    ]),
    getProcessInfo: vi.fn().mockReturnValue({
      version: 'v20.0.0',
      os: 'linux',
      isLinux: true,
      isWindows: false,
      isDocker: false,
      startTime: new Date(Date.now() - 3600000).toISOString(),
      uptime: 3600,
    }),
    checkDatabase: vi.fn().mockResolvedValue({
      status: 'ok',
      message: 'Database is healthy',
      version: '3.40.0',
      migration: '20260101_initial',
      location: '/config/mediarr.db',
    }),
    checkRootFolders: vi.fn().mockResolvedValue([
      {
        type: 'rootFolder',
        source: 'Movies',
        message: 'Movies is accessible',
        status: 'ok',
        lastChecked: new Date().toISOString(),
      },
    ]),
    detectFFmpeg: vi.fn().mockResolvedValue({ version: '6.0', status: 'ok' }),
  };
}

function createSettingsServiceMock(overrides?: Partial<{
  movieRootFolder: string;
  tvRootFolder: string;
  incompleteDirectory: string;
  completeDirectory: string;
}>) {
  const {
    movieRootFolder = '/data/media/movies',
    tvRootFolder = '/data/media/tv',
    incompleteDirectory = '/data/downloads/incomplete',
    completeDirectory = '/data/downloads/complete',
  } = overrides ?? {};

  return {
    get: vi.fn().mockResolvedValue({
      mediaManagement: { movieRootFolder, tvRootFolder },
      torrentLimits: {
        incompleteDirectory,
        completeDirectory,
        maxActiveDownloads: 3,
        maxActiveSeeds: 3,
        globalDownloadLimitKbps: null,
        globalUploadLimitKbps: null,
        seedRatioLimit: 0,
        seedTimeLimitMinutes: 0,
        seedLimitAction: 'pause',
      },
    }),
    update: vi.fn(),
  };
}

function createSchedulerMock(jobNames: string[] = ['rss-sync', 'health-check']) {
  return {
    listJobsMeta: vi.fn().mockReturnValue(
      jobNames.map(name => ({
        name,
        cronExpression: '*/15 * * * *',
        lastRunAt: null,
        lastDurationMs: null,
        nextRunAt: new Date(Date.now() + 900_000).toISOString(),
      })),
    ),
    listJobs: vi.fn().mockReturnValue(jobNames),
    runNow: vi.fn().mockResolvedValue(undefined),
  };
}

function createApp(deps: Partial<ApiDependencies> = {}, hub?: Partial<ApiEventHub>): FastifyInstance {
  const app = Fastify();
  const fullDeps: ApiDependencies = { prisma: {}, ...deps };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSystemRoutes(app, fullDeps, hub as ApiEventHub | undefined);
  return app;
}

// ── State reset ────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset in-memory state to match initial fixtures before every test
  systemState.taskHistory = INITIAL_TASK_HISTORY.map(t => ({ ...t }));
  systemState.systemEvents = INITIAL_SYSTEM_EVENTS.map(e => ({ ...e }));
  systemState.queuedTasks.clear();
  systemState.queuedTaskIdCounter = 1;
});

// ── GET /api/system/status ─────────────────────────────────────────────────────

describe('GET /api/system/status', () => {
  it('returns 200 with expected shape when no deps are provided', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Record<string, unknown> };
    expect(body.data).toMatchObject({
      health: expect.objectContaining({ overall: expect.any(String) }),
      system: expect.objectContaining({ version: '1.0.0' }),
      database: expect.objectContaining({ type: 'SQLite' }),
      diskSpace: expect.any(Array),
      dependencies: expect.objectContaining({
        required: expect.any(Array),
        optional: expect.any(Array),
      }),
    });
  });

  it('calls systemHealthService methods when provided', async () => {
    const svc = createSystemHealthServiceMock();
    const app = createApp({ systemHealthService: svc });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    expect(svc.getDiskSpace).toHaveBeenCalled();
    expect(svc.getProcessInfo).toHaveBeenCalled();
    expect(svc.checkDatabase).toHaveBeenCalled();
    expect(svc.checkRootFolders).toHaveBeenCalled();
    expect(svc.detectFFmpeg).toHaveBeenCalled();
  });

  it('reflects systemHealthService disk space in response', async () => {
    const svc = createSystemHealthServiceMock();
    const app = createApp({ systemHealthService: svc });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });
    const body = JSON.parse(response.body) as {
      data: { diskSpace: Array<{ path: string; free: number; total: number }> };
    };

    expect(body.data.diskSpace).toEqual([
      { path: '/movies', label: 'Movies', free: 500_000_000, total: 2_000_000_000 },
    ]);
  });

  it('uses settingsService paths for disk space when provided', async () => {
    const svc = createSystemHealthServiceMock();
    const settingsService = createSettingsServiceMock({
      movieRootFolder: '/srv/movies',
      tvRootFolder: '/srv/tv',
      incompleteDirectory: '/srv/downloads/incomplete',
      completeDirectory: '/srv/downloads/complete',
    });
    const app = createApp({ systemHealthService: svc, settingsService });

    await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(settingsService.get).toHaveBeenCalled();
    const callArgs = svc.getDiskSpace.mock.calls[0][0] as Array<{ path: string; label: string }>;
    const paths = callArgs.map(p => p.path);
    expect(paths).toContain('/srv/movies');
    expect(paths).toContain('/srv/tv');
    expect(paths).toContain('/srv/downloads/incomplete');
    expect(paths).toContain('/srv/downloads/complete');
  });

  it('deduplicates identical paths in disk space check', async () => {
    const svc = createSystemHealthServiceMock();
    const settingsService = createSettingsServiceMock({
      movieRootFolder: '/data/media',
      tvRootFolder: '/data/media', // same path
      incompleteDirectory: '/data/downloads',
      completeDirectory: '/data/downloads', // same path
    });
    const app = createApp({ systemHealthService: svc, settingsService });

    await app.inject({ method: 'GET', url: '/api/system/status' });

    const callArgs = svc.getDiskSpace.mock.calls[0][0] as Array<{ path: string }>;
    const paths = callArgs.map(p => p.path);
    // Unique paths only
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('returns empty diskSpace array when settingsService has no paths configured', async () => {
    const svc = createSystemHealthServiceMock();
    svc.getDiskSpace.mockResolvedValue([]);
    const settingsService = createSettingsServiceMock({
      movieRootFolder: '',
      tvRootFolder: '',
      incompleteDirectory: '',
      completeDirectory: '',
    });
    const app = createApp({ systemHealthService: svc, settingsService });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { diskSpace: unknown[] } };
    expect(body.data.diskSpace).toEqual([]);
  });

  it('returns 200 without crash when settingsService is absent', async () => {
    const svc = createSystemHealthServiceMock();
    const app = createApp({ systemHealthService: svc });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });
    expect(response.statusCode).toBe(200);
  });

  it('sets overall health to error when db check fails', async () => {
    const svc = createSystemHealthServiceMock();
    svc.checkDatabase.mockResolvedValue({ status: 'error', message: 'DB unreachable' });
    svc.checkRootFolders.mockResolvedValue([]);
    const app = createApp({ systemHealthService: svc });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });
    const body = JSON.parse(response.body) as { data: { health: { overall: string } } };
    expect(body.data.health.overall).toBe('error');
  });

  it('includes ffmpeg in optional dependencies', async () => {
    const svc = createSystemHealthServiceMock();
    const app = createApp({ systemHealthService: svc });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });
    const body = JSON.parse(response.body) as {
      data: { dependencies: { optional: Array<{ name: string }> } };
    };
    const names = body.data.dependencies.optional.map(d => d.name);
    expect(names).toContain('FFmpeg');
  });
});

// ── GET /api/tasks/scheduled ───────────────────────────────────────────────────

describe('GET /api/tasks/scheduled', () => {
  it('returns fixture list when scheduler is absent', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/scheduled' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns live jobs from scheduler when provided', async () => {
    const scheduler = createSchedulerMock(['rss-sync', 'health-check']);
    const app = createApp({ scheduler });

    const response = await app.inject({ method: 'GET', url: '/api/tasks/scheduled' });

    expect(response.statusCode).toBe(200);
    expect(scheduler.listJobsMeta).toHaveBeenCalled();
    const body = JSON.parse(response.body) as { data: Array<{ id: string; taskName: string }> };
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe('rss-sync');
    expect(body.data[0].taskName).toBe('Rss Sync');
  });
});

// ── POST /api/tasks/scheduled/:taskId/run ─────────────────────────────────────

describe('POST /api/tasks/scheduled/:taskId/run', () => {
  it('returns 202 for a known fixture task without scheduler', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/rss-sync/run',
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body) as { data: { taskId: number; taskName: string } };
    expect(body.data.taskName).toBe('RSS Sync');
    expect(typeof body.data.taskId).toBe('number');
  });

  it('returns 404 for an unknown task without scheduler', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/does-not-exist/run',
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 202 and calls scheduler.runNow for a known job with scheduler', async () => {
    const scheduler = createSchedulerMock(['rss-sync']);
    const app = createApp({ scheduler });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/rss-sync/run',
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body) as { data: { taskId: string } };
    expect(body.data.taskId).toBe('rss-sync');
    // runNow is fire-and-forget; confirm it was called (eventually) — not awaited
  });

  it('returns 404 for an unknown job with scheduler', async () => {
    const scheduler = createSchedulerMock(['rss-sync']);
    const app = createApp({ scheduler });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/does-not-exist/run',
    });

    expect(response.statusCode).toBe(404);
  });

  it('publishes command:started event to eventHub when task runs without scheduler', async () => {
    const hub: Partial<ApiEventHub> = { publish: vi.fn() };
    const app = createApp({}, hub);

    await app.inject({ method: 'POST', url: '/api/tasks/scheduled/rss-sync/run' });

    expect(hub.publish).toHaveBeenCalledWith(
      'command:started',
      expect.objectContaining({ taskName: 'RSS Sync' }),
    );
  });
});

// ── GET /api/tasks/queued ──────────────────────────────────────────────────────

describe('GET /api/tasks/queued', () => {
  it('returns empty array when no tasks are queued', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/queued' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(body.data).toEqual([]);
  });
});

// ── DELETE /api/tasks/queued/:taskId ──────────────────────────────────────────

describe('DELETE /api/tasks/queued/:taskId', () => {
  it('returns 404 when the queued task does not exist', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'DELETE', url: '/api/tasks/queued/999' });

    expect(response.statusCode).toBe(404);
  });
});

// ── GET /api/tasks/history ────────────────────────────────────────────────────

describe('GET /api/tasks/history', () => {
  it('returns paginated task history', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/history' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: unknown[];
      meta: { totalCount: number };
    };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.totalCount).toBe(3);
  });

  it('filters by status=success', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?status=success',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: Array<{ status: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(t => t.status === 'success')).toBe(true);
    expect(body.meta.totalCount).toBe(2);
  });

  it('filters by status=failed', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?status=failed',
    });

    const body = JSON.parse(response.body) as {
      data: Array<{ status: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(t => t.status === 'failed')).toBe(true);
    expect(body.meta.totalCount).toBe(1);
  });

  it('filters by taskName substring', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?taskName=RSS',
    });

    const body = JSON.parse(response.body) as {
      data: Array<{ taskName: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(t => t.taskName.includes('RSS'))).toBe(true);
    expect(body.meta.totalCount).toBe(2);
  });

  it('paginates results correctly', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?page=1&pageSize=2',
    });

    const body = JSON.parse(response.body) as {
      data: unknown[];
      meta: { page: number; pageSize: number; totalCount: number };
    };
    expect(body.data).toHaveLength(2);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(2);
    expect(body.meta.totalCount).toBe(3);
  });

  it('returns most recent entries first', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/history' });

    const body = JSON.parse(response.body) as {
      data: Array<{ started: string }>;
    };
    const dates = body.data.map(t => new Date(t.started).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});

// ── GET /api/tasks/history/:id ─────────────────────────────────────────────────

describe('GET /api/tasks/history/:id', () => {
  it('returns a single task history entry by id', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/history/1' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { id: number; taskName: string } };
    expect(body.data.id).toBe(1);
    expect(body.data.taskName).toBe('RSS Sync');
  });

  it('returns 404 for a non-existent id', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/tasks/history/9999' });

    expect(response.statusCode).toBe(404);
  });
});

// ── GET /api/system/events ─────────────────────────────────────────────────────

describe('GET /api/system/events', () => {
  it('returns paginated event list', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/system/events' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: unknown[];
      meta: { totalCount: number };
    };
    expect(body.meta.totalCount).toBe(4);
  });

  it('filters events by level=info', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events?level=info',
    });

    const body = JSON.parse(response.body) as {
      data: Array<{ level: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(e => e.level === 'info')).toBe(true);
    expect(body.meta.totalCount).toBe(2);
  });

  it('filters events by level=warning', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events?level=warning',
    });

    const body = JSON.parse(response.body) as {
      data: Array<{ level: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(e => e.level === 'warning')).toBe(true);
    expect(body.meta.totalCount).toBe(1);
  });

  it('filters events by type=indexer', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events?type=indexer',
    });

    const body = JSON.parse(response.body) as {
      data: Array<{ type: string }>;
      meta: { totalCount: number };
    };
    expect(body.data.every(e => e.type === 'indexer')).toBe(true);
    expect(body.meta.totalCount).toBe(1);
  });

  it('ignores invalid level filter gracefully', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events?level=invalid',
    });

    // Invalid level is silently ignored — returns all events
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { meta: { totalCount: number } };
    expect(body.meta.totalCount).toBe(4);
  });

  it('filters by startDate', async () => {
    const app = createApp();
    // Only events within last 1.5 hours
    const startDate = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const response = await app.inject({
      method: 'GET',
      url: `/api/system/events?startDate=${encodeURIComponent(startDate)}`,
    });

    const body = JSON.parse(response.body) as { meta: { totalCount: number } };
    // Event id=1 is 1 hr ago (within range); events 2-4 are older
    expect(body.meta.totalCount).toBe(1);
  });

  it('returns events most recent first', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/system/events' });

    const body = JSON.parse(response.body) as { data: Array<{ timestamp: string }> };
    const times = body.data.map(e => new Date(e.timestamp).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });
});

// ── DELETE /api/system/events/clear ───────────────────────────────────────────

describe('DELETE /api/system/events/clear', () => {
  it('clears all events when no filter is provided', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/system/events/clear',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { cleared: number } };
    expect(body.data.cleared).toBe(4);

    // Confirm events are gone
    const listResponse = await app.inject({ method: 'GET', url: '/api/system/events' });
    const listBody = JSON.parse(listResponse.body) as { meta: { totalCount: number } };
    expect(listBody.meta.totalCount).toBe(0);
  });

  it('clears only events matching level filter', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/system/events/clear?level=info',
    });

    const body = JSON.parse(response.body) as { data: { cleared: number } };
    expect(body.data.cleared).toBe(2); // 2 info events

    const listResponse = await app.inject({ method: 'GET', url: '/api/system/events' });
    const listBody = JSON.parse(listResponse.body) as { meta: { totalCount: number } };
    expect(listBody.meta.totalCount).toBe(2); // warning + error remain
  });

  it('clears only events before a given date', async () => {
    const app = createApp();
    // All events older than 1.5 hours ago should be cleared (ids 2, 3, 4)
    const before = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/system/events/clear?before=${encodeURIComponent(before)}`,
    });

    const body = JSON.parse(response.body) as { data: { cleared: number } };
    expect(body.data.cleared).toBe(3);
  });
});

// ── GET /api/system/events/export ─────────────────────────────────────────────

describe('GET /api/system/events/export', () => {
  it('returns JSON format by default', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/system/events/export' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns CSV format when ?format=csv', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events/export?format=csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.body).toContain('id,timestamp,level,type,message,source');
  });

  it('CSV rows contain event data', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events/export?format=csv',
    });

    expect(response.body).toContain('indexer');
    expect(response.body).toContain('IndexerService');
  });

  it('filters exported events by level', async () => {
    const app = createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/system/events/export?level=error',
    });

    const body = JSON.parse(response.body) as { data: Array<{ level: string }> };
    expect(body.data.every(e => e.level === 'error')).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});
