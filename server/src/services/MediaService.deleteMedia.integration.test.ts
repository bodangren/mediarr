import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../db/drizzleClient';
import { MediaService } from './MediaService';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter(file => file.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) client.sqlite.exec(statement);
    }
  }
}

function seedQualityProfile(client: DatabaseClient): void {
  client.sqlite
    .prepare('INSERT INTO "QualityProfile" ("id", "name", "items") VALUES (1, ?, ?)')
    .run('HD', '[]');
}

function rowCount(client: DatabaseClient, table: string): number {
  return (client.sqlite.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }).count;
}

describe('MediaService.deleteMedia installed-runtime safety', () => {
  let client: DatabaseClient;
  const tempRoots: string[] = [];

  beforeEach(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    seedQualityProfile(client);
  });

  afterEach(async () => {
    await client.$disconnect();
    await Promise.all(tempRoots.map(root => fsPromises.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('keeps the movie retry target after partial filesystem cleanup and succeeds on retry', async () => {
    const moviePath = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'mediarr-delete-retry-'));
    tempRoots.push(moviePath);
    await fsPromises.writeFile(path.join(moviePath, 'removed-before-failure.mkv'), 'video');
    await fsPromises.writeFile(path.join(moviePath, 'remaining.mkv'), 'video');

    client.sqlite.prepare(`
      INSERT INTO "Media" (
        "id", "mediaType", "tmdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "path", "year"
      ) VALUES (1, 'MOVIE', 1001, 'Retry', 'retry', 'retry', 'released', 1, 1, ?, 2024)
    `).run(moviePath);
    client.sqlite.prepare(`
      INSERT INTO "Movie" (
        "id", "mediaId", "tmdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "path", "year"
      ) VALUES (1, 1, 1001, 'Retry', 'retry', 'retry', 'released', 1, 1, ?, 2024)
    `).run(moviePath);

    let firstAttempt = true;
    const filesystem = {
      rm: async (target: string, options: { recursive: boolean; force: boolean }) => {
        if (firstAttempt) {
          firstAttempt = false;
          await fsPromises.rm(path.join(target, 'removed-before-failure.mkv'));
          throw new Error('forced partial filesystem cleanup failure');
        }
        await fsPromises.rm(target, options);
      },
    };
    const service = new MediaService(client, null, undefined, filesystem);

    await expect(service.deleteMedia(1, 'MOVIE', true)).rejects.toThrow(
      'forced partial filesystem cleanup failure',
    );
    expect(rowCount(client, 'Movie')).toBe(1);
    expect(rowCount(client, 'Media')).toBe(1);
    await expect(fsPromises.stat(path.join(moviePath, 'remaining.mkv'))).resolves.toBeDefined();

    await expect(service.deleteMedia(1, 'MOVIE', true)).resolves.toBeUndefined();
    expect(rowCount(client, 'Movie')).toBe(0);
    expect(rowCount(client, 'Media')).toBe(0);
    await expect(fsPromises.stat(moviePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rolls back the complete series cascade when shared media deletion fails, then retries', async () => {
    client.sqlite.exec(`
      INSERT INTO "Media" (
        "id", "mediaType", "tvdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "year"
      ) VALUES (1, 'TV', 2001, 'Atomic', 'atomic', 'atomic', 'continuing', 1, 1, 2024);
      INSERT INTO "Series" (
        "id", "mediaId", "tvdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "year"
      ) VALUES (1, 1, 2001, 'Atomic', 'atomic', 'atomic', 'continuing', 1, 1, 2024);
      INSERT INTO "Season" ("id", "seriesId", "seasonNumber", "monitored") VALUES (1, 1, 1, 1);
      INSERT INTO "Episode" (
        "id", "seriesId", "seasonId", "tvdbId", "seasonNumber", "episodeNumber", "title", "monitored"
      ) VALUES (1, 1, 1, 3001, 1, 1, 'Pilot', 1);
      CREATE TRIGGER reject_media_delete
      BEFORE DELETE ON "Media"
      BEGIN
        SELECT RAISE(ABORT, 'forced media delete failure');
      END;
    `);

    const service = new MediaService(client);
    await expect(service.deleteMedia(1, 'TV', false)).rejects.toThrow('forced media delete failure');

    expect(rowCount(client, 'Media')).toBe(1);
    expect(rowCount(client, 'Series')).toBe(1);
    expect(rowCount(client, 'Season')).toBe(1);
    expect(rowCount(client, 'Episode')).toBe(1);

    client.sqlite.exec('DROP TRIGGER reject_media_delete');
    await expect(service.deleteMedia(1, 'TV', false)).resolves.toBeUndefined();
    expect(rowCount(client, 'Media')).toBe(0);
    expect(rowCount(client, 'Series')).toBe(0);
    expect(rowCount(client, 'Season')).toBe(0);
    expect(rowCount(client, 'Episode')).toBe(0);
  });
});
