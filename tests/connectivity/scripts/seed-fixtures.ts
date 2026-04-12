/**
 * Connectivity E2E fixture seeder.
 *
 * Run after `drizzle-kit migrate` to insert:
 *   - One QualityProfile (required FK)
 *   - One Movie with a MediaFileVariant pointing to a real MP4
 *   - One Series → Season → Episode with a MediaFileVariant pointing to a real MP4
 *
 * Idempotent: skips insertion if records already exist (identified by tmdbId).
 *
 * Usage:
 *   DATABASE_URL=file:/tmp/connectivity.db bun tests/connectivity/scripts/seed-fixtures.ts
 */

import { db } from '../../server/src/db/index.js';
import {
  qualityProfiles,
  movies,
  series,
  seasons,
  episodes,
  mediaFileVariants,
} from '../../server/src/db/schema.js';
import { eq } from 'drizzle-orm';

const MOVIE_TMDB_ID = 999_000_001;
const SERIES_TVDB_ID = 999_000_002;
const EPISODE_TVDB_ID = 999_000_003;

const MOVIE_FILE = '/data/media/movies/connectivity-test-movie/Connectivity Test Movie (2026).mp4';
const EPISODE_FILE = '/data/media/tv/connectivity-test-series/Season 01/Connectivity Test Series - S01E01.mp4';

async function seed() {
  console.log('[seed-fixtures] Starting…');

  // ── 1. QualityProfile ────────────────────────────────────────────────────────
  let profileId: number;
  const existingProfile = await db
    .select()
    .from(qualityProfiles)
    .where(eq(qualityProfiles.name, 'Connectivity Test Profile'))
    .get();

  if (existingProfile) {
    profileId = existingProfile.id;
    console.log(`[seed-fixtures] QualityProfile already exists (id=${profileId})`);
  } else {
    const inserted = await db
      .insert(qualityProfiles)
      .values({ name: 'Connectivity Test Profile', cutoff: 0, items: '[]' })
      .returning()
      .get();
    profileId = inserted.id;
    console.log(`[seed-fixtures] Inserted QualityProfile id=${profileId}`);
  }

  // ── 2. Movie ─────────────────────────────────────────────────────────────────
  let movieId: number;
  const existingMovie = await db
    .select()
    .from(movies)
    .where(eq(movies.tmdbId, MOVIE_TMDB_ID))
    .get();

  if (existingMovie) {
    movieId = existingMovie.id;
    console.log(`[seed-fixtures] Movie already exists (id=${movieId})`);
  } else {
    const inserted = await db
      .insert(movies)
      .values({
        tmdbId: MOVIE_TMDB_ID,
        title: 'Connectivity Test Movie',
        cleanTitle: 'connectivity test movie',
        sortTitle: 'Connectivity Test Movie',
        status: 'released',
        year: 2026,
        monitored: true,
        qualityProfileId: profileId,
        path: '/data/media/movies/connectivity-test-movie',
        minimumAvailability: 'released',
      })
      .returning()
      .get();
    movieId = inserted.id;
    console.log(`[seed-fixtures] Inserted Movie id=${movieId}`);
  }

  // MediaFileVariant for movie
  const existingMovieVariant = await db
    .select()
    .from(mediaFileVariants)
    .where(eq(mediaFileVariants.movieId, movieId))
    .get();

  if (!existingMovieVariant) {
    await db.insert(mediaFileVariants).values({
      mediaType: 'MOVIE',
      movieId,
      path: MOVIE_FILE,
      fileSize: 51200,
      monitored: true,
      quality: 'SDTV',
    });
    console.log(`[seed-fixtures] Inserted movie MediaFileVariant`);
  }

  // ── 3. Series → Season → Episode ─────────────────────────────────────────────
  let seriesId: number;
  const existingSeries = await db
    .select()
    .from(series)
    .where(eq(series.tvdbId, SERIES_TVDB_ID))
    .get();

  if (existingSeries) {
    seriesId = existingSeries.id;
    console.log(`[seed-fixtures] Series already exists (id=${seriesId})`);
  } else {
    const inserted = await db
      .insert(series)
      .values({
        tvdbId: SERIES_TVDB_ID,
        title: 'Connectivity Test Series',
        cleanTitle: 'connectivity test series',
        sortTitle: 'Connectivity Test Series',
        status: 'continuing',
        year: 2026,
        monitored: true,
        qualityProfileId: profileId,
        path: '/data/media/tv/connectivity-test-series',
      })
      .returning()
      .get();
    seriesId = inserted.id;
    console.log(`[seed-fixtures] Inserted Series id=${seriesId}`);
  }

  let seasonId: number;
  const existingSeason = await db
    .select()
    .from(seasons)
    .where(eq(seasons.seriesId, seriesId))
    .get();

  if (existingSeason) {
    seasonId = existingSeason.id;
    console.log(`[seed-fixtures] Season already exists (id=${seasonId})`);
  } else {
    const inserted = await db
      .insert(seasons)
      .values({ seriesId, seasonNumber: 1, monitored: true })
      .returning()
      .get();
    seasonId = inserted.id;
    console.log(`[seed-fixtures] Inserted Season id=${seasonId}`);
  }

  let episodeId: number;
  const existingEpisode = await db
    .select()
    .from(episodes)
    .where(eq(episodes.tvdbId, EPISODE_TVDB_ID))
    .get();

  if (existingEpisode) {
    episodeId = existingEpisode.id;
    console.log(`[seed-fixtures] Episode already exists (id=${episodeId})`);
  } else {
    const inserted = await db
      .insert(episodes)
      .values({
        seriesId,
        seasonId,
        tvdbId: EPISODE_TVDB_ID,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Connectivity Pilot',
        monitored: true,
        path: EPISODE_FILE,
      })
      .returning()
      .get();
    episodeId = inserted.id;
    console.log(`[seed-fixtures] Inserted Episode id=${episodeId}`);
  }

  // MediaFileVariant for episode
  const existingEpVariant = await db
    .select()
    .from(mediaFileVariants)
    .where(eq(mediaFileVariants.episodeId, episodeId))
    .get();

  if (!existingEpVariant) {
    await db.insert(mediaFileVariants).values({
      mediaType: 'EPISODE',
      episodeId,
      path: EPISODE_FILE,
      fileSize: 51200,
      monitored: true,
      quality: 'SDTV',
    });
    console.log(`[seed-fixtures] Inserted episode MediaFileVariant`);
  }

  console.log('[seed-fixtures] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed-fixtures] FAILED:', err);
  process.exit(1);
});
