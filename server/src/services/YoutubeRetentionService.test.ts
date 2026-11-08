import { describe, expect, it, vi } from 'vitest';
import {
  planYoutubeRetention,
  runYoutubeRetention,
  restoreYoutubeRetention,
  type YoutubeRetentionInfra,
} from './YoutubeRetentionService';

const NOW = new Date('2026-11-08T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const watchedOld = {
  id: 1,
  path: '/data/Youtube/Dave Gray/Old video [aaaaaaaaaaa].mp4',
  isWatched: true,
  watchedAt: daysAgo(8),
  source: 'SUBSCRIPTION',
};
const watchedFresh = { ...watchedOld, id: 2, watchedAt: daysAgo(2), path: '/data/Youtube/Dave Gray/New video [bbbbbbbbbbb].mp4' };
const archived = { ...watchedOld, id: 3, source: 'IMPORT', path: '/data/Youtube/Archive/old [ccccccccccc].mp4' };

function io(): { io: YoutubeRetentionInfra; moved: string[]; manifests: string[] } {
  const moved: string[] = [];
  const manifests: string[] = [];
  return {
    moved,
    manifests,
    io: {
      mkdir: async () => undefined,
      rename: async (from: string) => { moved.push(from); },
      copyFile: async () => undefined,
      unlink: async () => undefined,
      stat: async () => ({ size: 1024 }),
      appendFile: async (_file: string, data: string) => { manifests.push(data); },
    },
  };
}

describe('planYoutubeRetention', () => {
  it('plans only watched subscription videos past the window', () => {
    const plan = planYoutubeRetention([watchedOld, watchedFresh, archived], {
      mediaRoot: '/data/Youtube',
      quarantineRoot: '/data/Youtube/_quarantine',
      now: NOW,
    });
    expect(plan.videos).toEqual([{
      id: 1,
      originalPath: watchedOld.path,
      quarantinePath: '/data/Youtube/_quarantine/Dave Gray/Old video [aaaaaaaaaaa].mp4',
    }]);
    expect(plan.plan.skipped).toEqual([]);
  });

  it('respects a custom window', () => {
    const plan = planYoutubeRetention([watchedOld, watchedFresh], {
      mediaRoot: '/data/Youtube',
      quarantineRoot: '/data/Youtube/_quarantine',
      now: NOW,
      retentionDays: 2,
    });
    expect(plan.videos.map((video) => video.id)).toEqual([1, 2]);
  });
});

describe('runYoutubeRetention', () => {
  it('defaults to dry run and touches nothing', async () => {
    const plan = planYoutubeRetention([watchedOld], {
      mediaRoot: '/data/Youtube', quarantineRoot: '/data/Youtube/_quarantine', now: NOW,
    });
    const { io: fake, moved, manifests } = io();
    const outcome = await runYoutubeRetention(plan, { io: fake });
    expect(outcome).toMatchObject({ dryRun: true });
    expect(outcome.moved.map((item) => item.id)).toEqual([1]);
    expect(moved).toEqual([]);
    expect(manifests).toEqual([]);
  });

  it('moves files and writes one manifest line per file when real', async () => {
    const plan = planYoutubeRetention([watchedOld], {
      mediaRoot: '/data/Youtube', quarantineRoot: '/data/Youtube/_quarantine', now: NOW,
    });
    const { io: fake, moved, manifests } = io();
    const outcome = await runYoutubeRetention(plan, { io: fake, dryRun: false, now: NOW });
    expect(outcome.dryRun).toBe(false);
    expect(moved).toHaveLength(1);
    expect(manifests[0]).toContain('"action":"quarantine"');
    expect(manifests[0]).toContain(watchedOld.path);
  });

  it('reports a failed move per video instead of aborting the batch', async () => {
    const plan = planYoutubeRetention([watchedOld, watchedFresh], {
      mediaRoot: '/data/Youtube', quarantineRoot: '/data/Youtube/_quarantine', now: NOW, retentionDays: 1,
    });
    const { io: fake } = io();
    fake.rename = vi.fn(async (from: string) => {
      if (from.includes('Old video')) throw new Error('disk full');
    });
    const outcome = await runYoutubeRetention(plan, { io: fake, dryRun: false, now: NOW });
    expect(outcome.moved.map((item) => item.id)).toEqual([2]);
    expect(outcome.failed).toEqual([{ id: 1, path: watchedOld.path, error: 'disk full' }]);
  });
});

describe('restoreYoutubeRetention', () => {
  it('restores a quarantined file back to its original path', async () => {
    const rename = vi.fn(async () => undefined);
    const result = await restoreYoutubeRetention(
      { originalPath: watchedOld.path, quarantinePath: '/data/Youtube/_quarantine/Dave Gray/Old video [aaaaaaaaaaa].mp4' },
      { io: { mkdir: async () => undefined, rename, copyFile: async () => undefined, unlink: async () => undefined, stat: async () => ({ size: 1 }) }, dryRun: false },
    );
    expect(result.restored).toBe(true);
    expect(rename).toHaveBeenCalledWith(
      '/data/Youtube/_quarantine/Dave Gray/Old video [aaaaaaaaaaa].mp4',
      watchedOld.path,
    );
  });
});
