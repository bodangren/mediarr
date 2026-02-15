import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import { parseIdParam } from '../routeUtils';
import type { ApiDependencies } from '../types';

// Types
type BackupType = 'manual' | 'scheduled';
type BackupInterval = 'hourly' | 'daily' | 'weekly' | 'monthly';

interface Backup {
  id: number;
  name: string;
  path: string;
  size: number;
  created: string;
  type: BackupType;
}

interface BackupSchedule {
  enabled: boolean;
  interval: BackupInterval;
  retentionDays: number;
  nextBackup: string;
  lastBackup: string | null;
}

// In-memory state
let backups: Backup[] = [
  {
    id: 1,
    name: 'mediarr_backup_2024-02-14_10-30.zip',
    path: '/data/backups/mediarr_backup_2024-02-14_10-30.zip',
    size: 15728640,
    created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    type: 'scheduled',
  },
  {
    id: 2,
    name: 'mediarr_backup_2024-02-13_10-30.zip',
    path: '/data/backups/mediarr_backup_2024-02-13_10-30.zip',
    size: 14680064,
    created: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    type: 'scheduled',
  },
  {
    id: 3,
    name: 'manual_backup_2024-02-12.zip',
    path: '/data/backups/manual_backup_2024-02-12.zip',
    size: 13631488,
    created: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    type: 'manual',
  },
];
let backupIdCounter = 4;

let backupSchedule: BackupSchedule = {
  enabled: true,
  interval: 'daily',
  retentionDays: 30,
  nextBackup: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  lastBackup: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
};

// Export state for testing
export const backupState = {
  get backups() { return backups; },
  set backups(v) { backups = v; },
  get backupSchedule() { return backupSchedule; },
  set backupSchedule(v) { backupSchedule = v; },
};

export function registerBackupRoutes(
  app: FastifyInstance,
  _deps: ApiDependencies,
): void {
  // GET /api/backups
  app.get('/api/backups', async (_request, reply) => {
    // Sort by most recent first
    const sorted = [...backups].sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
    return sendSuccess(reply, sorted);
  });

  // POST /api/backups
  app.post('/api/backups', async (_request, reply) => {
    const now = new Date();
    const name = `mediarr_backup_${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;
    
    const backup: Backup = {
      id: backupIdCounter++,
      name,
      path: `/data/backups/${name}`,
      size: Math.floor(Math.random() * 20000000) + 10000000,
      created: now.toISOString(),
      type: 'manual',
    };

    backups.push(backup);
    return sendSuccess(reply, backup, 201);
  });

  // GET /api/backups/schedule
  app.get('/api/backups/schedule', async (_request, reply) => {
    return sendSuccess(reply, backupSchedule);
  });

  // PATCH /api/backups/schedule
  app.patch('/api/backups/schedule', {
    schema: {
      body: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          interval: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
          retentionDays: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;

    if (typeof body.enabled === 'boolean') {
      backupSchedule.enabled = body.enabled;
    }
    if (body.interval === 'hourly' || body.interval === 'daily' || body.interval === 'weekly' || body.interval === 'monthly') {
      backupSchedule.interval = body.interval;
    }
    if (typeof body.retentionDays === 'number' && body.retentionDays > 0) {
      backupSchedule.retentionDays = Math.floor(body.retentionDays);
    }

    // Recalculate next backup time based on interval
    const intervalMs: Record<BackupInterval, number> = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    if (backupSchedule.enabled) {
      backupSchedule.nextBackup = new Date(
        Date.now() + intervalMs[backupSchedule.interval]
      ).toISOString();
    }

    return sendSuccess(reply, backupSchedule);
  });

  // POST /api/backups/:id/restore
  app.post('/api/backups/:id/restore', async (request, reply) => {
    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'backup');

    const backup = backups.find(b => b.id === id);
    if (!backup) {
      throw new NotFoundError(`Backup with id ${id} not found`);
    }

    return sendSuccess(reply, {
      id: backup.id,
      name: backup.name,
      restoredAt: new Date().toISOString(),
    });
  });

  // POST /api/backups/:id/download
  app.post('/api/backups/:id/download', async (request, reply) => {
    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'backup');

    const backup = backups.find(b => b.id === id);
    if (!backup) {
      throw new NotFoundError(`Backup with id ${id} not found`);
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return sendSuccess(reply, {
      downloadUrl: `/api/backups/${id}/file?token=download-token-${id}`,
      expiresAt: expiresAt.toISOString(),
    });
  });

  // DELETE /api/backups/:id
  app.delete('/api/backups/:id', async (request, reply) => {
    const params = request.params as { id?: string };
    const id = parseIdParam(params.id ?? '', 'backup');

    const index = backups.findIndex(b => b.id === id);
    if (index === -1) {
      throw new NotFoundError(`Backup with id ${id} not found`);
    }

    backups.splice(index, 1);

    return sendSuccess(reply, {
      id,
      deleted: true,
    });
  });
}
