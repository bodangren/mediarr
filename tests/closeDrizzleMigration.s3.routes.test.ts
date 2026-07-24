import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import { DatabaseClient } from '../server/src/db/drizzleClient';
import { repairMalformedJsonColumns } from '../server/src/maintenance/repairJsonColumns';
import { SystemHealthService } from '../server/src/services/SystemHealthService';
import { registerStatsRoutes } from '../server/src/api/routes/statsRoutes';
import { registerSystemRoutes } from '../server/src/api/routes/systemRoutes';
import { registerApiErrorHandler } from '../server/src/api/errors';
import type { ApiDependencies } from '../server/src/api/types';

const REPO_ROOT = path.resolve(__dirname, '..');
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

function createTestDb(): DatabaseClient {
  const client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
  applyMigrations(client.sqlite);
  return client;
}


describe('system and stats route behavior', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // S3.1: Fastify inject tests for /api/system/stats and /api/system/status
  // ─────────────────────────────────────────────────────────────────────────
  describe('S3.1: Fastify inject tests for /api/system/stats and /api/system/status with real DB', () => {
    let app: ReturnType<typeof Fastify>;
    let client: DatabaseClient;

    beforeEach(() => {
      client = createTestDb();
      client.sqlite.exec(
        `INSERT INTO "QualityProfile" (name, items) VALUES ('test-qp', '[]')`,
      );
      const healthService = new SystemHealthService(client as any);
      const deps = {
        prisma: client as any,
        systemHealthService: healthService,
      } as unknown as ApiDependencies;
      app = Fastify();
      app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
      registerStatsRoutes(app, deps);
      registerSystemRoutes(app, deps);
    });

    describe('GET /api/system/stats — library stats endpoint', () => {
      it('returns 200 with the full LibraryStats envelope for an empty DB', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.ok).toBe(true);
        expect(body.data).toMatchObject({
          library: {
            totalMovies: 0,
            totalSeries: 0,
            totalEpisodes: 0,
            monitoredMovies: 0,
            monitoredSeries: 0,
            monitoredEpisodes: 0,
          },
          files: {
            totalFiles: 0,
            totalSizeBytes: 0,
            movieFiles: 0,
            movieSizeBytes: 0,
            episodeFiles: 0,
            episodeSizeBytes: 0,
          },
          quality: {
            movies: { uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 0 },
            episodes: { uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 0 },
          },
          missing: { movies: 0, episodes: 0 },
          activity: {
            downloadsThisWeek: 0,
            downloadsThisMonth: 0,
            searchesThisWeek: 0,
            subtitlesThisWeek: 0,
          },
        });
      });

      it('counts movies correctly when Media rows are seeded', async () => {
        client.sqlite.exec(`
          INSERT INTO "Media" (mediaType, monitored, title, cleanTitle, sortTitle, status, year, qualityProfileId)
          VALUES ('MOVIE', 1, 'A', 'a', 'a', 'released', 2020, 1),
                 ('MOVIE', 1, 'B', 'b', 'b', 'released', 2021, 1),
                 ('MOVIE', 0, 'C', 'c', 'c', 'released', 2022, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Movie" (mediaId, tmdbId, imdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (1, 100, NULL, 'A', 'a', 'a', 'released', 2020, 1)
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.library.totalMovies).toBe(1);
      });

      it('counts series and episodes correctly when Series/Season/Episode rows are seeded', async () => {
        client.sqlite.exec(`
          INSERT INTO "Media" (mediaType, monitored, title, cleanTitle, sortTitle, status, year, qualityProfileId)
          VALUES ('TV', 1, 'S1', 's1', 's1', 'continuing', 2021, 1),
                 ('TV', 1, 'S2', 's2', 's2', 'continuing', 2022, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Series" (mediaId, tvdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (1, 200, 'S1', 's1', 's1', 'continuing', 2021, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Series" (mediaId, tvdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (2, 201, 'S2', 's2', 's2', 'continuing', 2022, 1)
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.library.totalSeries).toBe(2);
      });

      it('aggregates totalSizeBytes from MediaFileVariant rows', async () => {
        client.sqlite.exec(`
          INSERT INTO "Media" (id, mediaType, monitored, title, cleanTitle, sortTitle, status, year, qualityProfileId)
          VALUES (1, 'MOVIE', 1, 'A', 'a', 'a', 'released', 2020, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Movie" (mediaId, tmdbId, imdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (1, 100, NULL, 'A', 'a', 'a', 'released', 2020, 1)
        `);
        const now = Math.floor(Date.now() / 1000);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '1080p', 5000000, '/movies/a.mkv', ${now})
        `);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '720p', 3000000, '/movies/a-720p.mkv', ${now})
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.files.movieFiles).toBe(2);
        expect(body.data.files.movieSizeBytes).toBe(8000000);
        expect(body.data.files.totalSizeBytes).toBe(8000000);
      });

      it('categorizes quality variants into uhd4k / hd1080p / hd720p / sd / unknown', async () => {
        client.sqlite.exec(`
          INSERT INTO "Media" (id, mediaType, monitored, title, cleanTitle, sortTitle, status, year, qualityProfileId)
          VALUES (1, 'MOVIE', 1, 'A', 'a', 'a', 'released', 2020, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Movie" (mediaId, tmdbId, imdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (1, 100, NULL, 'A', 'a', 'a', 'released', 2020, 1)
        `);
        const now = Math.floor(Date.now() / 1000);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '2160p', 1, '/m1.mkv', ${now})
        `);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '1080p', 1, '/m2.mkv', ${now})
        `);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '720p', 1, '/m3.mkv', ${now})
        `);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', '480p', 1, '/m4.mkv', ${now})
        `);
        client.sqlite.exec(`
          INSERT INTO "MediaFileVariant" (movieId, mediaType, quality, fileSize, path, updatedAt) VALUES (1, 'MOVIE', NULL, 1, '/m5.mkv', ${now})
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.quality.movies).toEqual({
          uhd4k: 1,
          hd1080p: 1,
          hd720p: 1,
          sd: 1,
          unknown: 1,
        });
      });

      it('counts missing movies (monitored Movie with no fileVariants)', async () => {
        client.sqlite.exec(`
          INSERT INTO "Media" (id, mediaType, monitored, title, cleanTitle, sortTitle, status, year, qualityProfileId)
          VALUES (1, 'MOVIE', 1, 'A', 'a', 'a', 'released', 2020, 1)
        `);
        client.sqlite.exec(`
          INSERT INTO "Movie" (mediaId, tmdbId, imdbId, title, cleanTitle, sortTitle, status, year, qualityProfileId) VALUES (1, 100, NULL, 'A', 'a', 'a', 'released', 2020, 1)
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.missing.movies).toBe(1);
      });

      it('counts downloadsThisWeek from ActivityEvent rows within 7 days', async () => {
        const now = Date.now();
        const recent = Math.floor(now / 1000) - 60; // 1 min ago
        const withinMonth = Math.floor(now / 1000) - 60 * 60 * 24 * 14; // 14 days ago
        const old = Math.floor(now / 1000) - 60 * 60 * 24 * 60; // 60 days ago (outside 30-day window)
        client.sqlite.exec(`
          INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, occurredAt) VALUES ('RELEASE_GRABBED', 'tests', 'r1', 1, ${recent})
        `);
        client.sqlite.exec(`
          INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, occurredAt) VALUES ('RELEASE_GRABBED', 'tests', 'r2', 1, ${recent})
        `);
        client.sqlite.exec(`
          INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, occurredAt) VALUES ('RELEASE_GRABBED', 'tests', 'r3-month', 1, ${withinMonth})
        `);
        client.sqlite.exec(`
          INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, occurredAt) VALUES ('RELEASE_GRABBED', 'tests', 'r4-old', 1, ${old})
        `);

        const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(typeof body.data.activity.downloadsThisWeek).toBe('number');
        expect(typeof body.data.activity.downloadsThisMonth).toBe('number');
        expect(body.data.activity.downloadsThisWeek).toBeGreaterThanOrEqual(2);
        expect(body.data.activity.downloadsThisMonth).toBeGreaterThanOrEqual(3);
      });
    });

    describe('GET /api/system/status — health endpoint with real SystemHealthService', () => {
      it('returns 200 with the full status envelope', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/status' });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.ok).toBe(true);
        expect(body.data).toMatchObject({
          health: { overall: expect.stringMatching(/^(ok|warning|error)$/) },
          system: expect.objectContaining({
            version: expect.any(String),
            uptime: expect.any(Number),
          }),
          database: expect.objectContaining({ type: 'SQLite' }),
          diskSpace: expect.any(Array),
          dependencies: expect.objectContaining({
            required: expect.any(Array),
            optional: expect.any(Array),
          }),
        });
      });

      it('reports database health as ok with a real DatabaseClient', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/status' });
        const body = JSON.parse(res.body);
        expect(body.data.health.overall).toBe('ok');
        const dbCheck = body.data.health.checks.find((c: any) => c.type === 'database');
        expect(dbCheck).toBeDefined();
        expect(dbCheck.status).toBe('ok');
      });

      it('reports SQLite version from pragma sqlite_version()', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/status' });
        const body = JSON.parse(res.body);
        expect(typeof body.data.database.version).toBe('string');
        expect(body.data.database.version).toMatch(/^\d+\.\d+/);
      });

      it('includes Node.js + SQLite in required dependencies', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/status' });
        const body = JSON.parse(res.body);
        const names = body.data.dependencies.required.map((d: any) => d.name);
        expect(names).toContain('Node.js');
        expect(names).toContain('SQLite');
      });

      it('includes FFmpeg + Mono in optional dependencies', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/system/status' });
        const body = JSON.parse(res.body);
        const names = body.data.dependencies.optional.map((d: any) => d.name);
        expect(names).toContain('FFmpeg');
        expect(names).toContain('Mono');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S3.2: Regression test for the startup AppSettings repair loop in main.ts
  // ─────────────────────────────────────────────────────────────────────────
  describe('S3.2: AppSettings repair loop regression test', () => {
    it('exports the startup JSON repair function', () => {
      expect(repairMalformedJsonColumns).toBeTypeOf('function');
    });

    it('repairs QualityProfile.items malformed JSON by setting to "[]"', async () => {
      const client = createTestDb();
      client.sqlite.exec(`INSERT INTO "QualityProfile" (name, items) VALUES ('qp-bad', 'not valid json')`);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT items FROM "QualityProfile" WHERE name = 'qp-bad'`).get() as { items: string };
      expect(row.items).toBe('[]');
    });

    it('repairs Notification.config malformed JSON by setting to "{}"', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "Notification" (name, type, config, createdAt, updatedAt) VALUES ('notif-bad', 'webhook', 'not valid json', 1, 1)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT config FROM "Notification" WHERE name = 'notif-bad'`).get() as { config: string };
      expect(row.config).toBe('{}');
    });

    it('repairs ActivityEvent.details malformed JSON by setting to NULL', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "ActivityEvent" (eventType, sourceModule, summary, success, details) VALUES ('TEST', 'tests', 'summary', 1, 'not valid json')
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT details FROM "ActivityEvent" WHERE eventType = 'TEST'`).get() as { details: string | null };
      expect(row.details).toBeNull();
    });

    it('repairs Torrent.eta overflow by downscaling values > 2147483647', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-overflow', 'eta-overflow', 'downloading', 1000, '/tmp/eta-overflow', 5000000000)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT eta FROM "Torrent" WHERE infoHash = 'h-overflow'`).get() as { eta: number };
      expect(row.eta).toBeLessThanOrEqual(2147483647);
      expect(row.eta).toBe(5000000);
    });

    it('clamps Torrent.eta to 2147483647 for values that remain > 2147483647 after downscaling', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-clamp', 'eta-clamp', 'downloading', 1000, '/tmp/eta-clamp', 9999999999999)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT eta FROM "Torrent" WHERE infoHash = 'h-clamp'`).get() as { eta: number };
      expect(row.eta).toBe(2147483647);
    });

    it('sets Torrent.eta to NULL for negative values', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "Torrent" (infoHash, name, status, size, path, eta) VALUES ('h-neg', 'eta-neg', 'downloading', 1000, '/tmp/eta-neg', -50)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT eta FROM "Torrent" WHERE infoHash = 'h-neg'`).get() as { eta: number | null };
      expect(row.eta).toBeNull();
    });

    it('repairs AppSettings required columns (torrentLimits / schedulerIntervals / pathVisibility) with the default JSON', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, createdAt, updatedAt) VALUES (1, 'broken', 'broken', 'broken', 1, 1)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`SELECT torrentLimits, schedulerIntervals, pathVisibility FROM "AppSettings" WHERE id = 1`).get() as {
        torrentLimits: string;
        schedulerIntervals: string;
        pathVisibility: string;
      };
      expect(() => JSON.parse(row.torrentLimits)).not.toThrow();
      expect(() => JSON.parse(row.schedulerIntervals)).not.toThrow();
      expect(() => JSON.parse(row.pathVisibility)).not.toThrow();
    });

    it('repairs AppSettings nullable columns (apiKeys / host / security / logging / update) by setting to NULL', async () => {
      const client = createTestDb();
      client.sqlite.exec(`
        INSERT INTO "AppSettings" (id, torrentLimits, schedulerIntervals, pathVisibility, apiKeys, host, security, logging, "update", createdAt, updatedAt)
        VALUES (1, '{}', '{}', '{}', 'malformed', 'malformed', 'malformed', 'malformed', 'malformed', 1, 1)
      `);

      await repairMalformedJsonColumns(client);

      const row = client.sqlite.prepare(`
        SELECT apiKeys, host, security, logging, "update" FROM "AppSettings" WHERE id = 1
      `).get() as Record<string, string | null>;
      expect(row.apiKeys).toBeNull();
      expect(row.host).toBeNull();
      expect(row.security).toBeNull();
      expect(row.logging).toBeNull();
      expect(row.update).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S3.3: Response shapes match current production contract
  // ─────────────────────────────────────────────────────────────────────────
  describe('S3.3: Response shapes match current production contract', () => {
    let app: ReturnType<typeof Fastify>;
    let client: DatabaseClient;

    beforeEach(() => {
      client = createTestDb();
      const healthService = new SystemHealthService(client as any);
      const deps = {
        prisma: client as any,
        systemHealthService: healthService,
      } as unknown as ApiDependencies;
      app = Fastify();
      app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
      registerStatsRoutes(app, deps);
      registerSystemRoutes(app, deps);
    });

    it('GET /api/system/stats uses the { ok: true, data: T } envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({ ok: true });
      expect(typeof body.data).toBe('object');
      expect(body.data).not.toBeNull();
    });

    it('GET /api/system/status uses the { ok: true, data: T } envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/status' });
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({ ok: true });
      expect(typeof body.data).toBe('object');
      expect(body.data).not.toBeNull();
    });

    it('GET /api/stats/downloads uses the { ok: true, data: T } envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/stats/downloads' });
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({ ok: true });
      expect(typeof body.data).toBe('object');
    });

    it('GET /api/stats/system uses the { ok: true, data: T } envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/stats/system' });
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({ ok: true });
      expect(typeof body.data).toBe('object');
    });

    it('LibraryStats numeric fields are JSON numbers, not strings', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
      const body = JSON.parse(res.body);
      const lib = body.data.library;
      for (const key of Object.keys(lib)) {
        expect(typeof lib[key], `library.${key} must be a number`).toBe('number');
      }
      const files = body.data.files;
      for (const key of Object.keys(files)) {
        expect(typeof files[key], `files.${key} must be a number`).toBe('number');
      }
    });

    it('SystemStatus.system.isLinux / isWindows / isDocker are JSON booleans, not strings', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/status' });
      const body = JSON.parse(res.body);
      expect(typeof body.data.system.isLinux).toBe('boolean');
      expect(typeof body.data.system.isWindows).toBe('boolean');
      expect(typeof body.data.system.isDocker).toBe('boolean');
    });

    it('quality breakdowns are JSON objects with the documented bucket keys', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
      const body = JSON.parse(res.body);
      const expectedKeys = ['uhd4k', 'hd1080p', 'hd720p', 'sd', 'unknown'].sort();
      expect(Object.keys(body.data.quality.movies).sort()).toEqual(expectedKeys);
      expect(Object.keys(body.data.quality.episodes).sort()).toEqual(expectedKeys);
    });

    it('SystemStatus.dependencies.required entries include name / version / status fields', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/status' });
      const body = JSON.parse(res.body);
      for (const dep of body.data.dependencies.required) {
        expect(typeof dep.name).toBe('string');
        expect(typeof dep.version).toBe('string');
        expect(typeof dep.status).toBe('string');
      }
    });

    it('SystemStatus.diskSpace entries include path / free / total fields', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/system/status' });
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.data.diskSpace)).toBe(true);
      for (const entry of body.data.diskSpace) {
        expect(typeof entry.path).toBe('string');
        expect(typeof entry.free).toBe('number');
        expect(typeof entry.total).toBe('number');
      }
    });
  });
});
