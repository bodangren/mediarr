import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSystemRoutes } from './systemRoutes';

const completedExecution = {
  id: 41,
  taskName: 'rss-sync',
  startedAt: new Date('2026-07-24T08:00:00.000Z'),
  completedAt: new Date('2026-07-24T08:00:02.500Z'),
  status: 'SUCCESS',
  durationMs: 2500,
  errorMessage: null,
};

const persistedEvent = {
  id: 73,
  eventType: 'INDEXER_SYNC_FAILED',
  sourceModule: 'IndexerService',
  entityRef: 'indexer:9',
  summary: 'Indexer sync failed',
  success: false,
  details: { reason: 'timeout' },
  occurredAt: new Date('2026-07-24T09:00:00.000Z'),
};

function createApp(deps: Record<string, unknown>): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSystemRoutes(app, { prisma: {}, ...deps } as ApiDependencies);
  return app;
}

function createTaskExecutionsRepository() {
  return {
    create: vi.fn(),
    update: vi.fn(),
    prune: vi.fn(),
    query: vi.fn().mockResolvedValue({
      items: [completedExecution],
      total: 1,
      page: 1,
      pageSize: 25,
    }),
    findById: vi.fn().mockResolvedValue(completedExecution),
  };
}

function createActivityEventRepository() {
  return {
    create: vi.fn().mockImplementation(async (input: Record<string, unknown>) => ({
      ...persistedEvent,
      ...input,
    })),
    query: vi.fn().mockResolvedValue({
      items: [persistedEvent],
      total: 1,
      page: 1,
      pageSize: 25,
    }),
    clear: vi.fn().mockResolvedValue(1),
    markAsFailed: vi.fn(),
    export: vi.fn().mockResolvedValue([persistedEvent]),
  };
}

describe('system task and event route truthfulness', () => {
  it('fails explicitly instead of returning scheduled fixtures when Scheduler is absent', async () => {
    const app = createApp({ taskExecutionsRepository: createTaskExecutionsRepository() });

    const response = await app.inject({ method: 'GET', url: '/api/tasks/scheduled' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      ok: false,
      error: { message: 'Scheduler is not configured' },
    });
    await app.close();
  });

  it('derives scheduled running and disabled statuses from live dependencies', async () => {
    const repository = createTaskExecutionsRepository();
    repository.query.mockResolvedValue({
      items: [{
        ...completedExecution,
        taskName: 'rss-sync',
        completedAt: null,
        durationMs: null,
        status: 'RUNNING',
      }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    const scheduler = {
      listJobsMeta: vi.fn().mockReturnValue([
        {
          name: 'rss-sync',
          cronExpression: '*/15 * * * *',
          lastRunAt: null,
          lastDurationMs: null,
          nextRunAt: '2026-07-24T10:15:00.000Z',
          enabled: true,
        },
        {
          name: 'health-check',
          cronExpression: '0 * * * *',
          lastRunAt: null,
          lastDurationMs: null,
          nextRunAt: null,
          enabled: false,
        },
      ]),
    };
    const app = createApp({ taskExecutionsRepository: repository, scheduler });

    const response = await app.inject({ method: 'GET', url: '/api/tasks/scheduled' });

    expect(response.json()).toMatchObject({
      data: [
        { id: 'rss-sync', status: 'running' },
        { id: 'health-check', status: 'disabled', nextExecution: null },
      ],
    });
    await app.close();
  });

  it('reads task history and details from the persisted execution repository', async () => {
    const repository = createTaskExecutionsRepository();
    const app = createApp({ taskExecutionsRepository: repository });

    const history = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?page=1&pageSize=25&status=success&taskName=rss',
    });
    const detail = await app.inject({ method: 'GET', url: '/api/tasks/history/41' });

    expect(repository.query).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      status: 'success',
      taskName: 'rss',
    });
    expect(repository.findById).toHaveBeenCalledWith(41);
    expect(history.json()).toMatchObject({
      data: [{
        id: 41,
        taskName: 'rss-sync',
        started: '2026-07-24T08:00:00.000Z',
        duration: 2500,
        status: 'success',
        output: null,
      }],
      meta: { totalCount: 1 },
    });
    expect(detail.json()).toMatchObject({ data: { id: 41, status: 'success' } });
    await app.close();
  });

  it('reports only persisted RUNNING executions as queued and refuses fake cancellation', async () => {
    const repository = createTaskExecutionsRepository();
    const running = {
      ...completedExecution,
      id: 42,
      completedAt: null,
      durationMs: null,
      status: 'RUNNING',
    };
    repository.query.mockResolvedValue({
      items: [running],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    repository.findById.mockResolvedValue(running);
    const app = createApp({ taskExecutionsRepository: repository });

    const queued = await app.inject({ method: 'GET', url: '/api/tasks/queued' });
    const cancelled = await app.inject({ method: 'DELETE', url: '/api/tasks/queued/42' });

    expect(repository.query).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      status: 'running',
    });
    expect(queued.json()).toMatchObject({
      data: [{
        id: 42,
        taskName: 'rss-sync',
        started: '2026-07-24T08:00:00.000Z',
        duration: null,
        progress: null,
        status: 'running',
      }],
    });
    expect(cancelled.statusCode).toBe(409);
    expect(cancelled.json()).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
    await app.close();
  });

  it('runs the real scheduler and persists a success activity event', async () => {
    const scheduler = {
      listJobs: vi.fn().mockReturnValue(['rss-sync']),
      triggerTask: vi.fn().mockResolvedValue(true),
    };
    const activityEventRepository = createActivityEventRepository();
    const app = createApp({ scheduler, activityEventRepository });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/rss-sync/run',
    });

    expect(response.statusCode).toBe(202);
    expect(scheduler.triggerTask).toHaveBeenCalledWith('rss-sync');
    expect(activityEventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'TASK_EXECUTED',
      sourceModule: 'Scheduler',
      entityRef: 'task:rss-sync',
      success: true,
    }));
    await app.close();
  });

  it('persists scheduler failures as failed events and preserves the failed response', async () => {
    const scheduler = {
      listJobs: vi.fn().mockReturnValue(['rss-sync']),
      triggerTask: vi.fn().mockRejectedValue(new Error('sync exploded')),
    };
    const activityEventRepository = createActivityEventRepository();
    const app = createApp({ scheduler, activityEventRepository });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/rss-sync/run',
    });

    expect(response.statusCode).toBe(500);
    expect(activityEventRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'TASK_FAILED',
      sourceModule: 'Scheduler',
      entityRef: 'task:rss-sync',
      success: false,
      details: { error: 'sync exploded' },
    }));
    await app.close();
  });

  it('returns conflict without persisting an event when Scheduler did not execute', async () => {
    const scheduler = {
      listJobs: vi.fn().mockReturnValue(['rss-sync']),
      triggerTask: vi.fn().mockResolvedValue(false),
    };
    const activityEventRepository = createActivityEventRepository();
    const app = createApp({ scheduler, activityEventRepository });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/scheduled/rss-sync/run',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(activityEventRepository.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('lists, clears, and exports persisted activity events', async () => {
    const repository = createActivityEventRepository();
    const app = createApp({ activityEventRepository: repository });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/system/events?page=1&pageSize=25&level=error&type=indexer',
    });
    const cleared = await app.inject({
      method: 'DELETE',
      url: '/api/system/events/clear?level=error&before=2026-07-25T00:00:00.000Z',
    });
    const exported = await app.inject({
      method: 'GET',
      url: '/api/system/events/export?format=json&level=error&type=indexer',
    });

    expect(repository.export).toHaveBeenCalledWith({ success: false });
    expect(listed.json()).toMatchObject({
      data: [{
        id: 73,
        timestamp: '2026-07-24T09:00:00.000Z',
        level: 'error',
        type: 'indexer',
        message: 'Indexer sync failed',
        source: 'IndexerService',
        details: { reason: 'timeout' },
      }],
      meta: { totalCount: 1 },
    });
    expect(repository.clear).toHaveBeenCalledWith({
      success: false,
      to: new Date('2026-07-24T23:59:59.999Z'),
    });
    expect(cleared.json()).toMatchObject({ data: { cleared: 1 } });
    expect(repository.export).toHaveBeenCalled();
    expect(exported.json()).toMatchObject({ data: [{ id: 73, type: 'indexer' }] });
    await app.close();
  });

  it('rejects invalid filters instead of silently widening persisted queries', async () => {
    const taskExecutionsRepository = createTaskExecutionsRepository();
    const activityEventRepository = createActivityEventRepository();
    const app = createApp({ taskExecutionsRepository, activityEventRepository });

    const invalidStatus = await app.inject({
      method: 'GET',
      url: '/api/tasks/history?status=finished',
    });
    const invalidLevel = await app.inject({
      method: 'GET',
      url: '/api/system/events?level=verbose',
    });
    const invalidRange = await app.inject({
      method: 'GET',
      url: '/api/system/events?startDate=2026-07-25&endDate=2026-07-24',
    });
    const invalidFormat = await app.inject({
      method: 'GET',
      url: '/api/system/events/export?format=xml',
    });

    for (const response of [invalidStatus, invalidLevel, invalidRange, invalidFormat]) {
      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR' },
      });
    }
    expect(taskExecutionsRepository.query).not.toHaveBeenCalled();
    expect(activityEventRepository.export).not.toHaveBeenCalled();
    await app.close();
  });
});
