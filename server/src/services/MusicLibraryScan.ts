import { and, eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { ScanSummary } from './MusicLibrary';
import { scanMusicLibrary, type MusicScanStore, type MusicScannerOptions } from './MusicScanner';

/**
 * Engine-side music library scan (track chore_migrate_hermes_automation_20261107, Phase 9).
 *
 * The scanner itself was only reachable from the SPA's "Scan music" button, so a track filed by the
 * operator stayed invisible to the library (measured 2026-11-14: AC/DC "Thunderstruck" on disk,
 * `MusicTrack` still 217). Automation must not call the REST API, so the scan belongs on the
 * scheduler like every other library refresh: this module owns the store wiring and the
 * scheduler calls `runMusicLibraryScan` at 05:00, ten minutes before `music-nightly-receipt` counts
 * the library.
 */

/** The drizzle-backed store `scanMusicLibrary` needs; kept in one place instead of inline in a route. */
export function createMusicScanStore(drizzle: any): MusicScanStore {
  return {
    findArtistId: async (key) => (await drizzle
      .select({ id: schema.musicArtists.id })
      .from(schema.musicArtists)
      .where(eq(schema.musicArtists.nameKey, key))
      .limit(1))[0]?.id ?? null,
    createArtist: async (name, key) => (await drizzle
      .insert(schema.musicArtists)
      .values({ name, nameKey: key })
      .returning({ id: schema.musicArtists.id }))[0].id,
    findAlbumId: async (artistId, titleKey) => (await drizzle
      .select({ id: schema.musicAlbums.id })
      .from(schema.musicAlbums)
      .where(and(
        eq(schema.musicAlbums.artistId, artistId),
        eq(schema.musicAlbums.titleKey, titleKey),
      ))
      .limit(1))[0]?.id ?? null,
    createAlbum: async (input) => (await drizzle
      .insert(schema.musicAlbums)
      .values(input)
      .returning({ id: schema.musicAlbums.id }))[0].id,
    upsertTrack: async (input) => {
      const existing = (await drizzle
        .select({ id: schema.musicTracks.id })
        .from(schema.musicTracks)
        .where(eq(schema.musicTracks.path, input.path))
        .limit(1))[0];
      if (existing) {
        await drizzle.update(schema.musicTracks).set(input).where(eq(schema.musicTracks.id, existing.id));
      } else {
        await drizzle.insert(schema.musicTracks).values(input);
      }
    },
  };
}

/** Operator-internal folders are staging, never library content. */
const STAGED_FOLDERS = new Set(['_incoming', '_review', '_quarantine', '_trash']);

/** True when a path lives in a staging folder (pure; unit-tested). */
export function isStagedMusicPath(filePath: string): boolean {
  return String(filePath).split('/').some(part => STAGED_FOLDERS.has(part));
}

/**
 * Remove tracks that earlier scans registered from staging folders. The scan itself is upsert-only,
 * so a row written from `_incoming` before this rule existed would otherwise live in the library
 * forever (found live 2026-11-14: two staged files as "Unknown Artist" tracks).
 */
export async function pruneStagedMusicTracks(drizzle: any): Promise<number> {
  const rows = await drizzle
    .select({ id: schema.musicTracks.id, path: schema.musicTracks.path })
    .from(schema.musicTracks);
  const staged = rows.filter((row: { path: string }) => isStagedMusicPath(row.path));
  for (const row of staged) {
    await drizzle.delete(schema.musicTracks).where(eq(schema.musicTracks.id, row.id));
  }
  return staged.length;
}

export interface RunMusicLibraryScanOptions {
  root?: string;
  dryRun?: boolean;
  /** Injectable for tests; defaults to the real scanner. */
  scan?: (options: MusicScannerOptions) => Promise<ScanSummary>;
}

/** Scan `/data/Music` (or `MUSIC_DIR`) into the library; the SPA route and the 05:00 task share it. */
export async function runMusicLibraryScan(
  drizzle: any,
  options: RunMusicLibraryScanOptions = {},
): Promise<ScanSummary> {
  const root = options.root ?? process.env.MUSIC_DIR ?? '/data/Music';
  const dryRun = options.dryRun === true;
  const scan = options.scan ?? scanMusicLibrary;
  const summary = await scan({ root, store: createMusicScanStore(drizzle), dryRun });
  if (!dryRun && typeof drizzle?.select === 'function') {
    const pruned = await pruneStagedMusicTracks(drizzle);
    if (pruned > 0) console.log(`Music scan: pruned ${pruned} staged track(s)`);
  }
  return summary;
}
