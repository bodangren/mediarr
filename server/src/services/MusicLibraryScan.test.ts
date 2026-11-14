import { describe, expect, it } from 'vitest';
import type { MusicScannerOptions } from './MusicScanner';
import { isStagedMusicPath, pruneStagedMusicTracks, runMusicLibraryScan } from './MusicLibraryScan';

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
