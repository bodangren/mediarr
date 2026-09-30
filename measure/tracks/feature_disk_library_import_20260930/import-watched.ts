#!/usr/bin/env tsx
/**
 * Import jellyfin-go watched state into mediarr PlaybackProgress.
 *
 * Source: /run/media/daniel-bo/4TB/jellyfin-go/data/jellyfin.db
 *   user_data.played               -> PlaybackProgress.isWatched
 *   user_data.playback_position_ticks / 1e7 -> position (seconds)
 *   items.run_time_ticks / 1e7     -> duration (seconds)
 *
 * The join is on the media file path: jellyfin `items.path` equals
 * mediarr `MediaFileVariant.path`. Only rows whose file is present in
 * mediarr are written, so nothing is invented for media mediarr does not
 * hold. Kinds other than Movie and Episode have no mediarr counterpart
 * (Video, Audio, Folder, Season, Series) and are reported as skipped.
 *
 * `isWatched` is written from the jellyfin flag directly. It is NOT derived
 * from the position ratio, because jellyfin marks an item played while
 * storing a partial resume position, and the heartbeat endpoint would
 * recompute the flag from that ratio and clear it.
 *
 * Usage: tsx measure/tracks/feature_disk_library_import_20260930/import-watched.ts [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const JELLYFIN_DB =
  process.env.JELLYFIN_DB ?? '/run/media/daniel-bo/4TB/jellyfin-go/data/jellyfin.db';
const MEDIARR_DB = process.env.MEDIARR_DB ?? '/tmp/opencode/mediarr-config/mediarr.db';
const USER_ID = process.env.MEDIARR_USER_ID ?? 'jellyfin-import';
const TICKS_PER_SECOND = 10_000_000;
const APPLY = process.argv.includes('--apply');

interface WatchedRow {
  kind: string;
  path: string;
  position: number;
  duration: number;
  played: boolean;
  lastPlayed: string | null;
}

function readJellyfinRows(): WatchedRow[] {
  const db = new Database(JELLYFIN_DB, { readonly: true, fileMustExist: true });
  try {
    const stmt = db.prepare(`
      SELECT i.kind           AS kind,
             i.path           AS path,
             u.played         AS played,
             u.playback_position_ticks AS ticks,
             i.run_time_ticks AS runtime,
             u.last_played_date AS lastPlayed
        FROM user_data u
        JOIN items i ON i.id = u.item_id
       WHERE (u.played = 1 OR u.playback_position_ticks > 0)
         AND i.path IS NOT NULL
    `);
    const rows = stmt.all() as Array<{
      kind: string; path: string; played: number; ticks: number;
      runtime: number | null; lastPlayed: string | null;
    }>;
    return rows.map((r) => ({
      kind: r.kind,
      path: r.path,
      played: r.played === 1,
      position: Math.round(((r.ticks ?? 0) / TICKS_PER_SECOND) * 100) / 100,
      duration: Math.round(((r.runtime ?? 0) / TICKS_PER_SECOND) * 100) / 100,
      lastPlayed: r.lastPlayed,
    }));
  } finally {
    db.close();
  }
}

interface VariantRow { mediaType: 'MOVIE' | 'EPISODE'; mediaId: number; filePath: string; }

/** File path -> mediarr media row. Only imported media appears here. */
function readVariantIndex(db: Database.Database): Map<string, VariantRow> {
  const index = new Map<string, VariantRow>();
  const rows = db
    .prepare('SELECT mediaType, movieId, episodeId, path FROM MediaFileVariant')
    .all() as Array<{ mediaType: string; movieId: number | null; episodeId: number | null; path: string }>;
  for (const r of rows) {
    if (r.mediaType === 'MOVIE' && r.movieId != null) {
      index.set(r.path, { mediaType: 'MOVIE', mediaId: r.movieId, filePath: r.path });
    } else if (r.mediaType === 'EPISODE' && r.episodeId != null) {
      index.set(r.path, { mediaType: 'EPISODE', mediaId: r.episodeId, filePath: r.path });
    }
  }
  return index;
}

function toEpochSeconds(iso: string | null): number {
  if (!iso) return Math.floor(Date.now() / 1000);
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Math.floor(Date.now() / 1000) : Math.floor(parsed / 1000);
}

function main(): void {
  const rows = readJellyfinRows();
  const db = new Database(MEDIARR_DB, { fileMustExist: true });
  try {
    const index = readVariantIndex(db);
    const supported = new Map<string, number>();
    const unsupported = new Map<string, number>();
    const unmatched: WatchedRow[] = [];
    const writes: Array<{
      mediaType: string; mediaId: number; userId: string;
      position: number; duration: number; progress: number;
      isWatched: number; lastWatched: number; createdAt: number; updatedAt: number;
    }> = [];

    for (const row of rows) {
      if (row.kind !== 'Movie' && row.kind !== 'Episode') {
        unsupported.set(row.kind, (unsupported.get(row.kind) ?? 0) + 1);
        continue;
      }
      const variant = index.get(row.path);
      if (!variant) {
        unmatched.push(row);
        continue;
      }
      supported.set(row.kind, (supported.get(row.kind) ?? 0) + 1);
      // Duration: prefer the container runtime, fall back to the last known
      // position so `progress` stays a usable ratio.
      const duration = row.duration > 0 ? row.duration : row.position;
      const progress = duration > 0 ? Math.min(1, row.position / duration) : 0;
      const now = Math.floor(Date.now() / 1000);
      writes.push({
        mediaType: variant.mediaType,
        mediaId: variant.mediaId,
        userId: USER_ID,
        position: Math.round(row.position),
        duration: Math.round(duration),
        progress,
        // Written from the jellyfin flag, never recomputed from the ratio.
        isWatched: row.played ? 1 : 0,
        lastWatched: toEpochSeconds(row.lastPlayed),
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log('jellyfin rows with played or a position:', rows.length);
    console.log('  joined to a mediarr file :', writes.length);
    for (const [kind, n] of supported) console.log(`      ${kind}: ${n}`);
    for (const [kind, n] of unsupported) console.log(`  no mediarr counterpart    : ${kind} ${n}`);
    console.log('  file absent from mediarr :', unmatched.length);
    if (unmatched.length > 0) {
      const sample = unmatched.slice(0, 5).map((r) => r.path.split('/').pop());
      for (const s of sample) console.log(`      e.g. ${s}`);
    }
    const watchedCount = writes.filter((w) => w.isWatched === 1).length;
    console.log(`  marked watched            : ${watchedCount}`);
    console.log(`  resumable (not played)   : ${writes.length - watchedCount}`);

    if (!APPLY) {
      console.log('\nDry run. Re-run with --apply to write.');
      return;
    }

    const upsert = db.prepare(`
      INSERT INTO PlaybackProgress
        (mediaType, mediaId, userId, position, duration, progress, isWatched,
         lastWatched, createdAt, updatedAt)
      VALUES
        (@mediaType, @mediaId, @userId, @position, @duration, @progress, @isWatched,
         @lastWatched, @createdAt, @updatedAt)
      ON CONFLICT(mediaType, mediaId, userId) DO UPDATE SET
        position   = excluded.position,
        duration   = excluded.duration,
        progress   = excluded.progress,
        isWatched  = excluded.isWatched,
        lastWatched = excluded.lastWatched,
        updatedAt  = excluded.updatedAt
    `);
    const applyAll = db.transaction((items: typeof writes) => {
      for (const item of items) upsert.run(item);
    });
    applyAll(writes);
    console.log(`\nWrote ${writes.length} PlaybackProgress rows for userId=${USER_ID}.`);
  } finally {
    db.close();
  }
}

main();

// Keep the import of `path` explicit for readers: the module documents the
// file-path join rather than an id join.
void path;