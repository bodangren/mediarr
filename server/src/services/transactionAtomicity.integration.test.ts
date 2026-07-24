import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../db/drizzleClient';
import { MediaRepository } from '../repositories/MediaRepository';
import { SeriesMonitoringService } from './SeriesMonitoringService';
import type { SeriesDetails } from './MetadataProvider';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) {
        client.sqlite.exec(statement);
      }
    }
  }
}

function seedSeries(client: DatabaseClient): void {
  client.sqlite.exec(`
    INSERT INTO "QualityProfile" ("id", "name", "items") VALUES (1, 'HD', '[]');
    INSERT INTO "Media" (
      "id", "mediaType", "tvdbId", "title", "cleanTitle", "sortTitle",
      "status", "monitored", "qualityProfileId", "year"
    ) VALUES (
      1, 'TV', 1001, 'Atomic Show', 'atomicshow', 'atomic show',
      'continuing', 1, 1, 2024
    );
    INSERT INTO "Series" (
      "id", "mediaId", "tvdbId", "title", "cleanTitle", "sortTitle",
      "status", "monitored", "qualityProfileId", "year"
    ) VALUES (
      1, 1, 1001, 'Atomic Show', 'atomicshow', 'atomic show',
      'continuing', 1, 1, 2024
    );
  `);
}

describe('installed SQLite transaction atomicity', () => {
  let client: DatabaseClient;

  beforeEach(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    seedSeries(client);
  });

  afterEach(async () => {
    await client.$disconnect();
  });

  it('rolls back season inserts when an episode insert fails', async () => {
    client.sqlite.exec(`
      CREATE TRIGGER reject_episode_insert
      BEFORE INSERT ON "Episode"
      BEGIN
        SELECT RAISE(ABORT, 'forced episode insert failure');
      END;
    `);

    const details: SeriesDetails = {
      series: {
        tvdbId: 1001,
        title: 'Atomic Show',
        status: 'continuing',
        seasons: [{ seasonNumber: 1 }],
        images: [],
      },
      episodes: [
        {
          id: 2001,
          seasonNumber: 1,
          episodeNumber: 1,
          episodeName: 'Pilot',
          firstAired: '2024-01-01',
          overview: null,
        },
      ],
    };

    const repository = new MediaRepository(client);
    await expect(repository.upsertSeasonsAndEpisodes(1, details)).rejects.toThrow(
      'forced episode insert failure',
    );

    const row = client.sqlite
      .prepare('SELECT COUNT(*) AS count FROM "Season" WHERE "seriesId" = 1')
      .get() as { count: number };
    expect(row.count).toBe(0);
  });

  it('rolls back earlier monitoring updates when a later update fails', async () => {
    client.sqlite.exec(`
      INSERT INTO "Season" ("id", "seriesId", "seasonNumber", "monitored")
      VALUES (1, 1, 1, 1);
      INSERT INTO "Episode" (
        "id", "seriesId", "seasonId", "tvdbId", "seasonNumber",
        "episodeNumber", "title", "monitored"
      ) VALUES
        (1, 1, 1, 2001, 1, 1, 'Pilot', 0),
        (2, 1, 1, 2002, 1, 2, 'Second', 0);
      CREATE TRIGGER reject_second_episode_update
      BEFORE UPDATE OF "monitored" ON "Episode"
      WHEN OLD."id" = 2
      BEGIN
        SELECT RAISE(ABORT, 'forced monitoring update failure');
      END;
    `);

    const service = new SeriesMonitoringService(client);
    await expect(service.applyMonitoringStrategy(1, 'all')).rejects.toThrow(
      'forced monitoring update failure',
    );

    const rows = client.sqlite
      .prepare('SELECT "id", "monitored" FROM "Episode" ORDER BY "id"')
      .all() as Array<{ id: number; monitored: number }>;
    expect(rows).toEqual([
      { id: 1, monitored: 0 },
      { id: 2, monitored: 0 },
    ]);
  });

  it('rejects asynchronous compatibility callbacks and rolls back pre-await writes', async () => {
    await expect(client.$transaction((async (tx: DatabaseClient) => {
      tx.sqlite.prepare(`
        INSERT INTO "Season" ("seriesId", "seasonNumber", "monitored")
        VALUES (1, 1, 1)
      `).run();
      await Promise.resolve();
    }) as any)).rejects.toThrow('must be synchronous');

    const row = client.sqlite
      .prepare('SELECT COUNT(*) AS count FROM "Season" WHERE "seriesId" = 1')
      .get() as { count: number };
    expect(row.count).toBe(0);
  });
});
