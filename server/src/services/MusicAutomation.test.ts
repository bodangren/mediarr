import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendIngestReceipt,
  buildNightlyReceipt,
  readIngestReceipts,
  summarizeReceipts,
} from './MusicAutomation';

const tmpDirs: string[] = [];
async function configDir(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'music-receipts-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) await fsp.rm(dir, { recursive: true, force: true });
});

describe('music ingest receipts', () => {
  it('appends one JSONL line per attempt and reads them back', async () => {
    const dir = await configDir();
    await appendIngestReceipt(dir, { videoId: 'aaaaaaaaaaa', status: 'FILED', reason: null, path: '/data/Music/A/B/01 - x.m4a' });
    await appendIngestReceipt(dir, { videoId: 'bbbbbbbbbbb', status: 'FAILED', reason: 'yt-dlp: video unavailable', path: null });

    const receipts = await readIngestReceipts(dir);

    expect(receipts).toHaveLength(2);
    expect(receipts[1]).toMatchObject({ videoId: 'bbbbbbbbbbb', status: 'FAILED', reason: 'yt-dlp: video unavailable' });
    expect(receipts[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns an empty list when no runs happened yet', async () => {
    expect(await readIngestReceipts(await configDir())).toEqual([]);
  });

  it('summarises a batch honestly', () => {
    const base = { at: new Date().toISOString(), videoId: 'x', reason: null, path: null } as const;
    expect(summarizeReceipts([
      { ...base, status: 'FILED' },
      { ...base, status: 'REVIEW' },
      { ...base, status: 'FAILED' },
      { ...base, status: 'SKIPPED' },
      { ...base, status: 'FAILED' },
    ])).toEqual({ attempted: 4, filed: 1, review: 1, failed: 2, skipped: 1 });
  });
});

describe('buildNightlyReceipt', () => {
  it('reports library size and aggregates ingest outcomes', () => {
    const receipt = buildNightlyReceipt({
      tracks: 217,
      artists: 12,
      albums: 16,
      now: new Date('2026-11-09T05:10:00Z'),
      ingests: [
        { at: '2026-11-08T00:00:00Z', videoId: 'a', status: 'FILED', reason: null, path: '/x' },
        { at: '2026-11-08T00:00:00Z', videoId: 'b', status: 'FAILED', reason: 'yt-dlp: bot check', path: null },
        { at: '2026-11-08T00:00:00Z', videoId: 'c', status: 'SKIPPED', reason: 'duplicate', path: null },
      ],
    });
    expect(receipt).toMatchObject({
      at: '2026-11-09T05:10:00.000Z',
      tracks: 217,
      artists: 12,
      albums: 16,
      libraryComplete: true,
    });
    expect(receipt.ingests).toEqual({ attempted: 2, filed: 1, review: 0, failed: 1, skipped: 1 });
  });

  it('flags an empty library as incomplete', () => {
    expect(buildNightlyReceipt({ tracks: 0, artists: 0, albums: 0, ingests: [] }).libraryComplete).toBe(false);
  });
});
