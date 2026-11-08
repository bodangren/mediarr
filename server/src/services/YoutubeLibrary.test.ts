import { describe, expect, it, vi } from 'vitest';
import {
  applyYoutubeProgress,
  retentionEligible,
  normalizeYoutubeVideoId,
  parseSubscriptionUrl,
  queueNewVideos,
  selectNewEntries,
  type FeedEntry,
  type VideoPersistence,
} from './YoutubeLibrary';

const VIDEO = 'dQw4w9WgXcQ';

function entry(overrides: Partial<FeedEntry> = {}): FeedEntry {
  return { videoId: VIDEO, title: 'Example', ...overrides };
}

describe('normalizeYoutubeVideoId', () => {
  it('accepts a bare id and every common URL shape', () => {
    expect(normalizeYoutubeVideoId(VIDEO)).toBe(VIDEO);
    expect(normalizeYoutubeVideoId(`https://youtu.be/${VIDEO}?t=10`)).toBe(VIDEO);
    expect(normalizeYoutubeVideoId(`https://www.youtube.com/watch?v=${VIDEO}`)).toBe(VIDEO);
    expect(normalizeYoutubeVideoId(`https://www.youtube.com/shorts/${VIDEO}`)).toBe(VIDEO);
    expect(normalizeYoutubeVideoId(`https://www.youtube.com/embed/${VIDEO}`)).toBe(VIDEO);
  });

  it('rejects junk rather than inventing an id', () => {
    expect(normalizeYoutubeVideoId('')).toBeNull();
    expect(normalizeYoutubeVideoId('not a video')).toBeNull();
    expect(normalizeYoutubeVideoId('https://example.com/watch?v=short')).toBeNull();
  });
});

describe('parseSubscriptionUrl', () => {
  it('recognises playlists, channel ids and handles', () => {
    expect(parseSubscriptionUrl('https://www.youtube.com/playlist?list=PL1234567890')).toEqual({
      kind: 'PLAYLIST',
      externalId: 'PL1234567890',
    });
    expect(parseSubscriptionUrl('https://www.youtube.com/channel/UC1234567890123456789012')).toEqual({
      kind: 'CHANNEL',
      externalId: 'UC1234567890123456789012',
    });
    expect(parseSubscriptionUrl('https://www.youtube.com/@DaveGrayTeachesCode')).toEqual({
      kind: 'CHANNEL',
      externalId: '@DaveGrayTeachesCode',
    });
  });

  it('returns null for a video URL, which is not a subscription', () => {
    expect(parseSubscriptionUrl(`https://youtu.be/${VIDEO}`)).toBeNull();
  });
});

describe('selectNewEntries', () => {
  it('drops duplicates and already-downloaded ids', () => {
    const decision = selectNewEntries(
      [entry({ videoId: 'aaaaaaaaaaa' }), entry({ videoId: 'aaaaaaaaaaa' })],
      new Set(['bbbbbbbbbbb']),
    );
    expect(decision.accepted.map((item) => item.videoId)).toEqual(['aaaaaaaaaaa']);
    expect(decision.skipped).toEqual([{ videoId: 'aaaaaaaaaaa', reason: 'duplicate' }]);
  });

  it('skips shorts and live by default (Y5) but can include them explicitly', () => {
    const shorts = entry({ videoId: 'ccccccccccc', isShort: true });
    const live = entry({ videoId: 'ddddddddddd', isLive: true });
    const strict = selectNewEntries([shorts, live], new Set());
    expect(strict.accepted).toHaveLength(0);
    expect(strict.skipped.map((item) => item.reason)).toEqual(['short', 'live']);

    const permissive = selectNewEntries([shorts, live], new Set(), { includeShorts: true, includeLive: true });
    expect(permissive.accepted).toHaveLength(2);
  });

  it('caps a poll and leaves the remainder for next time', () => {
    const entries = Array.from({ length: 5 }, (_, index) => entry({ videoId: `id${index}00000000` }));
    const decision = selectNewEntries(entries, new Set(), { perPollCap: 2 });
    expect(decision.accepted).toHaveLength(2);
  });

  it('reports invalid ids instead of silently dropping them', () => {
    const decision = selectNewEntries([entry({ videoId: 'nope' })], new Set());
    expect(decision.accepted).toHaveLength(0);
    expect(decision.skipped).toEqual([{ videoId: 'nope', reason: 'invalid-id' }]);
  });
});

describe('applyYoutubeProgress', () => {
  it('tracks position without marking watched early', () => {
    const update = applyYoutubeProgress({ position: 0, isWatched: false }, { positionSeconds: 120, durationSeconds: 600 });
    expect(update).toEqual({ position: 120, isWatched: false });
  });

  it('marks watched at 95% and never un-watches on replay', () => {
    const done = applyYoutubeProgress({ position: 0, isWatched: false }, { positionSeconds: 580, durationSeconds: 600 });
    expect(done.isWatched).toBe(true);
    const replay = applyYoutubeProgress({ position: 580, isWatched: true }, { positionSeconds: 5, durationSeconds: 600 });
    expect(replay).toEqual({ position: 5, isWatched: true });
  });

  it('clamps garbage positions to the known duration', () => {
    const update = applyYoutubeProgress({ position: 0, isWatched: false }, { positionSeconds: 99999, durationSeconds: 600 });
    expect(update.position).toBe(600);
  });

  it('does not mark watched when duration is unknown', () => {
    const update = applyYoutubeProgress({ position: 0, isWatched: false }, { positionSeconds: 5000 });
    expect(update.isWatched).toBe(false);
  });
});

describe('retentionEligible', () => {
  const now = new Date('2026-11-08T12:00:00Z');
  const watched = (daysAgo: number) => ({
    isWatched: true,
    watchedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    source: 'SUBSCRIPTION' as const,
  });

  it('retires a watched subscription video after the window', () => {
    expect(retentionEligible(watched(8), now)).toBe(true);
    expect(retentionEligible(watched(7), now)).toBe(true);
    expect(retentionEligible(watched(6), now)).toBe(false);
  });

  it('never retires unwatched or imported archive items', () => {
    expect(retentionEligible({ isWatched: false, watchedAt: null, source: 'SUBSCRIPTION' }, now)).toBe(false);
    expect(retentionEligible({ ...watched(30), source: 'IMPORT' }, now)).toBe(false);
    expect(retentionEligible({ isWatched: true, watchedAt: null, source: 'SUBSCRIPTION' }, now)).toBe(false);
  });

  it('honours a custom retention window', () => {
    expect(retentionEligible(watched(3), now, 1)).toBe(true);
    expect(retentionEligible(watched(3), now, 30)).toBe(false);
  });
});

describe('queueNewVideos', () => {
  function store(existing: string[] = []): { persistence: VideoPersistence; inserted: string[] } {
    const inserted: string[] = [];
    const persistence: VideoPersistence = {
      findByVideoId: vi.fn(async (videoId: string) => (existing.includes(videoId) ? { id: 1 } : null)),
      insert: vi.fn(async (item: FeedEntry & { subscriptionId: number }) => {
        inserted.push(item.videoId);
        return { id: inserted.length };
      }),
    };
    return { persistence, inserted };
  }

  it('downloads a video id exactly once across repeated polls', async () => {
    const { persistence, inserted } = store();
    const feed = [entry()];

    const first = await queueNewVideos(feed, 1, persistence);
    const second = await queueNewVideos(feed, 1, {
      findByVideoId: async () => ({ id: 1 }),
      insert: persistence.insert,
    });

    expect(first.queued).toBe(1);
    expect(second.queued).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(inserted).toEqual([VIDEO]);
  });

  it('reports a per-entry failure without aborting the rest', async () => {
    const inserted: string[] = [];
    const persistence: VideoPersistence = {
      findByVideoId: async () => null,
      insert: async (item) => {
        if (item.videoId === 'fail0000000') throw new Error('disk full');
        inserted.push(item.videoId);
        return { id: 1 };
      },
    };
    const result = await queueNewVideos(
      [entry({ videoId: 'fail0000000' }), entry({ videoId: 'okay0000000' })],
      1,
      persistence,
    );
    expect(result.queued).toBe(1);
    expect(result.failures).toEqual([{ videoId: 'fail0000000', error: 'disk full' }]);
    expect(inserted).toEqual(['okay0000000']);
  });
});
