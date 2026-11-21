import { describe, expect, it } from 'vitest';
import { formatQuarantineSummary, reportQuarantine, summariseQuarantine } from './QuarantineReport';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 22);

describe('summariseQuarantine', () => {
  it('splits held bytes from bytes aged past the keep window', () => {
    const summary = summariseQuarantine([
      { sizeBytes: 10 * 1024 * 1024 * 1024, mtimeMs: now - 2 * DAY },
      { sizeBytes: 30 * 1024 * 1024 * 1024, mtimeMs: now - 9 * DAY },
    ], { now });
    expect(summary.totalFiles).toBe(2);
    expect(summary.reclaimableFiles).toBe(1);
    expect(summary.reclaimableBytes).toBe(30 * 1024 * 1024 * 1024);
  });

  it('honours a custom keep window', () => {
    const summary = summariseQuarantine([
      { sizeBytes: 5, mtimeMs: now - 2 * DAY },
    ], { now, keepDays: 1 });
    expect(summary.reclaimableFiles).toBe(1);
  });

  it('never deletes anything (pure summary only)', () => {
    const summary = summariseQuarantine([], { now });
    expect(summary).toMatchObject({ totalBytes: 0, totalFiles: 0, reclaimableFiles: 0 });
  });
});

describe('reportQuarantine', () => {
  it('survives a missing root and sums the roots it can read', async () => {
    const summary = await reportQuarantine({
      listFiles: async (root) => {
        if (root === '/data/_quarantine') throw new Error('missing');
        return [{ path: '/data/Youtube/_quarantine/a.mp4', sizeBytes: 100, mtimeMs: now - 1 * DAY }];
      },
    }, ['/data/_quarantine', '/data/Youtube/_quarantine'], { now });
    expect(summary.totalFiles).toBe(1);
    expect(summary.totalBytes).toBe(100);
  });

  it('formats a line an operator can act on', () => {
    const line = formatQuarantineSummary(
      { totalBytes: 40 * 1024 ** 3, totalFiles: 120, reclaimableBytes: 0, reclaimableFiles: 0 },
      7,
    );
    expect(line).toContain('40.0 GB');
    expect(line).toContain('owner-gated');
  });
});
