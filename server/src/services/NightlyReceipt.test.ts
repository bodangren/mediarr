import { describe, expect, it } from 'vitest';
import { buildEngineNightlyReceipt, formatEngineNightlyReceipt } from './NightlyReceipt';

const base = {
  windowHours: 24,
  youtube: { available: 632, pending: 5, failed: 7 },
  library: { movies: 576, series: 44, episodes: 4398 },
  quarantine: { heldBytes: 40 * 1024 ** 3, reclaimableBytes: 0 },
};

describe('buildNightlyReceipt', () => {
  it('counts failures by task name (the join key) with the last error', () => {
    const receipt = buildEngineNightlyReceipt({
      ...base,
      taskExecutions: [
        { taskName: 'youtube-download', status: 'FAILED', errorMessage: 'format' },
        { taskName: 'youtube-download', status: 'FAILED', errorMessage: 'timeout' },
        { taskName: 'subtitle-sync', status: 'SUCCESS' },
      ],
    }, new Date('2026-11-22T05:00:00+08:00'));

    expect(receipt.tasks.total).toBe(3);
    expect(receipt.tasks.failed).toBe(2);
    expect(receipt.tasks.failures).toEqual([
      { taskName: 'youtube-download', count: 2, lastError: 'timeout' },
    ]);
  });

  it('is quiet when everything succeeded', () => {
    const receipt = buildEngineNightlyReceipt({
      ...base,
      taskExecutions: [{ taskName: 'subtitle-sync', status: 'SUCCESS' }],
    });
    expect(receipt.tasks.failures).toEqual([]);
    expect(formatEngineNightlyReceipt(receipt)).toContain('no failed tasks');
  });

  it('formats the owner-facing line', () => {
    const line = formatEngineNightlyReceipt(buildEngineNightlyReceipt({ ...base, taskExecutions: [] }));
    expect(line).toContain('youtube 632 available');
    expect(line).toContain('portfolio'.length > 0 ? 'library 576 movies' : '');
  });
});
