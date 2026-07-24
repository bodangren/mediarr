import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseClient } from '../../db/drizzleClient';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSubtitleRoutes } from './subtitleRoutes';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'drizzle');

function applyMigrations(client: DatabaseClient): void {
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter(file => file.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) client.sqlite.exec(statement);
    }
  }
}

describe('subtitle movie bulk profile update', () => {
  let app: FastifyInstance;
  let client: DatabaseClient;

  beforeEach(() => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client);
    client.sqlite.exec(`
      INSERT INTO "QualityProfile" ("id", "name", "items") VALUES (1, 'HD', '[]');
      INSERT INTO "Media" (
        "id", "mediaType", "tmdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "year"
      ) VALUES
        (1, 'MOVIE', 1001, 'First', 'first', 'first', 'released', 1, 1, 2024),
        (2, 'MOVIE', 1002, 'Second', 'second', 'second', 'released', 1, 1, 2024);
      INSERT INTO "Movie" (
        "id", "mediaId", "tmdbId", "title", "cleanTitle", "sortTitle",
        "status", "monitored", "qualityProfileId", "year"
      ) VALUES
        (1, 1, 1001, 'First', 'first', 'first', 'released', 1, 1, 2024),
        (2, 2, 1002, 'Second', 'second', 'second', 'released', 1, 1, 2024);
    `);

    app = Fastify();
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerSubtitleRoutes(app, { prisma: client } as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
    await client.$disconnect();
  });

  it('updates all selected movies with one native SQLite bulk statement', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/subtitles/movies/bulk',
      payload: { movieIds: [1, 2, 999], languageProfileId: 7 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      updatedCount: 2,
      failedCount: 0,
    });
    expect(client.sqlite
      .prepare('SELECT "id", "languageProfileId" FROM "Movie" ORDER BY "id"')
      .all())
      .toEqual([
        { id: 1, languageProfileId: 7 },
        { id: 2, languageProfileId: 7 },
      ]);
  });
});
