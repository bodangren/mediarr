import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readCoverageReceipts, snapshotCoverage } from './SubtitleCoverageAutomation';

const tmpDirs: string[] = [];
async function configDir(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sub-coverage-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) await fsp.rm(dir, { recursive: true, force: true });
});

describe('snapshotCoverage', () => {
  it('counts dual/zho-only/en-only/none from subtitle language coverage', async () => {
    const dir = await configDir();
    const drizzle = {
      all: async () => [
        { mediaType: 'MOVIE', mediaId: 1, english: 1, chinese: 1 },
        { mediaType: 'EPISODE', mediaId: 2, english: 0, chinese: 1 },
        { mediaType: 'EPISODE', mediaId: 3, english: 1, chinese: 0 },
        { mediaType: 'MOVIE', mediaId: 4, english: 0, chinese: 0 },
      ],
    };

    const snapshot = await snapshotCoverage(drizzle, { configDir: dir, days: 14, limit: 50 });

    expect(snapshot.counts).toEqual({ dual: 1, 'zho-only': 1, 'en-only': 1, none: 1 });
    expect(snapshot.items.map((item) => item.status)).toEqual(['dual', 'zho-only', 'en-only', 'none']);

    const receipts = await readCoverageReceipts(dir);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]?.counts.dual).toBe(1);
  });

  it('returns an empty receipt list before the first run', async () => {
    expect(await readCoverageReceipts(await configDir())).toEqual([]);
  });
});
