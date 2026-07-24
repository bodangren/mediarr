import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../db/drizzleClient';
import { SubtitleVariantRepository } from './SubtitleVariantRepository';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const contents = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of contents.split('--> statement-breakpoint')) {
      if (statement.trim()) {
        client.sqlite.exec(statement.trim());
      }
    }
  }
}

describe('SubtitleVariantRepository with installed SQLite', () => {
  let client: DatabaseClient;
  let repository: SubtitleVariantRepository;

  beforeAll(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    repository = new SubtitleVariantRepository(client);
  });

  beforeEach(() => {
    client.sqlite.exec(`
      DELETE FROM "SubtitleHistory";
      DELETE FROM "MediaFileVariant";
      DELETE FROM "Movie";
      DELETE FROM "QualityProfile";
      INSERT INTO "QualityProfile" ("id", "name", "cutoff", "items")
      VALUES (1, 'Any', 0, '[]');
      INSERT INTO "Movie" (
        "id", "tmdbId", "title", "cleanTitle", "sortTitle",
        "status", "qualityProfileId", "year"
      )
      VALUES (1, 1001, 'Test Movie', 'test movie', 'Test Movie', 'released', 1, 2026);
    `);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('rejects an unsupported media type before attempting persistence', async () => {
    await expect(repository.upsertVariant({
      mediaType: 'TV' as never,
      movieId: 1,
      path: '/media/invalid.mkv',
      fileSize: 1024,
    })).rejects.toThrow("Unsupported variant media type 'TV'");

    const row = client.sqlite
      .prepare('SELECT COUNT(*) AS count FROM "MediaFileVariant"')
      .get() as { count: number };
    expect(row.count).toBe(0);
  });

  it('deletes only the requested subtitle history row', async () => {
    const variant = await repository.upsertVariant({
      mediaType: 'MOVIE',
      movieId: 1,
      path: '/media/test-movie.mkv',
      fileSize: 2048,
    });
    const first = await repository.createSubtitleHistory({
      variantId: variant.id,
      languageCode: 'en',
      message: 'first',
    });
    const second = await repository.createSubtitleHistory({
      variantId: variant.id,
      languageCode: 'th',
      message: 'second',
    });

    await repository.deleteSubtitleHistory(first.id);

    const rows = client.sqlite
      .prepare('SELECT "id", "message" FROM "SubtitleHistory" ORDER BY "id"')
      .all() as Array<{ id: number; message: string | null }>;
    expect(rows).toEqual([{ id: second.id, message: 'second' }]);
  });
});
