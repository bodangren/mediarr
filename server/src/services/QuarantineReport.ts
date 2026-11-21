/**
 * Quarantine disk report.
 *
 * The operator contract says deleting media is owner-only: the engine quarantines with a
 * manifest and never purges on its own. What was missing is visibility — after the autumn
 * imports `/data/_quarantine` held 40 GB and nothing told anyone it was there.
 *
 * This pass walks the quarantine roots and reports what is held and what has aged past a
 * keep window, so the owner can decide. It never deletes.
 */

export interface QuarantineFileInfo {
  path: string;
  sizeBytes: number;
  /** Age in whole days at the time of the scan. */
  ageDays: number;
}

export interface QuarantineSummary {
  totalBytes: number;
  totalFiles: number;
  /** Files older than the keep window: the part an owner decision could reclaim. */
  reclaimableBytes: number;
  reclaimableFiles: number;
}

export interface QuarantineReportDeps {
  /** Lists files under one quarantine root (manifests excluded by the caller). */
  listFiles(root: string): Promise<Array<{ path: string; sizeBytes: number; mtimeMs: number }>>;
}

export const QUARANTINE_KEEP_DAYS = 7;

/** Pure: summarise file ages against the keep window. */
export function summariseQuarantine(
  files: ReadonlyArray<{ sizeBytes: number; mtimeMs: number }>,
  options: { now: number; keepDays?: number },
): QuarantineSummary {
  const keepDays = options.keepDays ?? QUARANTINE_KEEP_DAYS;
  const cutoff = options.now - keepDays * 24 * 60 * 60 * 1000;
  let totalBytes = 0;
  let reclaimableBytes = 0;
  let reclaimableFiles = 0;
  for (const file of files) {
    const size = Number.isFinite(file.sizeBytes) ? Math.max(0, file.sizeBytes) : 0;
    totalBytes += size;
    if (file.mtimeMs < cutoff) {
      reclaimableBytes += size;
      reclaimableFiles += 1;
    }
  }
  return {
    totalBytes,
    totalFiles: files.length,
    reclaimableBytes,
    reclaimableFiles,
  };
}

/** Scans the given roots and returns one summary over all of them. */
export async function reportQuarantine(
  deps: QuarantineReportDeps,
  roots: ReadonlyArray<string>,
  options: { now?: number; keepDays?: number } = {},
): Promise<QuarantineSummary> {
  const now = options.now ?? Date.now();
  const files: Array<{ sizeBytes: number; mtimeMs: number }> = [];
  for (const root of roots) {
    try {
      const listed = await deps.listFiles(root);
      for (const file of listed) files.push({ sizeBytes: file.sizeBytes, mtimeMs: file.mtimeMs });
    } catch {
      // A missing quarantine root simply holds nothing.
    }
  }
  const summaryOptions = options.keepDays === undefined
    ? { now }
    : { now, keepDays: options.keepDays };
  return summariseQuarantine(files, summaryOptions);
}

/** Human-readable line for the scheduler log. */
export function formatQuarantineSummary(summary: QuarantineSummary, keepDays = QUARANTINE_KEEP_DAYS): string {
  const gb = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);
  return `Quarantine: ${gb(summary.totalBytes)} GB in ${summary.totalFiles} file(s); `
    + `${gb(summary.reclaimableBytes)} GB (${summary.reclaimableFiles} file(s)) older than ${keepDays} days. `
    + 'Deletion is owner-gated.';
}
