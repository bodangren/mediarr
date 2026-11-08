import path from 'node:path';

/**
 * Quarantine engine (track feature_adult_library_20261107, Phase 4; architecture gate G6).
 *
 * Deletion in this system is a two-step move: files are first moved out of the media tree into a
 * quarantine root on the SAME filesystem, recorded in a manifest, and only later deleted. The engine
 * is deliberately small and explicit so a mistake is visible before it is destructive:
 *
 * - **plan** is pure: it maps paths into the quarantine root and refuses duplicates/conflicts.
 * - **execute** performs moves, using copy+verify+unlink when `rename` crosses a device (EXDEV).
 * - **restore** moves a quarantined file back to its original path.
 * - **delete** only accepts paths that are inside the quarantine root; it can never delete a media
 *   file. `dryRun` is the default at the API layer.
 */

export interface QuarantinePlanEntry {
  originalPath: string;
  quarantinePath: string;
}

export interface QuarantinePlan {
  entries: QuarantinePlanEntry[];
  /** Files that cannot be planned safely (already inside quarantine, duplicate targets, ...). */
  skipped: Array<{ path: string; reason: string }>;
}

export interface QuarantineFs {
  mkdir(dir: string, options?: { recursive?: boolean }): Promise<unknown>;
  rename(from: string, to: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  unlink(file: string): Promise<void>;
  stat(file: string): Promise<{ size: number }>;
}

function normalise(input: string): string {
  return path.posix.normalize(input);
}

function isInside(root: string, candidate: string): boolean {
  const rel = path.posix.relative(normalise(root), normalise(candidate));
  return rel.length > 0 && !rel.startsWith('..') && !path.posix.isAbsolute(rel);
}

/** Pure planning: no filesystem access, so the caller can show a dry run before anything moves. */
export function planQuarantine(
  paths: readonly string[],
  options: { mediaRoot: string; quarantineRoot: string },
): QuarantinePlan {
  const entries: QuarantinePlanEntry[] = [];
  const skipped: QuarantinePlan['skipped'] = [];
  const targets = new Set<string>();

  for (const originalPath of paths) {
    const normalisedPath = normalise(originalPath);
    if (isInside(options.quarantineRoot, normalisedPath)) {
      skipped.push({ path: originalPath, reason: 'already quarantined' });
      continue;
    }
    if (!isInside(options.mediaRoot, normalisedPath)) {
      skipped.push({ path: originalPath, reason: 'outside the media root' });
      continue;
    }
    const relative = path.posix.relative(normalise(options.mediaRoot), normalisedPath);
    const target = path.posix.join(normalise(options.quarantineRoot), relative);
    if (targets.has(target)) {
      skipped.push({ path: originalPath, reason: 'duplicate target' });
      continue;
    }
    targets.add(target);
    entries.push({ originalPath: normalisedPath, quarantinePath: target });
  }

  return { entries, skipped };
}

export interface QuarantineResult {
  moved: string[];
  failed: Array<{ path: string; error: string }>;
  dryRun: boolean;
  /** One manifest line per moved file, suitable for an append-only JSONL manifest. */
  manifestLines: string[];
}

async function moveFile(io: QuarantineFs, from: string, to: string): Promise<void> {
  try {
    await io.rename(from, to);
    return;
  } catch (error) {
    // A quarantine root on another device cannot be renamed onto; copy, verify the size, then unlink.
    if ((error as NodeJS.ErrnoException)?.code !== 'EXDEV') throw error;
  }
  await io.copyFile(from, to);
  const [source, target] = await Promise.all([io.stat(from), io.stat(to)]);
  if (source.size !== target.size) {
    throw new Error(`copy verification failed for ${from} (${source.size} -> ${target.size} bytes)`);
  }
  await io.unlink(from);
}

export async function executeQuarantine(
  plan: QuarantinePlan,
  options: { io: QuarantineFs; dryRun?: boolean; now?: Date },
): Promise<QuarantineResult> {
  const dryRun = options.dryRun !== false;
  const moved: string[] = [];
  const failed: QuarantineResult['failed'] = [];
  const manifestLines: string[] = [];
  const movedAt = (options.now ?? new Date()).toISOString();

  for (const entry of plan.entries) {
    if (dryRun) {
      moved.push(entry.originalPath);
      continue;
    }
    try {
      await options.io.mkdir(path.posix.dirname(entry.quarantinePath), { recursive: true });
      await moveFile(options.io, entry.originalPath, entry.quarantinePath);
      moved.push(entry.originalPath);
      manifestLines.push(JSON.stringify({
        action: 'quarantine',
        movedAt,
        originalPath: entry.originalPath,
        quarantinePath: entry.quarantinePath,
      }));
    } catch (error) {
      failed.push({ path: entry.originalPath, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { moved, failed, dryRun, manifestLines };
}

export interface RestoreEntry {
  originalPath: string;
  quarantinePath: string;
}

export async function restoreQuarantine(
  entries: readonly RestoreEntry[],
  options: { io: QuarantineFs; quarantineRoot: string; dryRun?: boolean },
): Promise<QuarantineResult> {
  const dryRun = options.dryRun === true;
  const moved: string[] = [];
  const failed: QuarantineResult['failed'] = [];
  const manifestLines: string[] = [];

  for (const entry of entries) {
    if (!isInside(options.quarantineRoot, entry.quarantinePath)) {
      failed.push({ path: entry.quarantinePath, error: 'refusing to restore a file outside quarantine' });
      continue;
    }
    if (dryRun) {
      moved.push(entry.quarantinePath);
      continue;
    }
    try {
      await options.io.mkdir(path.posix.dirname(entry.originalPath), { recursive: true });
      await moveFile(options.io, entry.quarantinePath, entry.originalPath);
      moved.push(entry.quarantinePath);
      manifestLines.push(JSON.stringify({
        action: 'restore',
        restoredAt: new Date().toISOString(),
        originalPath: entry.originalPath,
        quarantinePath: entry.quarantinePath,
      }));
    } catch (error) {
      failed.push({ path: entry.quarantinePath, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { moved, failed, dryRun, manifestLines };
}

/**
 * Deletes files that are already inside the quarantine root. This is the only destructive function,
 * and its path guard means it cannot be pointed at the media library by accident.
 */
export async function deleteQuarantined(
  quarantinePaths: readonly string[],
  options: { io: QuarantineFs; quarantineRoot: string; dryRun?: boolean },
): Promise<QuarantineResult> {
  const dryRun = options.dryRun !== false;
  const moved: string[] = [];
  const failed: QuarantineResult['failed'] = [];
  const manifestLines: string[] = [];

  for (const quarantinePath of quarantinePaths) {
    if (!isInside(options.quarantineRoot, quarantinePath)) {
      failed.push({ path: quarantinePath, error: 'refusing to delete outside the quarantine root' });
      continue;
    }
    if (dryRun) {
      moved.push(quarantinePath);
      continue;
    }
    try {
      await options.io.unlink(quarantinePath);
      moved.push(quarantinePath);
      manifestLines.push(JSON.stringify({ action: 'delete', deletedAt: new Date().toISOString(), quarantinePath }));
    } catch (error) {
      failed.push({ path: quarantinePath, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { moved, failed, dryRun, manifestLines };
}
