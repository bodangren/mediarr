import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { registerApiErrorHandler } from '../api/errors';
import { registerSystemRoutes } from '../api/routes/systemRoutes';
import type { ApiDependencies } from '../api/types';
import { DatabaseClient } from '../db/drizzleClient';
import { Scheduler } from '../services/Scheduler';
import { ActivityEventRepository } from './ActivityEventRepository';
import { TaskExecutionsRepository } from './TaskExecutionsRepository';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const contents = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of contents.split('--> statement-breakpoint')) {
      if (statement.trim()) client.sqlite.exec(statement.trim());
    }
  }
}

describe('TaskExecutionsRepository with installed SQLite', () => {
  let client: DatabaseClient;
  let repository: TaskExecutionsRepository;

  beforeAll(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    repository = new TaskExecutionsRepository(client);
  });

  beforeEach(() => {
    client.sqlite.exec('DELETE FROM "TaskExecution"; DELETE FROM "ActivityEvent";');
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('round-trips scheduler writes, completed-history queries, details, and literal task-name filters', async () => {
    const running = await repository.create({
      taskName: 'rss_%_sync',
      startedAt: new Date('2026-07-24T08:00:00.000Z'),
      status: 'RUNNING',
    });
    await repository.create({
      taskName: 'other-task',
      startedAt: new Date('2026-07-24T07:00:00.000Z'),
      status: 'FAILED',
      completedAt: new Date('2026-07-24T07:00:01.000Z'),
      durationMs: 1000,
      errorMessage: 'failed',
    });

    expect((await repository.query({ page: 1, pageSize: 25 })).items).toHaveLength(1);
    expect((await repository.query({ page: 1, pageSize: 25, status: 'running' })).items)
      .toEqual([expect.objectContaining({ id: running.id, status: 'RUNNING' })]);

    await repository.update(running.id, {
      status: 'SUCCESS',
      completedAt: new Date('2026-07-24T08:00:02.000Z'),
      durationMs: 2000,
      errorMessage: null,
    });

    expect(await repository.findById(running.id)).toMatchObject({
      status: 'SUCCESS',
      durationMs: 2000,
    });
    const literalFilter = await repository.query({
      page: 1,
      pageSize: 25,
      taskName: '_%_',
    });
    expect(literalFilter.items.map(item => item.taskName)).toEqual(['rss_%_sync']);
  });

  it('prunes only older records for the requested task', async () => {
    for (let index = 0; index < 4; index += 1) {
      await repository.create({
        taskName: 'rss-sync',
        startedAt: new Date(`2026-07-24T08:00:0${index}.000Z`),
        status: 'SUCCESS',
      });
    }
    await repository.create({
      taskName: 'health-check',
      startedAt: new Date('2026-07-24T08:00:05.000Z'),
      status: 'SUCCESS',
    });

    expect(await repository.prune('rss-sync', 2)).toBe(2);
    expect((await repository.query({ page: 1, pageSize: 25, taskName: 'rss-sync' })).total).toBe(2);
    expect((await repository.query({ page: 1, pageSize: 25, taskName: 'health-check' })).total).toBe(1);
  });

  it('persists run-now history and its system event through Fastify and the real Scheduler', async () => {
    const scheduler = new Scheduler();
    const activityEvents = new ActivityEventRepository(client);
    scheduler.setTaskExecutionsRepository(repository);
    scheduler.schedule('rss-sync', '0 0 * * *', async () => {});

    const app = Fastify();
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerSystemRoutes(app, {
      prisma: client,
      scheduler,
      taskExecutionsRepository: repository,
      activityEventRepository: activityEvents,
    } as ApiDependencies);

    const run = await app.inject({ method: 'POST', url: '/api/tasks/scheduled/rss-sync/run' });
    const history = await app.inject({ method: 'GET', url: '/api/tasks/history' });
    const events = await app.inject({ method: 'GET', url: '/api/system/events?type=system' });

    expect(run.statusCode).toBe(202);
    expect(history.json()).toMatchObject({
      data: [expect.objectContaining({ taskName: 'rss-sync', status: 'success' })],
      meta: { totalCount: 1 },
    });
    expect(events.json()).toMatchObject({
      data: [expect.objectContaining({
        level: 'info',
        type: 'system',
        message: 'Manual task "Rss Sync" completed',
      })],
      meta: { totalCount: 1 },
    });

    scheduler.stopAll();
    await app.close();
  });
});
