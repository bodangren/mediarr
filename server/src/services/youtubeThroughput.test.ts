import { describe, expect, it } from 'vitest';
import { parseYoutubeDownloadReceipts, summarizeYoutubeThroughput } from './youtubeThroughput';

const now = new Date('2026-11-09T12:00:00.000Z');

describe('summarizeYoutubeThroughput', () => {
  it('counts only receipts inside the 24 h window and computes an ETA', () => {
    const throughput = summarizeYoutubeThroughput([
      { at: '2026-11-09T11:00:00.000Z', downloaded: 2 },
      { at: '2026-11-09T03:00:00.000Z', downloaded: 1 },
      { at: '2026-11-07T03:00:00.000Z', downloaded: 50 }, // outside the window
      { at: 'not-a-date', downloaded: 99 },
    ], 300, now);
    expect(throughput).toMatchObject({ windowHours: 24, downloaded: 3, runs: 2, perHour: 0.125, etaHours: 2400 });
  });

  it('reports no ETA when nothing downloaded in the window', () => {
    expect(summarizeYoutubeThroughput([{ at: '2026-11-01T00:00:00.000Z', downloaded: 9 }], 316, now))
      .toMatchObject({ downloaded: 0, perHour: 0, etaHours: null });
  });

  it('parses JSONL receipts and skips malformed lines', () => {
    const parsed = parseYoutubeDownloadReceipts('{"at":"2026-11-09T11:00:00Z","downloaded":2}\nnot json\n\n{"at":"2026-11-09T10:00:00Z","downloaded":1}');
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.downloaded).toBe(2);
  });
});
