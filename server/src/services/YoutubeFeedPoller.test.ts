import { describe, expect, it, vi } from 'vitest';
import { YoutubeFeedPoller, type SubscriptionStore } from './YoutubeFeedPoller';

const PLAYLIST = {
  entries: [
    { id: 'aaaaaaaaaaa', title: 'First video', duration: 600, url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
    { id: 'bbbbbbbbbbb', title: 'Second video', duration: 900 },
    { id: 'ccccccccccc', title: 'A short', duration: 30, url: 'https://www.youtube.com/shorts/ccccccccccc' },
  ],
};

function store(existing: string[] = []): { store: SubscriptionStore; inserted: string[]; polls: Array<{ id: number; error: string | null | undefined }> } {
  const inserted: string[] = [];
  const polls: Array<{ id: number; error: string | null | undefined }> = [];
  const set = new Set(existing);
  return {
    inserted,
    polls,
    store: {
      videos: {
        existingVideoIds: async () => set,
        findByVideoId: async (videoId: string) => (set.has(videoId) ? { id: 1 } : null),
        insert: async (item) => {
          inserted.push(item.videoId);
          set.add(item.videoId);
          return { id: inserted.length };
        },
      },
      recordPoll: async (id, outcome) => { polls.push({ id, error: outcome.error }); },
    },
  };
}

const subscription = { id: 1, url: 'https://www.youtube.com/@example', title: 'Example' };

describe('YoutubeFeedPoller', () => {
  it('queues only new non-short entries and records the poll', async () => {
    const { store: s, inserted, polls } = store();
    const poller = new YoutubeFeedPoller({ runJson: async () => PLAYLIST });

    const result = await poller.poll(subscription, s);

    expect(result).toMatchObject({ seen: 3, queued: 2, skipped: 1, error: null });
    expect(inserted).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(polls).toEqual([{ id: 1, error: null }]);
  });

  it('is idempotent: a second poll queues nothing', async () => {
    const { store: s, inserted } = store(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    const poller = new YoutubeFeedPoller({ runJson: async () => PLAYLIST });

    const result = await poller.poll(subscription, s);

    expect(result.queued).toBe(0);
    expect(result.duplicates).toBe(2);
    expect(inserted).toEqual([]);
  });

  it('records the exact failure when yt-dlp fails instead of silently skipping', async () => {
    const { store: s, polls } = store();
    const poller = new YoutubeFeedPoller({ runJson: async () => { throw new Error('network unreachable'); } });

    const result = await poller.poll(subscription, s);

    expect(result.error).toBe('network unreachable');
    expect(polls).toEqual([{ id: 1, error: 'network unreachable' }]);
  });

  it('reports per-entry insert failures while still queueing the rest', async () => {
    const { store: s, inserted } = store();
    const original = s.videos.insert;
    s.videos.insert = async (item) => {
      if (item.videoId === 'aaaaaaaaaaa') throw new Error('disk full');
      return original(item);
    };
    const poller = new YoutubeFeedPoller({ runJson: async () => PLAYLIST });

    const result = await poller.poll(subscription, s);

    expect(result.queued).toBe(1);
    expect(result.failures).toEqual([{ videoId: 'aaaaaaaaaaa', error: 'disk full' }]);
    expect(inserted).toEqual(['bbbbbbbbbbb']);
  });

  it('flattens channel tabs and skips the shorts tab', async () => {
    const channel = {
      entries: [
        { id: 'UCxxxxxxxxxxxxxxxxxxxxxx', title: 'Example - Videos', entries: [
          { id: 'aaaaaaaaaaa', title: 'Long video 1' },
          { id: 'bbbbbbbbbbb', title: 'Long video 2' },
        ] },
        { id: 'UCxxxxxxxxxxxxxxxxxxxxxx', title: 'Example - Shorts', entries: [
          { id: 'ccccccccccc', title: 'Short 1' },
        ] },
      ],
    };
    const { store: s, inserted } = store();
    const poller = new YoutubeFeedPoller({ runJson: async () => channel });

    const result = await poller.poll(subscription, s);

    expect(result.seen).toBe(3);
    expect(result.queued).toBe(2);
    expect(inserted).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });

  it('honours the per-poll cap', async () => {
    const many = { entries: Array.from({ length: 6 }, (_, index) => ({ id: `id${index}00000000`, title: `v${index}` })) };
    const { store: s, inserted } = store();
    const poller = new YoutubeFeedPoller({ runJson: async () => many, perPollCap: 2 });

    const result = await poller.poll(subscription, s);

    expect(result.queued).toBe(2);
    expect(inserted).toHaveLength(2);
  });
});
