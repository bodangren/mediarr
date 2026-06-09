import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseClient } from '../drizzleClient';
import * as schema from '../schema';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

function applyMigrations(sqlite: any): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = content.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }
}

describe('DatabaseClient.drizzle getter (FR-1.1)', () => {
  let inMemory: DatabaseClient;

  beforeAll(() => {
    inMemory = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(inMemory.sqlite);
  });

  it('exposes the underlying native Drizzle instance via the `drizzle` getter', () => {
    expect(inMemory.drizzle).toBeDefined();
    expect(typeof inMemory.drizzle.select).toBe('function');
    expect(typeof inMemory.drizzle.insert).toBe('function');
    expect(typeof inMemory.drizzle.update).toBe('function');
    expect(typeof inMemory.drizzle.delete).toBe('function');
  });

  it('returns the same instance from `drizzle` and `db` (alias contract)', () => {
    expect(inMemory.drizzle).toBe(inMemory.db);
  });

  it('can run a native `select` query against the schema without using the shim', async () => {
    const rows = await inMemory.drizzle.select().from(schema.media);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toEqual([]);
  });

  it('can run a native `insert` + `select` round-trip end-to-end', async () => {
    const profileRows = await inMemory.drizzle
      .insert(schema.qualityProfiles)
      .values({ name: 'Test Profile' })
      .returning();
    const profile = profileRows[0];
    expect(profile).toBeDefined();
    expect(profile!.id).toBeGreaterThan(0);

    const mediaRows = await inMemory.drizzle
      .insert(schema.media)
      .values({
        mediaType: 'MOVIE',
        title: 'Drizzle Test Movie',
        cleanTitle: 'drizzletestmovie',
        sortTitle: 'drizzle test movie',
        status: 'RELEASED',
        qualityProfileId: profile!.id,
        year: 2026,
      })
      .returning();
    const media = mediaRows[0];
    expect(media).toBeDefined();

    const allMovies = await inMemory.drizzle
      .select()
      .from(schema.media)
      .where(eq(schema.media.mediaType, 'MOVIE'));
    expect(allMovies).toHaveLength(1);
    expect(allMovies[0]?.id).toBe(media!.id);
  });
});