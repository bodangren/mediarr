import path from 'node:path';
import {
  executeQuarantine,
  planQuarantine,
  type QuarantineFs,
  type QuarantinePlan,
  type QuarantineResult,
} from './QuarantineService';
import { retentionEligible } from './YoutubeLibrary';

/**
 * YouTube watched+7d retention (track feature_youtube_library_20261107, Phase 3).
 *
 * Reuses the Adult quarantine engine rather than duplicating delete logic: planning is pure and
 * dry-run first, execute moves into the quarantine root with an append-only manifest, and restore
 * puts a file back only when the row says it is quarantined. Imported archive files never enter here.
 */

export interface RetentionVideo {
  id: number;
  path: string | null;
  isWatched: boolean;
  watchedAt: Date | null;
  source: string;
}

export interface RetentionPlan {
  plan: QuarantinePlan;
  videos: Array<{ id: number; originalPath: string; quarantinePath: string }>;
}

export function planYoutubeRetention(
  videos: readonly RetentionVideo[],
  options: { mediaRoot: string; quarantineRoot: string; now?: Date; retentionDays?: number },
): RetentionPlan {
  const now = options.now ?? new Date();
  const eligible = videos.filter((video) =>
    video.path !== null
    && retentionEligible(
      { isWatched: video.isWatched, watchedAt: video.watchedAt, source: video.source },
      now,
      options.retentionDays ?? 7,
    ));
  const plan = planQuarantine(
    eligible.map((video) => video.path as string),
    { mediaRoot: options.mediaRoot, quarantineRoot: options.quarantineRoot },
  );
  const videosByPath = new Map(eligible.map((video) => [video.path as string, video.id]));
  return {
    plan,
    videos: plan.entries.map((entry) => ({
      id: videosByPath.get(entry.originalPath) ?? -1,
      originalPath: entry.originalPath,
      quarantinePath: entry.quarantinePath,
    })),
  };
}

export interface YoutubeRetentionInfra extends QuarantineFs {
  appendFile(file: string, data: string): Promise<void>;
}

export interface RetentionOutcome {
  dryRun: boolean;
  moved: Array<{ id: number; originalPath: string; quarantinePath: string }>;
  failed: Array<{ id: number; path: string; error: string }>;
}

export async function runYoutubeRetention(
  plan: RetentionPlan,
  options: { io: YoutubeRetentionInfra; dryRun?: boolean; now?: Date },
): Promise<RetentionOutcome> {
  const dryRun = options.dryRun !== false;
  const result: QuarantineResult = await executeQuarantine(plan.plan, {
    io: options.io,
    dryRun,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const movedPaths = new Set(result.moved);
  const moved = plan.videos
    .filter((video) => movedPaths.has(video.originalPath))
    .map((video) => ({ id: video.id, originalPath: video.originalPath, quarantinePath: video.quarantinePath }));
  const failedByPath = new Map(result.failed.map((failure) => [failure.path, failure.error]));
  const failed = plan.videos
    .filter((video) => failedByPath.has(video.originalPath))
    .map((video) => ({
      id: video.id,
      path: video.originalPath,
      error: failedByPath.get(video.originalPath) ?? 'unknown error',
    }));

  if (!dryRun && result.manifestLines.length > 0 && options.io.appendFile) {
    await options.io.appendFile(
      path.posix.join(path.posix.dirname(plan.plan.entries[0]?.quarantinePath ?? ''), '..', 'youtube-manifest.jsonl'),
      `${result.manifestLines.join('\n')}\n`,
    );
  }
  return { dryRun, moved, failed };
}

/** Restore one quarantined file; caller supplies the manifest entry from the quarantine manifest. */
export async function restoreYoutubeRetention(
  entry: { originalPath: string; quarantinePath: string },
  options: { io: QuarantineFs; dryRun?: boolean },
): Promise<{ restored: boolean; error?: string }> {
  if (options.dryRun !== false) return { restored: true };
  try {
    const dir = path.posix.dirname(entry.originalPath);
    await options.io.mkdir(dir, { recursive: true });
    await options.io.rename(entry.quarantinePath, entry.originalPath);
    return { restored: true };
  } catch (error) {
    return { restored: false, error: error instanceof Error ? error.message : String(error) };
  }
}
