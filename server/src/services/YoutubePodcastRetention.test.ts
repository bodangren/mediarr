import { describe, expect, it } from 'vitest';
import { planPodcastRetention, type PodcastRetentionVideo } from './YoutubePodcastRetention';

/**
 * Owner request 2026-11-20: keep the newest few episodes per podcast source and drop
 * the rest **even when they were never watched** — the exact inverse of the old
 * watched+7d rule, which let unwatched episodes fill a 94 %-full disk.
 */
describe('planPodcastRetention', () => {
  const now = new Date('2026-11-20T23:00:00+08:00');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  function video(overrides: Partial<PodcastRetentionVideo> & { id: number }): PodcastRetentionVideo {
    return {
      subscriptionId: 7,
      status: 'AVAILABLE',
      publishedAt: daysAgo(1),
      isWatched: false,
      position: 0,
      lastPlayedAt: null,
      ...overrides,
    };
  }

  it('keeps the newest N per source and prunes the rest, watched or not', () => {
    const plan = planPodcastRetention([
      video({ id: 1, publishedAt: daysAgo(40), isWatched: true }),
      video({ id: 2, publishedAt: daysAgo(30) }),
      video({ id: 3, publishedAt: daysAgo(20) }),
      video({ id: 4, publishedAt: daysAgo(10) }),
      video({ id: 5, publishedAt: daysAgo(1) }),
    ], { keepLatest: 3, now });

    // Prune order follows the newest-first walk; what matters is the set.
    expect(plan.prune.map((entry) => entry.id).sort()).toEqual([1, 2]);
    expect(plan.keep).toEqual([5, 4, 3]);
  });

  it('never prunes an episode the owner is currently part-way through', () => {
    const plan = planPodcastRetention([
      video({ id: 1, publishedAt: daysAgo(40) }),
      video({ id: 2, publishedAt: daysAgo(30) }),
      video({ id: 3, publishedAt: daysAgo(20) }),
      video({ id: 4, publishedAt: daysAgo(10) }),
      // Old, out of the window, but started 2 hours ago.
      video({ id: 5, publishedAt: daysAgo(9), position: 120, lastPlayedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }),
    ], { keepLatest: 3, now });

    expect(plan.prune.map((entry) => entry.id)).not.toContain(5);
  });

  it('leaves undated archive rows and the imported archive alone', () => {
    const plan = planPodcastRetention([
      video({ id: 1, publishedAt: null }),
      video({ id: 2, publishedAt: null }),
      video({ id: 3, subscriptionId: null, publishedAt: daysAgo(500) }),
      video({ id: 4, publishedAt: daysAgo(1) }),
    ], { keepLatest: 1, now });

    expect(plan.prune.map((entry) => entry.id)).not.toContain(1);
    expect(plan.prune.map((entry) => entry.id)).not.toContain(2);
    expect(plan.prune.map((entry) => entry.id)).not.toContain(3);
  });

  it('does nothing when a source has no more than the window', () => {
    const plan = planPodcastRetention([video({ id: 1 }), video({ id: 2 })], { keepLatest: 3, now });
    expect(plan.prune).toEqual([]);
    expect(plan.keep.sort()).toEqual([1, 2]);
  });

  it('scopes the window per source instead of globally', () => {
    const plan = planPodcastRetention([
      video({ id: 1, subscriptionId: 7, publishedAt: daysAgo(1) }),
      video({ id: 2, subscriptionId: 7, publishedAt: daysAgo(2) }),
      video({ id: 3, subscriptionId: 8, publishedAt: daysAgo(3) }),
      video({ id: 4, subscriptionId: 8, publishedAt: daysAgo(4) }),
      video({ id: 5, subscriptionId: 7, publishedAt: daysAgo(50) }),
      video({ id: 6, subscriptionId: 8, publishedAt: daysAgo(60) }),
    ], { keepLatest: 2, now });

    expect(plan.prune.map((entry) => entry.id).sort()).toEqual([5, 6]);
  });

  it('only considers completed videos', () => {
    const plan = planPodcastRetention([
      video({ id: 1, publishedAt: daysAgo(1) }),
      video({ id: 2, status: 'PENDING', publishedAt: daysAgo(50) }),
      video({ id: 3, publishedAt: daysAgo(2) }),
    ], { keepLatest: 1, now });
    expect(plan.prune.map((entry) => entry.id)).toEqual([3]);
  });
});
