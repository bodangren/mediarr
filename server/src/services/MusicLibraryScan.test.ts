import { describe, expect, it } from 'vitest';
import type { MusicScannerOptions } from './MusicScanner';
import { backfillTrackLoudness, isStagedMusicPath, pruneStagedMusicTracks, runMusicLibraryScan } from './MusicLibraryScan';

/**
 * The scheduler needs the scan without the REST route (track chore_migrate_hermes_automation_20261107,
 * Phase 9). These tests pin the contract the 05:00 task relies on: default root, non-dry run, and
 * the scanner's summary passed through untouched.
 */

const summary = { scanned: 3, artists: 1, albums: 1, tracks: 2, unreadable: [] };

describe('runMusicLibraryScan', () => {
  it('defaults to /data/Music (or MUSIC_DIR) and a real, non-dry scan', async () => {
    const calls: MusicScannerOptions[] = [];
    const result = await runMusicLibraryScan({}, {
      scan: async (options) => {
        calls.push(options);
        return summary;
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.root).toBe(process.env.MUSIC_DIR ?? '/data/Music');
    expect(calls[0]!.dryRun).toBe(false);
    expect(result).toBe(summary);
  });

  it('passes an explicit root and dryRun through', async () => {
    const calls: MusicScannerOptions[] = [];
    await runMusicLibraryScan({}, {
      root: '/tmp/music-root',
      dryRun: true,
      scan: async (options) => {
        calls.push(options);
        return summary;
      },
    });
    expect(calls[0]!.root).toBe('/tmp/music-root');
    expect(calls[0]!.dryRun).toBe(true);
  });

  it('gives the scanner a store wired to the drizzle handle', async () => {
    const calls: MusicScannerOptions[] = [];
    await runMusicLibraryScan({ marker: 'drizzle-handle' }, {
      scan: async (options) => {
        calls.push(options);
        return summary;
      },
    });
    expect(typeof calls[0]!.store.findArtistId).toBe('function');
    expect(typeof calls[0]!.store.upsertTrack).toBe('function');
  });
});

describe('staging-folder hygiene', () => {
  it('recognises staging paths and leaves library paths alone', () => {
    expect(isStagedMusicPath('/data/Music/_incoming/music-abc.m4a')).toBe(true);
    expect(isStagedMusicPath('/data/Music/_review/music-def.mp3')).toBe(true);
    expect(isStagedMusicPath('/data/Music/_quarantine/x.m4a')).toBe(true);
    expect(isStagedMusicPath('/data/Music/AC-DC/Back in Black/01 - Back in Black.mp3')).toBe(false);
    expect(isStagedMusicPath('/data/Music/Non-Album/AC_DC/Thunderstruck.m4a')).toBe(false);
  });

  it('prunes only the staged rows', async () => {
    const rows = [
      { id: 435, path: '/data/Music/_incoming/music-v2AC41dglnM.m4a' },
      { id: 436, path: '/data/Music/_review/music-zsCD5XCu6CM.m4a' },
      { id: 437, path: '/data/Music/Non-Album/AC_DC/Thunderstruck.m4a' },
    ];
    const deleted: unknown[] = [];
    const drizzle = {
      select: () => ({ from: async () => rows }),
      delete: () => ({ where: async (condition: unknown) => { deleted.push(condition); } }),
    };
    expect(await pruneStagedMusicTracks(drizzle)).toBe(2);
    expect(deleted).toHaveLength(2);
  });
});

describe('backfillTrackLoudness', () => {
  it('measures only rows missing loudness, bounded by the limit, and stores the value', async () => {
    const updates: Array<{ id: number; lufs: number }> = [];
    const rows = [
      { id: 1, path: '/data/Music/a.mp3' },
      { id: 2, path: '/data/Music/b.mp3' },
      { id: 3, path: '/data/Music/c.mp3' },
    ];
    const drizzle = {
      select: () => ({ from: () => ({ where: () => ({ limit: (n: number) => Promise.resolve(rows.slice(0, n)) }) }) }),
      update: () => ({
        set: (values: { loudnessLufs: number }) => ({
          where: (cond: unknown) => {
            const id = (cond as { queryChunks?: unknown[] }) && Number((cond as unknown as { right?: { value?: number } }).right?.value ?? 0);
            updates.push({ id, lufs: values.loudnessLufs });
            return Promise.resolve();
          },
        }),
      }),
    };
    const measured = await backfillTrackLoudness(drizzle, {
      limit: 2,
      measure: async (path: string) => (path.endsWith('b.mp3') ? -9.5 : -12.0),
    });
    expect(measured).toBe(2);
    expect(updates).toHaveLength(2);
    expect(updates.map((u) => u.lufs)).toEqual([-12.0, -9.5]);
  });

  it('skips unreadable tracks and keeps going', async () => {
    const drizzle = {
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 5, path: '/data/Music/x.mp3' }, { id: 6, path: '/data/Music/y.mp3' }]) }) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    };
    const measured = await backfillTrackLoudness(drizzle, {
      measure: async (path: string) => (path.endsWith('x.mp3') ? null : -11),
    });
    expect(measured).toBe(1);
  });
});
