import type { FastifyInstance } from 'fastify';
import { validate as cronValidate } from 'node-cron';
import { sendSuccess, sendPaginatedSuccess, buildSuccessEnvelope } from '../contracts';
import type { Scheduler } from '../../services/Scheduler';
import type { SettingsService } from '../../services/SettingsService';

interface SchedulerJobMeta {
  name: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  nextRunAt: string | null;
}

interface SchedulerDeps {
  scheduler: Pick<Scheduler, 'listJobsMeta' | 'runNow' | 'isScheduled' | 'reschedule' | 'triggerTask'>;
  settingsService: Pick<SettingsService, 'get' | 'update'>;
  taskExecutionsRepository: {
    create: (input: {
      taskName: string;
      startedAt: Date;
      status: string;
      completedAt?: Date | null;
      durationMs?: number | null;
      errorMessage?: string | null;
    }) => Promise<{ id: number; taskName: string; startedAt: Date; completedAt: Date | null; status: string; durationMs: number | null; errorMessage: string | null }>;
    query: (input: { page: number; pageSize: number; status?: string }) => Promise<{
      items: Array<{ id: number; taskName: string; status: string; startedAt: Date; completedAt: Date | null; durationMs: number | null; errorMessage: string | null }>;
      total: number;
      page: number;
      pageSize: number;
    }>;
  };
}

const TASK_INTERVAL_KEY: Record<string, keyof { rssSyncMinutes: number; availabilityCheckMinutes: number; torrentMonitoringSeconds: number; wantedSearchMinutes: number }> = {
  'rss-sync': 'rssSyncMinutes',
  'availability-check': 'availabilityCheckMinutes',
  'wanted-search': 'wantedSearchMinutes',
};

function extractMinutes(cronExpression: string): number | null {
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return null;
  const minutePart = parts[0]!;
  if (minutePart.startsWith('*/')) {
    const n = parseInt(minutePart.slice(2), 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

const VALID_STATUSES = new Set(['success', 'failed', 'running']);

export function registerSchedulerRoutes(app: FastifyInstance, deps: SchedulerDeps): void {
  app.get('/api/scheduler/tasks', async (_request, reply) => {
    const jobs = deps.scheduler.listJobsMeta();
    const data = jobs.map((job: SchedulerJobMeta) => ({
      id: job.name,
      taskName: job.name,
      cronExpression: job.cronExpression,
      lastRunAt: job.lastRunAt,
      lastDurationMs: job.lastDurationMs,
      nextRunAt: job.nextRunAt,
    }));
    return sendSuccess(reply, data);
  });

  app.put('/api/scheduler/:taskId/interval', {
    schema: {
      body: {
        type: 'object',
        required: ['cronExpression'],
        properties: {
          cronExpression: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const { cronExpression } = request.body as { cronExpression?: string };

    if (!cronExpression) {
      return reply.status(422).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'cronExpression is required', retryable: false } });
    }

    if (!cronValidate(cronExpression)) {
      return reply.status(422).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: `Invalid cron expression: ${cronExpression}`, retryable: false } });
    }

    if (!deps.scheduler.isScheduled(taskId)) {
      return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: `Unknown task: ${taskId}`, retryable: false } });
    }

    deps.scheduler.reschedule(taskId, cronExpression);

    const intervalKey = TASK_INTERVAL_KEY[taskId];
    const minutes = extractMinutes(cronExpression);

    if (intervalKey && minutes !== null) {
      await deps.settingsService.update({
        schedulerIntervals: { [intervalKey]: minutes },
      } as Record<string, unknown> as Parameters<typeof deps.settingsService.update>[0]);
    } else {
      await deps.settingsService.update({} as Parameters<typeof deps.settingsService.update>[0]);
    }

    return sendSuccess(reply, { taskId, cronExpression });
  });

  app.post('/api/scheduler/:taskId/trigger', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };

    if (!deps.scheduler.isScheduled(taskId)) {
      return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: `Unknown task: ${taskId}`, retryable: false } });
    }

    try {
      await deps.scheduler.triggerTask(taskId);
      return reply.status(202).send(buildSuccessEnvelope({
        taskId,
        executionId: -1,
      }));
    } catch (error) {
      return reply.status(500).send({ ok: false, error: { code: 'EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error), retryable: false } });
    }
  });

  app.get('/api/scheduler/history', async (request, reply) => {
    const query = request.query as Record<string, unknown>;

    const page = typeof query.page === 'string' ? Math.max(parseInt(query.page, 10) || 1, 1) : 1;
    const pageSize = typeof query.pageSize === 'string' ? Math.min(Math.max(parseInt(query.pageSize, 10) || 25, 1), 100) : 25;

    const statusFilter = typeof query.status === 'string' ? query.status.toLowerCase() : undefined;

    if (statusFilter !== undefined && !VALID_STATUSES.has(statusFilter)) {
      return reply.status(422).send({ ok: false, error: { code: 'VALIDATION_ERROR', message: `Invalid status: ${statusFilter}`, retryable: false } });
    }

    const result = await deps.taskExecutionsRepository.query({
      page,
      pageSize,
      ...(statusFilter ? { status: statusFilter } : {}),
    });

    return sendPaginatedSuccess(reply, result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.total,
    });
  });
}
