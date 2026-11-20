/**
 * Retention planner for the podcast-shaped YouTube library.
 *
 * Owner ask (2026-11-20): *"Delete ones that are more than a few episodes old even if
 * they are unwatched."* The existing engine retention is the inverse — it only prunes
 * watched+7d items — so a podcast you never watched grows for ever on a 94 %-full disk.
 *
 * This planner is pure: it decides which video ids to keep and which to prune per
 * subscription, with rails that protect whatever the owner is actually using.
 */

export interface PodcastRetentionVideo {
  id: number;
  /** Null for the imported archive: it is not a podcast source and is never pruned here. */
  subscriptionId: number | null;
  status: string;
  publishedAt: Date | null;
  isWatched: boolean;
  /** Playback position in seconds; >0 within the in-progress window protects the row. */
  position: number;
  lastPlayedAt: Date | null;
}

export interface PodcastRetentionPlan {
  keep: number[];
  prune: Array<{ id: number; subscriptionId: number; reason: 'older-than-window'; publishedAt: string | null }>;
}

export interface PodcastRetentionOptions {
  /** Newest N per source survive, whatever their watched state. Default 3. */
  keepLatest?: number;
  now?: Date;
  /** Anything played this recently is treated as in progress and never pruned. */
  inProgressHours?: number;
}

const HOUR_MS = 60 * 60 * 1000;

export function planPodcastRetention(
  videos: readonly PodcastRetentionVideo[],
  options: PodcastRetentionOptions = {},
): PodcastRetentionPlan {
  const keepLatest = Math.max(1, Math.min(20, options.keepLatest ?? 3));
  const now = options.now ?? new Date();
  const inProgressMs = (options.inProgressHours ?? 24) * HOUR_MS;

  const bySource = new Map<number, PodcastRetentionVideo[]>();
  for (const video of videos) {
    if (video.subscriptionId === null) continue;
    if (video.status !== 'AVAILABLE') continue;
    const bucket = bySource.get(video.subscriptionId) ?? [];
    bucket.push(video);
    bySource.set(video.subscriptionId, bucket);
  }

  const plan: PodcastRetentionPlan = { keep: [], prune: [] };
  for (const [subscriptionId, bucket] of bySource) {
    // Newest first; undated rows sink to the bottom but are never pruned (we cannot
    // honestly call them "older than the window" without a date).
    const ordered = [...bucket].sort((a, b) => {
      const left = a.publishedAt ? a.publishedAt.getTime() : Number.NEGATIVE_INFINITY;
      const right = b.publishedAt ? b.publishedAt.getTime() : Number.NEGATIVE_INFINITY;
      return right - left;
    });
    const protectedIds = new Set<number>();
    for (const video of ordered) {
      if (video.publishedAt === null) protectedIds.add(video.id);
      if (video.position > 0 && !video.isWatched) {
        const playedAt = video.lastPlayedAt ? video.lastPlayedAt.getTime() : 0;
        if (now.getTime() - playedAt <= inProgressMs) protectedIds.add(video.id);
      }
    }
    ordered.forEach((video, index) => {
      if (index < keepLatest || protectedIds.has(video.id)) {
        plan.keep.push(video.id);
        return;
      }
      plan.prune.push({
        id: video.id,
        subscriptionId,
        reason: 'older-than-window',
        publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
      });
    });
  }
  return plan;
}
