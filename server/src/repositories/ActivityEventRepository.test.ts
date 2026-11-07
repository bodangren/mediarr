import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../db/drizzleClient';
import { ActivityEventRepository } from './ActivityEventRepository';

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

describe('ActivityEventRepository.query', () => {
  let client: DatabaseClient;
  let repository: ActivityEventRepository;

  beforeAll(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    repository = new ActivityEventRepository(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  beforeEach(() => {
    client.sqlite.exec('DELETE FROM "ActivityEvent";');
  });

  async function insertEvents(count: number): Promise<void> {
    const rows = Array.from({ length: count }, (_, index) => ({
      eventType: 'download',
      sourceModule: 'test',
      summary: `event ${index}`,
      success: true,
      occurredAt: new Date(1_700_000_000_000 + index * 1000),
    }));
    for (const row of rows) {
      await repository.create(row);
    }
  }

  it('reports the total without materialising every row', async () => {
    // The previous implementation selected every id just to call `.length`; on
    // a 248k-row production table that ran once a second and saturated the
    // event loop (measured 2026-11-07: 86% CPU, 400-1200 ms request lag).
    await insertEvents(250);

    const result = await repository.query({ page: 1, pageSize: 20 });

    expect(result.total).toBe(250);
    expect(result.items).toHaveLength(20);
    // Newest first.
    expect(result.items[0]?.summary).toBe('event 249');
  });

  it('paginates and keeps the total stable', async () => {
    await insertEvents(45);

    const second = await repository.query({ page: 2, pageSize: 20 });
    expect(second.total).toBe(45);
    expect(second.items).toHaveLength(20);
    expect(second.items[0]?.summary).toBe('event 24');
  });

  it('filters by event type', async () => {
    await insertEvents(5);
    await repository.create({
      eventType: 'import',
      sourceModule: 'test',
      summary: 'an import',
      success: true,
    });

    const result = await repository.query({ page: 1, pageSize: 10, eventType: 'import' });
    expect(result.total).toBe(1);
    expect(result.items[0]?.summary).toBe('an import');
  });
});
