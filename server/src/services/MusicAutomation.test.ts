import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appendIngestReceipt, readIngestReceipts, summarizeReceipts } from './MusicAutomation';

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
