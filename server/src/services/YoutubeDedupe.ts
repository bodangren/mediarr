import { youtubeIdFromPath } from './YoutubePathReconcile';

/**
 * Retires duplicate library rows for the same YouTube video.
 *
 * Measured 2026-11-19: ids 7, 288 and 315 all referred to `dgDFPRol0cw` - two
 * references to the uncategorised mp4 plus the organised channel copy - so the
 * library could list one video more than once. The path reconcile fixed
 * playability; this pass keeps one row per video and marks the rest DELETED,
 * merging any watch state from the rows it retires so nothing is lost.
 *
 * Files are never touched: this is a library-row decision, not a deletion.
 */

export interface YoutubeDedupeRow {
  id: number;
  path: string | null;
  isWatched: boolean;
  position: number;
  watchedAt: number | null;
}

export interface YoutubeDedupeDeps {
  listRows(): Promise<YoutubeDedupeRow[]>;
  fileExists(filePath: string): Promise<boolean>;
  updateRow(id: number, patch: Partial<Pick<YoutubeDedupeRow, 'isWatched' | 'position' | 'watchedAt'>>): Promise<void>;
  retireRow(id: number, reason: string): Promise<void>;
}

export interface YoutubeDedupeResult {
  groups: number;
  retired: Array<{ id: number; videoId: string; keptId: number }>;
  mergedWatchState: Array<{ id: number; isWatched: boolean; position: number }>;
}

/** How good a row is as the surviving one: existing file, then watch state, then recency. */
function rowScore(row: YoutubeDedupeRow, exists: boolean): number {
  return (exists ? 1_000_000 : 0)
    + (row.isWatched ? 100_000 : 0)
    + Math.min(row.position ?? 0, 99_999)
    + (row.watchedAt ?? 0) / 1_000_000_000;
}

export async function dedupeYoutubeRows(deps: YoutubeDedupeDeps): Promise<YoutubeDedupeResult> {
  const rows = await deps.listRows();
  const groups = new Map<string, YoutubeDedupeRow[]>();
  // The grouping itself is cheap, but one caller also stats each row's file below; this
  // pass yields so a slow USB volume cannot hold the loop across ~600 rows (attributed to
  // this job by the stall labels: 3708 ms at 23:00, 2026-11-21).
  let lastYieldAt = Date.now();
  for (const row of rows) {
    if (Date.now() - lastYieldAt >= 20) {
      await new Promise((resolve) => setImmediate(resolve));
      lastYieldAt = Date.now();
    }
    if (!row.path) continue;
    const videoId = youtubeIdFromPath(row.path);
    if (!videoId) continue;
    const bucket = groups.get(videoId) ?? [];
    bucket.push(row);
    groups.set(videoId, bucket);
  }

  const result: YoutubeDedupeResult = { groups: 0, retired: [], mergedWatchState: [] };
  for (const [videoId, bucket] of groups) {
    if (bucket.length < 2) continue;
    result.groups += 1;

    const exists = new Map<number, boolean>();
    for (const row of bucket) {
      exists.set(row.id, row.path ? await deps.fileExists(row.path) : false);
    }
    const ordered = [...bucket].sort(
      (a, b) => rowScore(b, exists.get(b.id) ?? false) - rowScore(a, exists.get(a.id) ?? false),
    );
    const keep = ordered[0]!;

    // Carry watch state from the rows about to be retired.
    let isWatched = keep.isWatched;
    let position = keep.position ?? 0;
    let watchedAt = keep.watchedAt ?? null;
    for (const row of ordered.slice(1)) {
      if (row.isWatched && !isWatched) {
        isWatched = true;
        position = row.position ?? position;
        watchedAt = row.watchedAt ?? watchedAt;
      } else if (!isWatched && row.position > position) {
        position = row.position;
        watchedAt = row.watchedAt ?? watchedAt;
      }
    }
    if (isWatched !== keep.isWatched || position !== (keep.position ?? 0) || watchedAt !== (keep.watchedAt ?? null)) {
      await deps.updateRow(keep.id, { isWatched, position, ...(watchedAt === null ? {} : { watchedAt }) });
      result.mergedWatchState.push({ id: keep.id, isWatched, position });
    }

    for (const row of ordered.slice(1)) {
      await deps.retireRow(row.id, `duplicate row for YouTube video ${videoId}`);
      result.retired.push({ id: row.id, videoId, keptId: keep.id });
    }
  }
  return result;
}
