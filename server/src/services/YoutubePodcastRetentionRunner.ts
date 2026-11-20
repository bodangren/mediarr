import {
  planPodcastRetention,
  type PodcastRetentionVideo,
} from './YoutubePodcastRetention';

/**
 * Execution half of podcast retention: turns `planPodcastRetention`'s decision into
 * quarantine moves with receipts.
 *
 * Owner ask (2026-11-20): *"Delete ones that are more than a few episodes old even if
 * they are unwatched."* Files never get unlinked here — they move into the quarantine
 * root with a manifest (the same engine the adult library uses), so a wrong prune is
 * recoverable; a separate purge retires them later.
 */

export interface PodcastRetentionRunnerDeps {
  listVideos(): Promise<Array<PodcastRetentionVideo & { path: string | null }>>;
  /** Per-subscription keep window; defaults applied by the caller. */
  keepLatestFor(subscriptionId: number): Promise<number>;
  /** Moves files into quarantine and returns what moved; dry-run must not touch disk. */
  quarantine(paths: string[]): Promise<{
    moved: Array<{ originalPath: string; quarantinePath: string }>;
    failed: Array<{ path: string; error: string }>;
  }>;
  markQuarantined(moved: Array<{ id: number; quarantinePath: string }>, reason: string): Promise<void>;
  appendReceipt(lines: string[]): Promise<void>;
}

export interface PodcastRetentionRunResult {
  dryRun: boolean;
  planned: number;
  moved: Array<{ id: number; subscriptionId: number; originalPath: string; quarantinePath: string }>;
  failed: Array<{ id: number; path: string; error: string }>;
  skipped: number;
}

const RECEIPT_REASON = 'podcast-retention: older than the newest kept episodes';

export async function runPodcastRetention(
  deps: PodcastRetentionRunnerDeps,
  options: { dryRun?: boolean; now?: Date } = {},
): Promise<PodcastRetentionRunResult> {
  const dryRun = options.dryRun === true;
  const now = options.now ?? new Date();
  const videos = await deps.listVideos();

  // Group by source so each source uses its own keep window.
  const bySource = new Map<number, Array<PodcastRetentionVideo & { path: string | null }>>();
  for (const video of videos) {
    if (video.subscriptionId === null) continue;
    const bucket = bySource.get(video.subscriptionId) ?? [];
    bucket.push(video);
    bySource.set(video.subscriptionId, bucket);
  }

  const plannedPrunes: Array<{ id: number; subscriptionId: number; path: string; publishedAt: string | null }> = [];
  for (const [subscriptionId, bucket] of bySource) {
    const keepLatest = await deps.keepLatestFor(subscriptionId);
    const plan = planPodcastRetention(bucket, { keepLatest, now });
    for (const entry of plan.prune) {
      const video = bucket.find((row) => row.id === entry.id);
      if (!video?.path) continue;
      plannedPrunes.push({
        id: video.id,
        subscriptionId,
        path: video.path,
        publishedAt: entry.publishedAt,
      });
    }
  }

  const result: PodcastRetentionRunResult = {
    dryRun,
    planned: plannedPrunes.length,
    moved: [],
    failed: [],
    skipped: videos.length - plannedPrunes.length,
  };
  if (plannedPrunes.length === 0) return result;

  if (dryRun) {
    // Dry-run reports the plan without touching disk or the database.
    return result;
  }

  const outcome = await deps.quarantine(plannedPrunes.map((entry) => entry.path));
  const movedByPath = new Map(outcome.moved.map((entry) => [entry.originalPath, entry.quarantinePath]));
  const failedByPath = new Map(outcome.failed.map((entry) => [entry.path, entry.error]));

  const movedRows: Array<{ id: number; quarantinePath: string }> = [];
  const receipts: string[] = [];
  for (const entry of plannedPrunes) {
    const quarantinePath = movedByPath.get(entry.path);
    if (!quarantinePath) {
      result.failed.push({ id: entry.id, path: entry.path, error: failedByPath.get(entry.path) ?? 'not moved' });
      continue;
    }
    movedRows.push({ id: entry.id, quarantinePath });
    result.moved.push({
      id: entry.id,
      subscriptionId: entry.subscriptionId,
      originalPath: entry.path,
      quarantinePath,
    });
    receipts.push(JSON.stringify({
      at: now.toISOString(),
      videoId: entry.id,
      subscriptionId: entry.subscriptionId,
      reason: RECEIPT_REASON,
      publishedAt: entry.publishedAt,
      originalPath: entry.path,
      quarantinePath,
    }));
  }

  if (movedRows.length > 0) {
    await deps.markQuarantined(movedRows, RECEIPT_REASON);
    await deps.appendReceipt(receipts);
  }
  return result;
}
