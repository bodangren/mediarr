import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApiServer } from '../server/src/api/createApiServer';
import { systemState, registerSystemRoutes } from '../server/src/api/routes/systemRoutes';
import { backupState } from '../server/src/api/routes/backupRoutes';
import { logsState } from '../server/src/api/routes/logsRoutes';
import { updatesState } from '../server/src/api/routes/updatesRoutes';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

// Minimal deps for system routes (they use in-memory state)
const createMinimalDeps = () => ({
  prisma: {},
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

      const response = await app.inject({ method: 'POST', url: '/api/backups/1/restore' });
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

      const response = await app.inject({ method: 'POST', url: '/api/backups/99999/restore' });
      const payload = response.json();

      expect(response.statusCode).toBe(404);
      expect(payload.ok).toBe(false);
    });
  });

  describe('POST /api/backups/:id/download', () => {
    it('returns download URL for backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/backups/1/download' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('downloadUrl');
      expect(payload.data).toHaveProperty('expiresAt');
    });
  });

  describe('DELETE /api/backups/:id', () => {
    it('deletes a backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/backups/1' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.id).toBe(1);
      expect(payload.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent backup', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'DELETE', url: '/api/backups/99999' });
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

      const response = await app.inject({ method: 'DELETE', url: '/api/logs/files/update.log' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.success).toBe(true);
      expect(payload.data.filename).toBe('update.log');
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

  describe('POST /api/updates/check', () => {
    it('checks for updates', async () => {
      const app = createTestApp();
      apps.push(app);

      const response = await app.inject({ method: 'POST', url: '/api/updates/check' });
      const payload = response.json();

      expect(response.statusCode).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toHaveProperty('checked');
      expect(payload.data.checked).toBe(true);
      expect(payload.data).toHaveProperty('timestamp');
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
      expect(payload.data).toHaveProperty('updateId');
      expect(payload.data).toHaveProperty('version');
      expect(payload.data).toHaveProperty('startedAt');
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

      // First start an update
      const installResponse = await app.inject({
        method: 'POST',
        url: '/api/updates/install',
        payload: { version: '1.2.0' },
      });
      const installPayload = installResponse.json();
      const updateId = installPayload.data.updateId;

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
