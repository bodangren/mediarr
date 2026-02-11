import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';
import { ActivityEventRepository } from '../server/src/repositories/ActivityEventRepository';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new ActivityEventRepository(prisma);

describe('ActivityEventRepository', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should persist events and query with filters', async () => {
    await repository.create({
      eventType: 'MEDIA_ADDED',
      sourceModule: 'media-service',
      entityRef: 'movie:1',
      summary: 'Movie added',
      success: true,
      occurredAt: new Date('2026-02-11T08:00:00.000Z'),
    });

    await repository.create({
      eventType: 'RELEASE_GRABBED',
      sourceModule: 'media-search',
      entityRef: 'torrent:abc',
      summary: 'Grab failed',
      success: false,
      occurredAt: new Date('2026-02-11T08:05:00.000Z'),
    });

    const queried = await repository.query({
      eventType: 'RELEASE_GRABBED',
      success: false,
      from: new Date('2026-02-11T08:03:00.000Z'),
      to: new Date('2026-02-11T08:06:00.000Z'),
    });

    expect(queried.items).toHaveLength(1);
    expect(queried.items[0].summary).toContain('Grab failed');
    expect(queried.total).toBe(1);
  });

  it('should support retention cleanup for events older than N days', async () => {
    await repository.create({
      eventType: 'SEARCH_EXECUTED',
      sourceModule: 'media-search',
      summary: 'Old event',
      success: true,
      occurredAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    await repository.create({
      eventType: 'SEARCH_EXECUTED',
      sourceModule: 'media-search',
      summary: 'Recent event',
      success: true,
      occurredAt: new Date('2026-02-10T00:00:00.000Z'),
    });

    const deleted = await repository.cleanupOldEvents(30, new Date('2026-02-11T00:00:00.000Z'));

    expect(deleted).toBe(1);
    const all = await repository.query({});
    expect(all.items).toHaveLength(1);
    expect(all.items[0].summary).toBe('Recent event');
  });
});
