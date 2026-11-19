import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Repoints YouTube rows whose file moved on disk, and retires rows whose file is
 * gone for good.
 *
 * Measured 2026-11-19: video 315 (`dgDFPRol0cw`) had `status=AVAILABLE` but
 * `path=/data/Youtube/Uncategorized/…f299.mp4` no longer existed — the file had
 * been re-organised into `/data/Youtube/Dave Gray/…/[dgDFPRol0cw].webm` by the
 * organise pass, which never updated the row. The library therefore advertised a
 * title that could not play (the TV showed "Couldn't play this video"), which is
 * exactly the state Journey 1 forbids.
 *
 * Matching is by the `[<youtube-id>]` token in the file name, which survives
 * re-organising and re-muxing; the row's own `videoId` is not usable because
 * imported archive rows carry a synthetic `imp…` id.
 */

export interface YoutubePathReconcileDeps {
  listRows(): Promise<Array<{ id: number; path: string | null }>>;
  fileExists(filePath: string): Promise<boolean>;
  listFiles(root: string): Promise<string[]>;
  updatePath(id: number, filePath: string): Promise<void>;
  markUnavailable(id: number, error: string): Promise<void>;
}

export interface YoutubePathReconcileResult {
  checked: number;
  repointed: Array<{ id: number; from: string; to: string }>;
  unavailable: Array<{ id: number; path: string }>;
}

const YOUTUBE_ID_IN_NAME = /\[([A-Za-z0-9_-]{11})\]/;

/** The `[id]` token of a path, or null when the name carries none. */
export function youtubeIdFromPath(filePath: string): string | null {
  const match = YOUTUBE_ID_IN_NAME.exec(path.basename(filePath));
  return match ? match[1]! : null;
}

/** Index every `[id]`-tagged media file under the root, preferring real media over sidecars. */
export function indexYoutubeFiles(files: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const file of files) {
    const id = youtubeIdFromPath(file);
    if (!id) continue;
    const bucket = index.get(id) ?? [];
    bucket.push(file);
    index.set(id, bucket);
  }
  // Prefer the playable containers, then the shortest path (the organised one).
  const rank = (file: string): number => {
    const extension = path.extname(file).toLowerCase();
    if (extension === '.mp4') return 0;
    if (extension === '.mkv') return 1;
    if (extension === '.webm') return 2;
    if (extension === '.m4a') return 3;
    return 9;
  };
  for (const [id, bucket] of index) {
    bucket.sort((a, b) => rank(a) - rank(b) || a.length - b.length);
    index.set(id, bucket);
  }
  return index;
}

export async function reconcileYoutubePaths(
  deps: YoutubePathReconcileDeps,
  options: { mediaRoot: string; limit?: number },
): Promise<YoutubePathReconcileResult> {
  const rows = await deps.listRows();
  const checked = Math.min(rows.length, options.limit ?? rows.length);

  const missing: Array<{ id: number; path: string }> = [];
  for (const row of rows.slice(0, checked)) {
    if (!row.path) continue;
    if (await deps.fileExists(row.path)) continue;
    missing.push({ id: row.id, path: row.path });
  }

  const result: YoutubePathReconcileResult = { checked, repointed: [], unavailable: [] };
  if (missing.length === 0) return result;

  const index = indexYoutubeFiles(await deps.listFiles(options.mediaRoot));
  for (const row of missing) {
    const id = youtubeIdFromPath(row.path);
    const candidates = id ? index.get(id) : undefined;
    const replacement = candidates?.find((candidate) => candidate !== row.path);
    if (replacement) {
      await deps.updatePath(row.id, replacement);
      result.repointed.push({ id: row.id, from: row.path, to: replacement });
    } else {
      await deps.markUnavailable(row.id, 'file missing on disk');
      result.unavailable.push({ id: row.id, path: row.path });
    }
  }
  return result;
}

/** Every media-ish file under the library root (missing root yields nothing). */
export async function listMediaFilesRecursive(root: string): Promise<string[]> {
  const results: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  };
  await walk(root);
  return results;
}
