import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { and, eq, isNull } from 'drizzle-orm';
import { parseEbur128Loudness } from './MusicLoudness';
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

const execFileAsync = promisify(execFile);

/**
 * Measures one file's integrated loudness (LUFS) with ffmpeg `ebur128` and stores it.
 *
 * Exported with an injectable runner so the bounded-measurement behaviour is testable without
 * decoding audio. Failures are per-track and never abort a scan.
 */
export interface LoudnessOptions {
  /** Returns LUFS for one path, or null when ffmpeg cannot read it. */
  measure?: (filePath: string) => Promise<number | null>;
  /** How many unmeasured tracks one scan may measure (a full pass is ~1 s per track). */
  limit?: number;
}

export async function measureTrackLoudness(filePath: string): Promise<number | null> {
  try {
    const { stderr } = await execFileAsync(
      process.env.FFMPEG_PATH ?? 'ffmpeg',
      ['-hide_banner', '-nostdin', '-i', filePath, '-map', '0:a:0', '-af', 'ebur128', '-f', 'null', '-'],
      { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
    );
    return parseEbur128Loudness(stderr);
  } catch (error) {
    // ffmpeg exits non-zero only on a real failure; ebur128 summaries still reach stderr.
    const stderr = (error as { stderr?: string })?.stderr ?? '';
    return parseEbur128Loudness(stderr);
  }
}

/**
 * Fills `MusicTrack.loudnessLufs` for tracks that lack it, bounded so a scan stays quick.
 * Returns how many tracks were measured.
 */
export async function backfillTrackLoudness(
  drizzle: any,
  options: LoudnessOptions = {},
): Promise<number> {
  const measure = options.measure ?? measureTrackLoudness;
  const limit = options.limit ?? 40;
  const rows = (await drizzle
    .select({ id: schema.musicTracks.id, path: schema.musicTracks.path })
    .from(schema.musicTracks)
    .where(isNull(schema.musicTracks.loudnessLufs))
    .limit(limit)) as Array<{ id: number; path: string }>;
  let measured = 0;
  for (const row of rows) {
    const lufs = await measure(row.path);
    if (lufs === null) continue;
    await drizzle
      .update(schema.musicTracks)
      .set({ loudnessLufs: lufs })
      .where(eq(schema.musicTracks.id, row.id));
    measured += 1;
  }
  return measured;
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
  loudness?: LoudnessOptions;
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
    // Level the music against the film target: bounded per scan (~1 s per track), so the first
    // pass drains in a few cycles and every later scan only picks up new files.
    const measured = await backfillTrackLoudness(drizzle, options.loudness);
    if (measured > 0) console.log(`Music scan: measured loudness for ${measured} track(s)`);
  }
  return summary;
}
