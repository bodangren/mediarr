import { describe, it, expect, beforeAll } from 'vitest';
import { and, asc, eq } from 'drizzle-orm';
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

/**
 * Compare the result of a shim query (Prisma-style API) against a native
 * Drizzle query for parity. Used by the strangler-fig migration to confirm
 * that every repository method, after being rewritten to native Drizzle,
 * still returns the same row set as the in-memory shim it replaces.
 *
 * The native query MUST be constructed against the same row population
 * (the same DatabaseClient) that the shim query runs against, so any
 * divergence is a real behavior change.
 */
async function expectShimAndNativeEqual<T extends { id: number }>(
  shimRows: T[],
  nativeRows: T[],
): Promise<void> {
  expect(Array.isArray(nativeRows)).toBe(true);
  expect(nativeRows.length).toBe(shimRows.length);
  const sortedShim = [...shimRows].sort((a, b) => a.id - b.id);
  const sortedNative = [...nativeRows].sort((a, b) => a.id - b.id);
  for (let i = 0; i < sortedShim.length; i += 1) {
    expect(sortedNative[i]).toEqual(sortedShim[i]);
  }
}

describe('DatabaseClient parity harness (FR-1.2)', () => {
  let client: DatabaseClient;

  beforeAll(async () => {
    client = new DatabaseClient({ datasources: { db: { url: ':memory:' } } });
    applyMigrations(client.sqlite);

    // Seed a small library to exercise parity across multiple tables.
    await client.drizzle.insert(schema.qualityProfiles).values([
      { name: 'HD-1080p' },
      { name: 'SD' },
    ]);

    const movieId = 550;
    const tvdbId = 81189;
    await client.drizzle.insert(schema.media).values([
      {
        mediaType: 'MOVIE',
        tmdbId: movieId,
        title: 'Fight Club',
        cleanTitle: 'fightclub',
        sortTitle: 'fight club',
        status: 'RELEASED',
        qualityProfileId: 1,
        year: 1999,
      },
      {
        mediaType: 'TV',
        tvdbId,
        title: 'Breaking Bad',
        cleanTitle: 'breakingbad',
        sortTitle: 'breaking bad',
        status: 'ENDED',
        qualityProfileId: 2,
        year: 2008,
      },
    ]);

    await client.drizzle.insert(schema.movies).values([
      {
        mediaId: 1,
        tmdbId: movieId,
        title: 'Fight Club',
        cleanTitle: 'fightclub',
        sortTitle: 'fight club',
        status: 'RELEASED',
        monitored: true,
        qualityProfileId: 1,
        year: 1999,
      },
    ]);

    await client.drizzle.insert(schema.series).values([
      {
        mediaId: 2,
        tvdbId,
        title: 'Breaking Bad',
        cleanTitle: 'breakingbad',
        sortTitle: 'breaking bad',
        status: 'ENDED',
        monitored: true,
        qualityProfileId: 2,
        year: 2008,
      },
    ]);

    await client.drizzle.insert(schema.mediaFileVariants).values([
      {
        movieId: 1,
        mediaType: 'MOVIE',
        path: 'Fight.Club.1999.mkv',
        fileSize: 8000000000,
        quality: 'Bluray-1080p',
      },
      {
        movieId: 1,
        mediaType: 'MOVIE',
        path: 'Fight.Club.1999.extras.mkv',
        fileSize: 1000000,
        quality: 'Bluray-1080p',
      },
    ]);

    await client.drizzle.insert(schema.seasons).values([
      { seriesId: 1, seasonNumber: 1, monitored: true },
    ]);

    await client.drizzle.insert(schema.episodes).values([
      { seriesId: 1, seasonId: 1, tvdbId: 8118901, seasonNumber: 1, episodeNumber: 1, monitored: true, title: 'Pilot' },
      { seriesId: 1, seasonId: 1, tvdbId: 8118902, seasonNumber: 1, episodeNumber: 2, monitored: true, title: "Cat's in the Bag…" },
    ]);

    await client.drizzle.insert(schema.indexers).values([
      {
        name: 'Indexer A',
        implementation: 'torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        supportedMediaTypes: '["MOVIE","TV"]',
        priority: 1,
        enabled: true,
      },
      {
        name: 'Indexer B',
        implementation: 'torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        supportedMediaTypes: '["MOVIE","TV"]',
        priority: 5,
        enabled: true,
      },
      {
        name: 'Indexer C',
        implementation: 'torznab',
        configContract: 'TorznabSettings',
        settings: '{}',
        protocol: 'torrent',
        supportedMediaTypes: '["MOVIE","TV"]',
        priority: 10,
        enabled: false,
      },
    ]);
  });

  it('media.findMany({ where: { mediaType: "MOVIE" } }) — shim vs native', async () => {
    const shim = await client.media.findMany({ where: { mediaType: 'MOVIE' } });
    const native = await client.drizzle
      .select()
      .from(schema.media)
      .where(eq(schema.media.mediaType, 'MOVIE'));
    await expectShimAndNativeEqual(shim, native);
  });

  it('indexer.findMany({ orderBy: { priority: "asc" } }) — shim vs native', async () => {
    const shim = await client.indexer.findMany({ orderBy: { priority: 'asc' } });
    const native = await client.drizzle
      .select()
      .from(schema.indexers)
      .orderBy(asc(schema.indexers.priority));
    await expectShimAndNativeEqual(shim, native);
  });

  it('mediaFileVariant.findMany({ where: { movieId: 1 } }) — shim vs native', async () => {
    const shim = await client.mediaFileVariant.findMany({ where: { movieId: 1 } });
    const native = await client.drizzle
      .select()
      .from(schema.mediaFileVariants)
      .where(eq(schema.mediaFileVariants.movieId, 1));
    await expectShimAndNativeEqual(shim, native);
  });

  it('episode.findMany({ where: { seriesId: 1 } }) — shim vs native', async () => {
    const shim = await client.episode.findMany({ where: { seriesId: 1 } });
    const native = await client.drizzle
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.seriesId, 1));
    await expectShimAndNativeEqual(shim, native);
  });

  it('mediaFileVariant.count() — shim vs native', async () => {
    const shim = await client.mediaFileVariant.count();
    const nativeRows = await client.drizzle.select().from(schema.mediaFileVariants);
    expect(nativeRows.length).toBe(shim);
  });

  it('compound where clause parity: episode by seriesId AND seasonNumber', async () => {
    const shim = await client.episode.findMany({
      where: { seriesId: 1, seasonNumber: 1 },
    });
    const native = await client.drizzle
      .select()
      .from(schema.episodes)
      .where(and(eq(schema.episodes.seriesId, 1), eq(schema.episodes.seasonNumber, 1)));
    await expectShimAndNativeEqual(shim, native);
  });
});