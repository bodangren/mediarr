import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import Fastify from 'fastify';
import { DatabaseClient } from '../server/src/db/drizzleClient';
import { SystemHealthService } from '../server/src/services/SystemHealthService';
import { registerStatsRoutes } from '../server/src/api/routes/statsRoutes';
import { registerApiErrorHandler } from '../server/src/api/errors';
import type { ApiDependencies } from '../server/src/api/types';

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'drizzle');
const DRIZZLE_RAW_SQL_PATH = path.join(REPO_ROOT, 'server', 'src', 'db', 'drizzleRawSql.ts');
const DRIZZLE_CLIENT_PATH = path.join(REPO_ROOT, 'server', 'src', 'db', 'drizzleClient.ts');

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

function createTestDb(): DatabaseClient {
  const client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
  applyMigrations(client.sqlite);
  return client;
}

describe('chore_close_drizzle_migration_20260607 — Phase S2: Drizzle-native replacement (Red)', () => {
  describe('S2.1: executeRaw shim replaced with Drizzle-native runRaw', () => {
    it('exposes a Drizzle-native runRawDrizzle function (or DatabaseClient.runRaw method)', async () => {
      let module: any = {};
      try {
        const require = createRequire(import.meta.url);
        const mod = require('../server/src/db/drizzleRawSql');
        module = mod;
      } catch {
        // Module does not exist yet — expected in Red phase
      }
      const hasStandaloneFunction = typeof module.runRawDrizzle === 'function';
      const testClient = createTestDb();
      const hasClientMethod = typeof (testClient as any).runRaw === 'function';
      expect(
        hasStandaloneFunction || hasClientMethod,
        'Expected either server/src/db/drizzleRawSql.ts (exporting runRawDrizzle) or DatabaseClient.runRaw method to exist for S2.1',
      ).toBe(true);
    });

    it('runRawDrizzle returns identical changes count to sqlite.prepare for QualityProfile.items repair', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {
        // Module does not exist yet — expected in Red phase
      }
      expect(runRawDrizzle, 'runRawDrizzle must be importable for S2.1 equivalence test').toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "QualityProfile" (name, items) VALUES ('test-bad', 'not valid json')`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "QualityProfile" SET "items" = '[]' WHERE "items" IS NULL OR json_valid("items") = 0`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "QualityProfile" (name, items) VALUES ('test-bad-2', 'still bad')`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "QualityProfile" SET "items" = '[]' WHERE "items" IS NULL OR json_valid("items") = 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for Notification.config repair', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle, 'runRawDrizzle must be importable for Notification.config equivalence test').toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "Notification" (name, type, config, createdAt, updatedAt) VALUES ('notif-bad', 'webhook', 'not valid json', 1, 1)`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "Notification" SET "config" = '{}' WHERE "config" IS NULL OR json_valid("config") = 0`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "Notification" (name, type, config, createdAt, updatedAt) VALUES ('notif-bad-2', 'webhook', 'still bad', 1, 1)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "Notification" SET "config" = '{}' WHERE "config" IS NULL OR json_valid("config") = 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for ActivityEvent.details repair', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, details) VALUES ('TEST', 'tests', 'summary', 1, 'not valid json')`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "ActivityEvent" SET "details" = NULL WHERE "details" IS NOT NULL AND json_valid("details") = 0`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, details) VALUES ('TEST', 'tests', 'summary', 1, 'still bad')`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "ActivityEvent" SET "details" = NULL WHERE "details" IS NOT NULL AND json_valid("details") = 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for Torrent.eta downscale (>2147483647)', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-downscale', 'eta-downscale', 'downloading', 1000, '/tmp/eta-downscale', 5000000000)`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "Torrent" SET "eta" = CAST("eta" / 1000 AS INTEGER) WHERE "eta" > 2147483647`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-downscale-2', 'eta-downscale-2', 'downloading', 1000, '/tmp/eta-downscale-2', 5000000000)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "Torrent" SET "eta" = CAST("eta" / 1000 AS INTEGER) WHERE "eta" > 2147483647`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for Torrent.eta clamp (post-downscale > 2147483647)', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-clamp', 'eta-clamp', 'downloading', 1000, '/tmp/eta-clamp', 9999999999)`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "Torrent" SET "eta" = 2147483647 WHERE "eta" > 2147483647`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-clamp-2', 'eta-clamp-2', 'downloading', 1000, '/tmp/eta-clamp-2', 9999999999)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "Torrent" SET "eta" = 2147483647 WHERE "eta" > 2147483647`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for Torrent.eta negative-null', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-neg-1', 'eta-neg-1', 'downloading', 1000, '/tmp/eta-neg-1', -50)`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "Torrent" SET "eta" = NULL WHERE "eta" < 0`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-neg-2', 'eta-neg-2', 'downloading', 1000, '/tmp/eta-neg-2', -99999)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "Torrent" SET "eta" = NULL WHERE "eta" < 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle binds parameter values for AppSettings dynamic-column repair (identifier escaping)', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      const torrentLimitsDefault = JSON.stringify({ maxActiveDownloads: 5, maxActiveTorrents: 0 });
      client.sqlite.exec(`INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, createdAt, updatedAt) VALUES (1, 'broken', '{}', '{}', 1, 1)`);

      const oldChanges = Number(
        client.sqlite
          .prepare(
            `UPDATE "AppSettings" SET "torrentLimits" = ? WHERE "torrentLimits" IS NULL OR json_valid("torrentLimits") = 0`,
          )
          .run(torrentLimitsDefault).changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, createdAt, updatedAt) VALUES (2, 'also broken', '{}', '{}', 1, 1)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "AppSettings" SET "torrentLimits" = ${torrentLimitsDefault} WHERE "torrentLimits" IS NULL OR json_valid("torrentLimits") = 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });

    it('runRawDrizzle returns identical changes count for AppSettings nullable column NULL repair (apiKeys)', async () => {
      let runRawDrizzle: ((client: DatabaseClient, query: any, params?: any[]) => Promise<number>) | undefined;
      try {
        const require = createRequire(import.meta.url);
        runRawDrizzle = require('../server/src/db/drizzleRawSql').runRawDrizzle;
      } catch {}
      expect(runRawDrizzle).toBeTypeOf('function');
      if (!runRawDrizzle) return;

      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, apiKeys, createdAt, updatedAt) VALUES (1, '{}', '{}', '{}', 'malformed', 1, 1)`);

      const oldChanges = Number(
        client.sqlite.prepare(
          `UPDATE "AppSettings" SET "apiKeys" = NULL WHERE "apiKeys" IS NOT NULL AND json_valid("apiKeys") = 0`,
        ).run().changes ?? 0,
      );

      client.sqlite.exec(`INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, apiKeys, createdAt, updatedAt) VALUES (2, '{}', '{}', '{}', 'also malformed', 1, 1)`);
      const { sql } = await import('drizzle-orm');
      const newChanges = await runRawDrizzle(
        client,
        sql`UPDATE "AppSettings" SET "apiKeys" = NULL WHERE "apiKeys" IS NOT NULL AND json_valid("apiKeys") = 0`,
      );
      expect(newChanges).toBe(oldChanges);
    });
  });

  describe('S2.2: statsRoutes uses db.all(sql`...`) instead of $queryRawUnsafe', () => {
    let app: ReturnType<typeof Fastify>;
    let client: DatabaseClient;

    beforeEach(() => {
      client = createTestDb();
      const deps = { prisma: client as any } as unknown as ApiDependencies;
      app = Fastify();
      app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
      registerStatsRoutes(app, deps);
    });

    it('/api/stats/downloads returns the actual sum of Torrent.downloaded (not 0)', async () => {
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta, size, downloaded, uploaded, ratio, path)
        VALUES ('hash-dl-1', 'test-dl', 'downloading', 0.5, 1024, 512, 100, 1000000, 5000000, 250000, 0.5, '/tmp/test-dl')
      `);
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta, size, downloaded, uploaded, ratio, path)
        VALUES ('hash-dl-2', 'test-dl-2', 'completed', 1, 0, 0, 0, 2000000, 3000000, 100000, 1.0, '/tmp/test-dl-2')
      `);

      const res = await app.inject({ method: 'GET', url: '/api/stats/downloads' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.totalDownloadedBytes).toBe(8000000);
    });

    it('/api/stats/system returns the actual pragma page_count * page_size (not 0)', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/stats/system' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.dbSizeBytes).toBeGreaterThan(0);
    });

    it('/api/stats/downloads returns the actual AVG(downloadSpeed) for downloading torrents (not 0)', async () => {
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta, size, downloaded, uploaded, ratio, path)
        VALUES ('hash-avg-1', 'avg-dl-1', 'downloading', 0.5, 2048, 1024, 100, 1000000, 500000, 100000, 0.5, '/tmp/avg-dl-1')
      `);
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta, size, downloaded, uploaded, ratio, path)
        VALUES ('hash-avg-2', 'avg-dl-2', 'metaDL', 0.0, 512, 256, 9999, 1000000, 0, 0, 0.0, '/tmp/avg-dl-2')
      `);
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, progress, downloadSpeed, uploadSpeed, eta, size, downloaded, uploaded, ratio, path)
        VALUES ('hash-avg-3', 'avg-dl-3', 'completed', 1, 0, 0, 0, 2000000, 2000000, 100000, 1.0, '/tmp/avg-dl-3')
      `);

      const res = await app.inject({ method: 'GET', url: '/api/stats/downloads' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.averageDownloadSpeed).toBe((2048 + 512) / 2);
    });
  });

  describe('S2.3: SystemHealthService uses db.all(sql`...`) instead of $queryRaw', () => {
    it('checkDatabase returns ok with version from a real DatabaseClient', async () => {
      const client = createTestDb();
      const svc = new SystemHealthService(client as any);
      const result = await svc.checkDatabase();

      expect(result.status).toBe('ok');
      expect(result.message).toBe('Database is healthy');
      expect(result.version).toMatch(/^\d+\.\d+/);
    });

    it('checkDatabase tolerates the _drizzle_migrations guard (no _prisma_migrations table)', async () => {
      const client = createTestDb();
      const svc = new SystemHealthService(client as any);
      const result = await svc.checkDatabase();
      expect(result.status).toBe('ok');
      expect(typeof result.migration).toBe('string');
    });

    it('checkDatabase returns the latest migration hash when a Drizzle migrations table is populated', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        CREATE TABLE "__drizzle_migrations" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at INTEGER
        )
      `);
      client.sqlite.exec(`
        INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('older-hash', 1000)
      `);
      client.sqlite.exec(`
        INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ('latest-hash-20260607', 9999)
      `);

      const svc = new SystemHealthService(client as any);
      const result = await svc.checkDatabase();
      expect(result.status).toBe('ok');
      expect(result.migration).toBe('latest-hash-20260607');
    });
  });

  describe('S2.4: DatabaseClient has no Bun/Node branching (single SQLite API path)', () => {
    it('drizzleClient.ts does not use createRequire to detect bun:sqlite vs better-sqlite3', () => {
      const source = fs.readFileSync(DRIZZLE_CLIENT_PATH, 'utf8');
      const hasBunRequire = /require\(['"]bun:sqlite['"]\)/.test(source);
      const hasBetterRequire = /require\(['"]better-sqlite3['"]\)/.test(source);
      const hasRuntimeBranch = /if\s*\(\s*bunSqlite\s*\)/.test(source);

      expect(
        !(hasBunRequire || hasBetterRequire || hasRuntimeBranch),
        'drizzleClient.ts must use a single SQLite path; remove the createRequire/bun:sqlite/better-sqlite3 branching',
      ).toBe(true);
    });
  });
});
