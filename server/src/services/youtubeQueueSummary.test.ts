import { describe, expect, it } from 'vitest';
import { summarizeYoutubeQueue } from './youtubeQueueSummary';

describe('summarizeYoutubeQueue', () => {
  it('counts every known status and splits failed into retrying vs exhausted', () => {
    expect(summarizeYoutubeQueue([
      { status: 'AVAILABLE', count: 299 },
      { status: 'PENDING', count: 316 },
      { status: 'DOWNLOADING', count: 2 },
      { status: 'FAILED', attempts: 0, count: 30 },
      { status: 'FAILED', attempts: 1, count: 4 },
      { status: 'FAILED', attempts: 3, count: 9 },
      { status: 'QUARANTINED', count: 1 },
    ])).toEqual({
      available: 299, pending: 316, downloading: 2,
      failed: 43, retrying: 34, exhausted: 9,
      quarantined: 1, total: 661,
    });
  });

  it('counts unknown statuses in the total only', () => {
    expect(summarizeYoutubeQueue([{ status: 'SOMETHING_NEW', count: 5 }, { status: 'AVAILABLE', count: 1 }]))
      .toEqual({ available: 1, pending: 0, downloading: 0, failed: 0, retrying: 0, exhausted: 0, quarantined: 0, total: 6 });
  });
});
