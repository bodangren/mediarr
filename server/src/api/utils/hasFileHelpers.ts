import path from 'node:path';
import fs from 'node:fs/promises';

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.ts', '.m4v', '.mov', '.wmv']);

export interface HasFileSource {
  fileVariants?: { length?: number } | null;
  path?: string | null;
}

/**
 * True when the movie/episode has any playable file on disk.
 *
 * Sources are checked in order, so the response always reflects the strongest
 * available evidence:
 *   1. Any MediaFileVariant row exists (the inventory the playback service
 *      actually streams from). This is the canonical signal — it survives a
 *      path that was renamed out from under the parent row.
 *   2. A non-empty `path` whose filesystem entry still exists. Catches the
 *      pre-variant legacy state where the parent row was the only place that
 *      remembered where the file lived.
 */
export async function deriveHasFile(source: HasFileSource): Promise<boolean> {
  const variantCount = source.fileVariants?.length ?? 0;
  if (variantCount > 0) {
    return true;
  }

  const candidatePath = source.path;
  if (typeof candidatePath !== 'string' || candidatePath.trim().length === 0) {
    return false;
  }

  return pathLooksPlayable(candidatePath);
}

/**
 * Async probe for a playable file at `candidatePath`.
 *
 * - File → returns true.
 * - Directory → returns true if it contains at least one file with a video
 *   extension. Folder paths are valid because organize/import often store the
 *   series/movie folder here while the actual file lives one level down.
 * - Anything else (symlink loop, permission denied) → false.
 */
export async function pathLooksPlayable(candidatePath: string): Promise<boolean> {
  let stat: import('node:fs').Stats;
  try {
    stat = await fs.stat(candidatePath);
  } catch {
    return false;
  }

  if (stat.isFile()) {
    return true;
  }
  if (!stat.isDirectory()) {
    return false;
  }

  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(candidatePath, { withFileTypes: true });
  } catch {
    return false;
  }

  return entries.some((entry) => {
    if (!entry.isFile()) return false;
    return VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
  });
}