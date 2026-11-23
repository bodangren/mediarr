import { describe, expect, it } from 'vitest';
import { planQueueTrim, pullWindowDays } from './YoutubeAutomation';

describe('pullWindowDays', () => {
  it('defaults to the seven-day retention window', () => {
    expect(pullWindowDays({})).toBe(7);
    expect(pullWindowDays(null)).toBe(7);
  });

  it('honours a per-subscription retentionDays override inside a sane range', () => {
    expect(pullWindowDays({ retentionDays: 30 })).toBe(30);
    expect(pullWindowDays({ retentionDays: 1 })).toBe(1);
    expect(pullWindowDays({ retentionDays: 0 })).toBe(7);
    expect(pullWindowDays({ retentionDays: 999 })).toBe(7);
    expect(pullWindowDays({ retentionDays: 'nope' })).toBe(7);
  });
});

describe('planQueueTrim', () => {
  const queued = [
    { id: 1, videoId: 'newwwwwwwww' },
    { id: 2, videoId: 'olddddddddd' },
    { id: 3, videoId: 'ancienttttt' },
  ];

  it('retires rows whose listing date proves they are outside the window', () => {
    expect(planQueueTrim(queued, {
      windowVideoIds: ['newwwwwwwww'],
      outsideVideoIds: ['olddddddddd'],
      windowComplete: false,
    })).toEqual([2]);
  });

  it('retires every row the window listing does not contain once the listing covered the window', () => {
    expect(planQueueTrim(queued, {
      windowVideoIds: ['newwwwwwwww'],
      outsideVideoIds: [],
      windowComplete: true,
    })).toEqual([2, 3]);
  });

  it('keeps unknown rows when the listing never reached past the window', () => {
    expect(planQueueTrim(queued, {
      windowVideoIds: ['newwwwwwwww'],
      outsideVideoIds: [],
      windowComplete: false,
    })).toEqual([]);
  });
});
