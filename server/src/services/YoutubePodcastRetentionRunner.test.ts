import { describe, expect, it, vi } from 'vitest';
import { runPodcastRetention } from './YoutubePodcastRetentionRunner';

/**
 * Execution cover for the owner's ask (2026-11-20): prune podcast episodes older than
 * the newest kept few, quarantining rather than unlinking, with receipts.
 */
describe('runPodcastRetention', () => {
  it('never prunes a source that has no keep window', async () => {
    const quarantine = vi.fn();
    const result = await runPodcastRetention({
      listVideos: async () => [row(1), row(2), row(3), row(4), row(5)],
      keepLatestFor: async () => 0,
      quarantine,
      markQuarantined: async () => undefined,
      appendReceipt: async () => undefined,
    }, { now });

    expect(result.planned).toBe(0);
    expect(quarantine).not.toHaveBeenCalled();
  });

  const now = new Date('2026-11-21T06:00:00+08:00');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  function row(id: number, overrides: Record<string, unknown> = {}) {
    return {
      id,
      subscriptionId: 9,
      status: 'AVAILABLE',
      publishedAt: daysAgo(id),
      isWatched: false,
      position: 0,
      lastPlayedAt: null,
      path: `/data/Youtube/ep-${id}.mp4`,
      ...overrides,
    };
  }

  it('quarantines exactly the episodes outside the keep window and records receipts', async () => {
    const quarantine = vi.fn(async (paths: string[]) => ({
      moved: paths.map((path) => ({ originalPath: path, quarantinePath: path.replace('/data/Youtube', '/data/_quarantine') })),
      failed: [],
    }));
    const marked: Array<{ ids: number[]; reason: string; quarantinePaths: string[] }> = [];
    const receipts: string[] = [];

    const result = await runPodcastRetention({
      listVideos: async () => [row(1), row(2), row(3), row(4), row(5)],
      keepLatestFor: async () => 3,
      quarantine,
      markQuarantined: async (moved, reason) => {
        marked.push({ ids: moved.map((row) => row.id), reason, quarantinePaths: moved.map((row) => row.quarantinePath) });
      },
      appendReceipt: async (lines) => { receipts.push(...lines); },
    }, { now });

    expect(result.planned).toBe(2);
    expect(quarantine).toHaveBeenCalledWith(['/data/Youtube/ep-4.mp4', '/data/Youtube/ep-5.mp4']);
    expect(marked).toHaveLength(1);
    expect(marked[0]!.ids.sort()).toEqual([4, 5]);
    expect(marked[0]!.quarantinePaths[0]).toBe('/data/_quarantine/ep-4.mp4');
    expect(receipts).toHaveLength(2);
    expect(JSON.parse(receipts[0]!)).toMatchObject({ videoId: 4, subscriptionId: 9, reason: expect.stringContaining('podcast-retention') });
  });

  it('dry-run reports the plan without moving or marking anything', async () => {
    const quarantine = vi.fn();
    const mark = vi.fn();
    const result = await runPodcastRetention({
      listVideos: async () => [row(1), row(2), row(3), row(4)],
      keepLatestFor: async () => 2,
      quarantine,
      markQuarantined: mark,
      appendReceipt: async () => undefined,
    }, { dryRun: true, now });

    expect(result.planned).toBe(2);
    expect(result.moved).toEqual([]);
    expect(quarantine).not.toHaveBeenCalled();
    expect(mark).not.toHaveBeenCalled();
  });

  it('honours a per-source keep window and protects in-progress playback', async () => {
    const quarantine = vi.fn(async (paths: string[]) => ({
      moved: paths.map((path) => ({ originalPath: path, quarantinePath: `/q/${path.split('/').pop()}` })),
      failed: [],
    }));
    const inProgress = row(5, { position: 300, lastPlayedAt: new Date(now.getTime() - 60 * 60 * 1000) });

    const result = await runPodcastRetention({
      listVideos: async () => [
        row(1, { subscriptionId: 9 }),
        row(2, { subscriptionId: 9 }),
        row(3, { subscriptionId: 9 }),
        inProgress,
        row(6, { subscriptionId: 10 }),
        row(7, { subscriptionId: 10 }),
      ],
      keepLatestFor: async (subscriptionId) => (subscriptionId === 10 ? 2 : 2),
      quarantine,
      markQuarantined: async () => undefined,
      appendReceipt: async () => undefined,
    }, { now });

    const movedPaths = quarantine.mock.calls[0]![0] as string[];
    expect(movedPaths).toEqual(['/data/Youtube/ep-3.mp4']);
    expect(movedPaths).not.toContain('/data/Youtube/ep-5.mp4');
    expect(result.moved).toHaveLength(1);
  });

  it('surfaces a failed move instead of marking it quarantined', async () => {
    const marked: number[][] = [];
    const result = await runPodcastRetention({
      listVideos: async () => [row(1), row(2), row(3), row(4)],
      keepLatestFor: async () => 2,
      quarantine: async () => ({
        moved: [{ originalPath: '/data/Youtube/ep-3.mp4', quarantinePath: '/data/_quarantine/ep-3.mp4' }],
        failed: [{ path: '/data/Youtube/ep-4.mp4', error: 'EBUSY' }],
      }),
      markQuarantined: async (moved) => { marked.push(moved.map((row) => row.id)); },
      appendReceipt: async () => undefined,
    }, { now });

    expect(result.failed).toEqual([{ id: 4, path: '/data/Youtube/ep-4.mp4', error: 'EBUSY' }]);
    expect(marked).toEqual([[3]]);
  });
});
