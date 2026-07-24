import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';
import { updatesState } from '../server/src/api/routes/updatesRoutes';
import { LogReaderService } from '../server/src/services/LogReaderService';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { NotFoundError } from '../server/src/errors/domainErrors';

function createMockUpdateService() {
  const progressMap = new Map<string, any>();
  const history: any[] = [];
  let updateCounter = 1;
  let available: any = null;

  return {
    getCurrentVersionInfo() {
      return {
        version: '1.0.0',
        branch: 'main',
        commit: 'abc123',
        buildDate: '2026-04-09T00:00:00.000Z',
      };
    },
    getLatestRelease() {
      return available;
    },
    listHistory() {
      return [...history];
    },
    listProgress() {
      return Array.from(progressMap.values());
    },
    async checkForUpdate() {
      available = {
        version: '1.1.0',
        tagName: 'v1.1.0',
        changelog: 'mock changelog',
        publishedAt: '2026-04-09T12:00:00.000Z',
        downloadUrl: 'https://example.com/download',
        assetName: 'mediarr-linux-x64',
        assetContentType: 'application/octet-stream',
        expectedChecksum: null,
      };

      return {
        checkedAt: '2026-04-09T12:00:00.000Z',
        currentVersion: '1.0.0',
        updateAvailable: true,
        isDocker: false,
        release: available,
      };
    },
    async downloadUpdate(input?: { version?: string }) {
      const version = input?.version ?? available?.version ?? '1.1.0';
      const updateId = `update-${updateCounter++}`;
      const progress = {
        updateId,
        version,
        status: 'completed',
        progress: 100,
        bytesDownloaded: 1000,
        totalBytes: 1000,
        message: 'Download completed',
        startedAt: '2026-04-09T12:00:00.000Z',
        completedAt: '2026-04-09T12:01:00.000Z',
        stagedPath: `/tmp/mediarr-${version}`,
      };
      progressMap.set(updateId, progress);
      return progress;
    },
    async installUpdate(input: { version?: string; updateId?: string }) {
      const fromProgress = input.updateId ? progressMap.get(input.updateId) : null;
      const version = input.version ?? fromProgress?.version ?? '1.1.0';
      history.unshift({
        id: history.length + 1,
        version,
        installedDate: '2026-04-09T12:02:00.000Z',
        status: 'success',
        branch: 'master',
        message: 'Installed',
      });
      return {
        mode: 'binary',
        status: 'installed',
        version,
        message: 'Installed',
      };
    },
    getProgress(updateId: string) {
      return progressMap.get(updateId) ?? null;
    },
    resetForTests() {
      available = null;
      history.splice(0, history.length);
      progressMap.clear();
      updateCounter = 1;
    },
  };
}

function createSystemPersistenceDeps() {
  const taskExecutions = [
    {
      id: 1,
      taskName: 'RSS Sync',
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 3456),
      durationMs: 3456,
      status: 'SUCCESS',
      errorMessage: null,
    },
    {
      id: 2,
      taskName: 'Health Check',
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000 + 1234),
      durationMs: 1234,
      status: 'SUCCESS',
      errorMessage: null,
    },
    {
      id: 3,
      taskName: 'RSS Sync',
      startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 4567),
      durationMs: 4567,
      status: 'FAILED',
      errorMessage: 'Connection timeout',
    },
  ];
  let activityEvents = [
    {
      id: 1,
      eventType: 'INDEXER_ADDED',
      sourceModule: 'IndexerService',
      entityRef: 'indexer:1',
      summary: 'Indexer added successfully',
      success: true,
      details: null,
      occurredAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      id: 2,
      eventType: 'DOWNLOAD_FAILED',
      sourceModule: 'TorrentManager',
      entityRef: 'torrent:1',
      summary: 'Download failed',
      success: false,
      details: { error: 'tracker unavailable' },
      occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  const taskExecutionsRepository = {
    create: async () => taskExecutions[0]!,
    update: async () => {},
    prune: async () => 0,
    async query(input: { page: number; pageSize: number; status?: string; taskName?: string }) {
      let filtered = taskExecutions.filter(item => item.status !== 'RUNNING');
      if (input.status) filtered = filtered.filter(item => item.status === input.status!.toUpperCase());
      if (input.taskName) filtered = filtered.filter(item => item.taskName.includes(input.taskName!));
      const offset = (input.page - 1) * input.pageSize;
      return {
        items: filtered.slice(offset, offset + input.pageSize),
        total: filtered.length,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
    async findById(id: number) {
      return taskExecutions.find(item => item.id === id) ?? null;
    },
  };
  const activityEventRepository = {
    async create(input: Record<string, unknown>) {
      const event = {
        id: activityEvents.length + 1,
        eventType: String(input.eventType),
        sourceModule: String(input.sourceModule),
        entityRef: typeof input.entityRef === 'string' ? input.entityRef : null,
        summary: String(input.summary),
        success: input.success === true,
        details: input.details ?? null,
        occurredAt: new Date(),
      };
      activityEvents.unshift(event);
      return event;
    },
    async query() {
      return { items: activityEvents, total: activityEvents.length, page: 1, pageSize: 25 };
    },
    async clear(input: { success?: boolean; to?: Date } = {}) {
      const before = activityEvents.length;
      activityEvents = activityEvents.filter(event => {
        const matchesSuccess = input.success === undefined || event.success === input.success;
        const matchesDate = input.to === undefined || event.occurredAt <= input.to;
        return !(matchesSuccess && matchesDate);
      });
      return before - activityEvents.length;
    },
    async markAsFailed() { return null; },
    async export(input: { success?: boolean; from?: Date; to?: Date } = {}) {
      return activityEvents.filter(event =>
        (input.success === undefined || event.success === input.success)
        && (input.from === undefined || event.occurredAt >= input.from)
        && (input.to === undefined || event.occurredAt <= input.to));
    },
  };
  const scheduler = {
    listJobsMeta: () => [{
      name: 'rss-sync',
      cronExpression: '*/15 * * * *',
      lastRunAt: null,
      lastDurationMs: null,
      nextRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      enabled: true,
      status: 'healthy',
    }],
    listJobs: () => ['rss-sync'],
    runNow: async () => {},
    triggerTask: async () => true,
    isScheduled: () => true,
    reschedule: () => {},
    setTaskExecutionsRepository: () => {},
    toggleEnabled: async () => {},
    getHealth: () => ({ scheduledTaskCount: 1, missedTaskCount: 0 }),
  };

  return { activityEventRepository, scheduler, taskExecutionsRepository };
}

// Minimal runtime dependencies with explicit repository-backed system state.
const createMinimalDeps = () => ({
  ...createSystemPersistenceDeps(),
  prisma: {},
  logReaderService: (() => {
    const service = new LogReaderService();
    service.push('info', 'test server started');
    service.push('warn', 'test warning');
    return service;
  })(),
  settingsService: (() => {
    const state = {
      mediaManagement: {
        movieRootFolder: '',
        tvRootFolder: '',
      },
      update: {
        branch: 'master',
        autoUpdateEnabled: false,
        mechanicsEnabled: false,
        updateScriptPath: null,
        setupCompleted: false,
      },
    };

    return {
      get: async () => state,
      update: async (partial: { update?: { setupCompleted?: boolean } }) => {
        if (partial?.update) {
          state.update = {
            ...state.update,
            ...partial.update,
          };
        }

        return state;
      },
    };
  })(),
  indexerRepository: {
    findAll: async () => [],
  },
  updateService: createMockUpdateService(),
  backupService: {
    async list() {
      return [{
        id: 'manual_backup_test.db',
        name: 'manual_backup_test.db',
        path: '/tmp/manual_backup_test.db',
        size: 4096,
        created: '2026-07-24T03:00:00.000Z',
        type: 'manual' as const,
      }];
    },
    async create() {
      return {
        id: 'manual_backup_created.db',
        name: 'manual_backup_created.db',
        path: '/tmp/manual_backup_created.db',
        size: 4096,
        created: '2026-07-24T03:00:00.000Z',
        type: 'manual' as const,
      };
    },
    async get(id: string) {
      if (id !== 'manual_backup_test.db') throw new NotFoundError('not found');
      return {
        id,
        name: id,
        path: '/tmp/manual_backup_test.db',
        size: 4096,
        created: '2026-07-24T03:00:00.000Z',
        type: 'manual' as const,
      };
    },
    async restore(id: string) {
      if (id !== 'manual_backup_test.db') throw new NotFoundError('not found');
      return {
        id,
        name: id,
        restoredAt: '2026-07-24T03:00:00.000Z',
        restartRequired: true as const,
        safetyBackupId: 'manual_backup_safety.db',
      };
    },
    async delete(id: string) {
      if (id !== 'manual_backup_test.db') throw new NotFoundError('not found');
    },
    async getSchedule() {
      return {
        supported: false,
        enabled: false,
        interval: 'daily' as const,
        retentionDays: 30,
        nextBackup: null,
        lastBackup: null,
      };
    },
    async updateSchedule(input: {
      enabled: boolean;
      interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
      retentionDays: number;
    }) {
      return {
        supported: false,
        enabled: false,
        interval: input.interval,
        retentionDays: input.retentionDays,
        nextBackup: null,
        lastBackup: null,
      };
    },
  },
});

function createTestApp() {
  const app = createApiServer(createMinimalDeps() as any, {
    torrentStatsIntervalMs: 60_000,
    activityPollIntervalMs: 60_000,
    healthPollIntervalMs: 60_000,
  });
  return app;
}

describe('System routes', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  describe('GET /api/system/status', () => {
    it('returns system status envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/status' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('health');
      expect(payload.data).toHaveProperty('system');
      expect(payload.data).toHaveProperty('database');
      expect(payload.data).toHaveProperty('diskSpace');
      expect(payload.data).toHaveProperty('dependencies');
      expect(payload.data.system).toHaveProperty('version');
      expect(payload.data.system).toHaveProperty('uptime');
      expect(payload.data.system).toHaveProperty('os');
      expect(typeof payload.data.system.uptime).toBe('number');
    });
  });

  describe('GET /api/tasks/scheduled', () => {
    it('returns scheduled tasks envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/scheduled' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      expect(payload.data.length).toBeGreaterThan(0);
      expect(payload.data[0]).toHaveProperty('id');
      expect(payload.data[0]).toHaveProperty('taskName');
      expect(payload.data[0]).toHaveProperty('interval');
      expect(payload.data[0]).toHaveProperty('status');
    });
  });

  describe('GET /api/tasks/queued', () => {
    it('returns empty queued tasks initially', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/queued' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
    });
  });

  describe('GET /api/tasks/history', () => {
    it('returns paginated task history envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/history?page=1&pageSize=10' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload).toHaveProperty('meta');
      expect(payload.meta).toHaveProperty('page');
      expect(payload.meta).toHaveProperty('pageSize');
      expect(payload.meta).toHaveProperty('totalCount');
      expect(payload.meta).toHaveProperty('totalPages');
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('filters task history by status', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/history?status=failed' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      for (const item of payload.data) {
        expect(item.status).toBe('failed');
      }
    });
  });

  describe('GET /api/tasks/history/:id', () => {
    it('returns task details for existing entry', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/history/1' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.id).toBe(1);
      expect(payload.data).toHaveProperty('taskName');
      expect(payload.data).toHaveProperty('started');
      expect(payload.data).toHaveProperty('duration');
      expect(payload.data).toHaveProperty('status');
      expect(payload.data).toHaveProperty('output');
    });

    it('returns 404 for non-existent task', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/history/99999' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/tasks/scheduled/:taskId/run', () => {
    it('queues a scheduled task for execution', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/tasks/scheduled/rss-sync/run' });
      const payload = response.json();

      expect(response.statusCode).toBe(202);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('taskId');
      expect(payload.data).toHaveProperty('taskName');
      expect(payload.data).toHaveProperty('queuedAt');
    });

    it('returns 404 for unknown task', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/tasks/scheduled/unknown-task/run' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/tasks/queued/:taskId', () => {
    it('returns 404 for non-existent queued task', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/tasks/queued/99999' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/system/events', () => {
    it('returns paginated system events envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/events?page=1&pageSize=10' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload).toHaveProperty('meta');
      expect(Array.isArray(payload.data)).toBe(true);
      if (payload.data.length > 0) {
        expect(payload.data[0]).toHaveProperty('id');
        expect(payload.data[0]).toHaveProperty('timestamp');
        expect(payload.data[0]).toHaveProperty('level');
        expect(payload.data[0]).toHaveProperty('type');
        expect(payload.data[0]).toHaveProperty('message');
      }
    });

    it('filters events by level', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/events?level=error' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      for (const item of payload.data) {
        expect(item.level).toBe('error');
      }
    });

    it('filters events by type', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/events?type=indexer' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      for (const item of payload.data) {
        expect(item.type).toBe('indexer');
      }
    });
  });

  describe('DELETE /api/system/events/clear', () => {
    it('clears all events when no filters provided', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/system/events/clear' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('cleared');
      expect(typeof payload.data.cleared).toBe('number');
    });
  });

  describe('GET /api/system/events/export', () => {
    it('exports events as JSON by default', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/events/export' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('exports events as CSV when format=csv', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/system/events/export?format=csv' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.body).toContain('id,timestamp,level,type,message');
    });
  });
});

describe('Backup routes', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  describe('GET /api/backups', () => {
    it('returns backups list envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/backups' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      if (payload.data.length > 0) {
        expect(payload.data[0]).toHaveProperty('id');
        expect(payload.data[0]).toHaveProperty('name');
        expect(payload.data[0]).toHaveProperty('path');
        expect(payload.data[0]).toHaveProperty('size');
        expect(payload.data[0]).toHaveProperty('created');
        expect(payload.data[0]).toHaveProperty('type');
      }
    });
  });

  describe('POST /api/backups', () => {
    it('creates a new backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/backups' });
      const payload = response.json();

      expect(response.statusCode).toBe(201);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('name');
      expect(payload.data.type).toBe('manual');
    });
  });

  describe('GET /api/backups/schedule', () => {
    it('returns backup schedule envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/backups/schedule' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('enabled');
      expect(payload.data).toHaveProperty('interval');
      expect(payload.data).toHaveProperty('retentionDays');
      expect(payload.data).toHaveProperty('nextBackup');
      expect(payload.data).toHaveProperty('lastBackup');
    });
  });

  describe('PATCH /api/backups/schedule', () => {
    it('updates backup schedule settings', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/backups/schedule',
        payload: {
          enabled: false,
          interval: 'daily',
          retentionDays: 60,
        },
      });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.enabled).toBe(false);
      expect(payload.data.retentionDays).toBe(60);
    });
  });

  describe('POST /api/backups/:id/restore', () => {
    it('restores from a backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/backups/manual_backup_test.db/restore' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('id');
      expect(payload.data).toHaveProperty('name');
      expect(payload.data).toHaveProperty('restoredAt');
    });

    it('returns 404 for non-existent backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/backups/missing.db/restore' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });

  describe('POST /api/backups/:id/download', () => {
    it('returns download URL for backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/backups/manual_backup_test.db/download' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.downloadUrl).toBe('/api/backups/manual_backup_test.db/file');
    });
  });

  describe('DELETE /api/backups/:id', () => {
    it('deletes a backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/backups/manual_backup_test.db' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.id).toBe('manual_backup_test.db');
      expect(payload.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/backups/missing.db' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });
});

describe('Logs routes', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  describe('GET /api/logs/files', () => {
    it('returns log files list envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/logs/files' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(Array.isArray(payload.data)).toBe(true);
      if (payload.data.length > 0) {
        expect(payload.data[0]).toHaveProperty('filename');
        expect(payload.data[0]).toHaveProperty('size');
        expect(payload.data[0]).toHaveProperty('lastModified');
      }
    });
  });

  describe('GET /api/logs/files/:filename', () => {
    it('returns log file contents', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/logs/files/mediarr.log' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('filename');
      expect(payload.data).toHaveProperty('contents');
      expect(payload.data).toHaveProperty('totalLines');
    });

    it('supports limit query parameter', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/logs/files/mediarr.log?limit=5' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('contents');
    });

    it('returns 404 for non-existent file', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/logs/files/nonexistent.log' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });

  describe('DELETE /api/logs/files/:filename', () => {
    it('deletes a log file', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/logs/files/mediarr.log' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.success).toBe(true);
      expect(payload.data.filename).toBe('mediarr.log');
    });

    it('returns 404 for non-existent file', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/logs/files/nonexistent.log' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });

  describe('POST /api/logs/files/:filename/clear', () => {
    it('clears log file contents', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/logs/files/mediarr.log/clear' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.success).toBe(true);
    });

    it('returns 404 for non-existent file', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/logs/files/nonexistent.log/clear' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });

  describe('GET /api/logs/files/:filename/download', () => {
    it('returns download URL for log file', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/logs/files/mediarr.log/download' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('downloadUrl');
      expect(payload.data).toHaveProperty('filename');
    });
  });
});

describe('Updates routes', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  describe('GET /api/updates/current', () => {
    it('returns current version envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/updates/current' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('version');
      expect(payload.data).toHaveProperty('branch');
      expect(payload.data).toHaveProperty('commit');
      expect(payload.data).toHaveProperty('buildDate');
    });
  });

  describe('GET /api/updates/available', () => {
    it('returns available update envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/updates/available' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('available');
      expect(typeof payload.data.available).toBe('boolean');
    });
  });

  describe('GET /api/updates/history', () => {
    it('returns paginated update history envelope', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/updates/history?page=1&pageSize=10' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload).toHaveProperty('meta');
      expect(Array.isArray(payload.data)).toBe(true);
      if (payload.data.length > 0) {
        expect(payload.data[0]).toHaveProperty('id');
        expect(payload.data[0]).toHaveProperty('version');
        expect(payload.data[0]).toHaveProperty('installedDate');
        expect(payload.data[0]).toHaveProperty('status');
        expect(payload.data[0]).toHaveProperty('branch');
      }
    });
  });

  describe('GET /api/updates/check', () => {
    it('checks for updates', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/updates/check' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('checked');
      expect(payload.data.checked).toBe(true);
      expect(payload.data).toHaveProperty('timestamp');
      expect(payload.data).toHaveProperty('available');
    });
  });

  describe('POST /api/updates/download', () => {
    it('starts update download', async () => {
      const app = createTestApp();
      apps.push(app);

      await app.inject({
        method: 'POST',
        url: '/api/updates/check',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/updates/download',
        payload: { version: '1.1.0' },
      });
      const payload = response.json();

      expect(response.statusCode).toBe(202);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('updateId');
      expect(payload.data).toHaveProperty('version');
      expect(payload.data).toHaveProperty('bytesDownloaded');
      expect(payload.data).toHaveProperty('totalBytes');
      expect(payload.data).toHaveProperty('status');
    });
  });

  describe('POST /api/updates/install', () => {
    it('starts update installation', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({
        method: 'POST',
        url: '/api/updates/install',
        payload: { version: '1.1.0' },
      });
      const payload = response.json();

      expect(response.statusCode).toBe(202);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('mode');
      expect(payload.data).toHaveProperty('version');
      expect(payload.data).toHaveProperty('message');
      expect(payload.data).toHaveProperty('status');
    });
  });

  describe('GET /api/updates/progress/:updateId', () => {
    it('returns 404 for non-existent update', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'GET', url: '/api/updates/progress/update-99999' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });

    it('returns update progress for active update', async () => {
      const app = createTestApp();
      apps.push(app);

      await app.inject({
        method: 'POST',
        url: '/api/updates/check',
      });

      // First download an update
      const downloadResponse = await app.inject({
        method: 'POST',
        url: '/api/updates/download',
        payload: { version: '1.2.0' },
      });
      const downloadPayload = downloadResponse.json();
      const updateId = downloadPayload.data.updateId;

      // Check progress
      const response = await app.inject({ method: 'GET', url: `/api/updates/progress/${updateId}` });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('updateId');
      expect(payload.data).toHaveProperty('version');
      expect(payload.data).toHaveProperty('status');
      expect(payload.data).toHaveProperty('progress');
      expect(payload.data).toHaveProperty('message');
      expect(payload.data).toHaveProperty('startedAt');
    });
  });
});

describe('Setup routes', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
    apps.length = 0;
  });

  it('GET /api/setup/status returns setup status envelope', async () => {
    const app = createTestApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/setup/status' });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toHaveProperty('isConfigured');
    expect(payload.data).toHaveProperty('completedSteps');
    expect(Array.isArray(payload.data.completedSteps)).toBe(true);
  });

  it('POST /api/setup/complete marks setup complete', async () => {
    const app = createTestApp();
    apps.push(app);

    const completeResponse = await app.inject({ method: 'POST', url: '/api/setup/complete' });
    const completePayload = completeResponse.json();

    expect(completeResponse.statusCode).toBe(200);
    expect(completePayload.ok).toBe(true);
    expect(completePayload.data.isConfigured).toBe(true);

    const statusResponse = await app.inject({ method: 'GET', url: '/api/setup/status' });
    const statusPayload = statusResponse.json();
    expect(statusPayload.data.isConfigured).toBe(true);
    expect(statusPayload.data.completedSteps).toContain('complete');
  });

  it('setup mode keeps media/library GET endpoints empty-safe', async () => {
    const app = createTestApp();
    apps.push(app);

    const moviesResponse = await app.inject({ method: 'GET', url: '/api/movies' });
    const moviesPayload = moviesResponse.json();
    expect(moviesResponse.statusCode).toBe(200);
    expect(Array.isArray(moviesPayload.data)).toBe(true);

    const seriesResponse = await app.inject({ method: 'GET', url: '/api/series' });
    const seriesPayload = seriesResponse.json();
    expect(seriesResponse.statusCode).toBe(200);
    expect(Array.isArray(seriesPayload.data)).toBe(true);
  });
});
