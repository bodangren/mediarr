import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { UpdateBackupScheduleInput } from '../../contracts/backup';
import { ValidationError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

function requireBackupService(deps: ApiDependencies): NonNullable<ApiDependencies['backupService']> {
  if (!deps.backupService) {
    throw new ValidationError('Backup service is not configured');
  }
  return deps.backupService;
}

function readBackupId(params: unknown): string {
  const id = (params as { id?: string } | null)?.id?.trim();
  if (!id) {
    throw new ValidationError('Backup id is required');
  }
  return id;
}

export function registerBackupRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/backups', async (_request, reply) => {
    return sendSuccess(reply, await requireBackupService(deps).list());
  });

  app.post('/api/backups', async (_request, reply) => {
    return sendSuccess(reply, await requireBackupService(deps).create('manual'), 201);
  });

  app.get('/api/backups/schedule', async (_request, reply) => {
    return sendSuccess(reply, await requireBackupService(deps).getSchedule());
  });

  app.patch('/api/backups/schedule', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['enabled', 'interval', 'retentionDays'],
        properties: {
          enabled: { type: 'boolean' },
          interval: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
          retentionDays: { type: 'integer', minimum: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const input = request.body as UpdateBackupScheduleInput;
    return sendSuccess(reply, await requireBackupService(deps).updateSchedule(input));
  });

  app.post('/api/backups/:id/restore', async (request, reply) => {
    const id = readBackupId(request.params);
    return sendSuccess(reply, await requireBackupService(deps).restore(id));
  });

  app.post('/api/backups/:id/download', async (request, reply) => {
    const id = readBackupId(request.params);
    const backupService = requireBackupService(deps);
    await backupService.get(id);
    return sendSuccess(reply, {
      downloadUrl: `/api/backups/${encodeURIComponent(id)}/file`,
    });
  });

  app.get('/api/backups/:id/file', async (request, reply) => {
    const id = readBackupId(request.params);
    const backupService = requireBackupService(deps);
    const backup = await backupService.get(id);

    reply.header('Content-Type', 'application/vnd.sqlite3');
    reply.header('Content-Disposition', `attachment; filename="${backup.name}"`);
    return reply.send(createReadStream(backup.path));
  });

  app.delete('/api/backups/:id', async (request, reply) => {
    const id = readBackupId(request.params);
    const backupService = requireBackupService(deps);
    await backupService.get(id);
    await backupService.delete(id);
    return sendSuccess(reply, { id, deleted: true });
  });
}
