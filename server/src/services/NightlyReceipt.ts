/**
 * Nightly aggregate receipt (05:00).
 *
 * The B7 timer list wanted one nightly artefact that answers "what happened yesterday"
 * without reading five logs. Correlating by task name + window is exactly what the engine's
 * task-execution history is for: the plugin ledger records its own runs with
 * `executionId: -1` until E1, so the engine-side execution rows are the reliable join key
 * today.
 *
 * The receipt is additive: one JSON line per night in /config/nightly-receipts.jsonl, and
 * it never prunes or repairs anything.
 */

export interface NightlyReceiptInput {
  windowHours: number;
  taskExecutions: ReadonlyArray<{ taskName: string; status: string; errorMessage?: string | null }>;
  youtube: { available: number; pending: number; failed: number };
  library: { movies: number; series: number; episodes: number };
  quarantine: { heldBytes: number; reclaimableBytes: number };
}

export interface NightlyReceipt {
  at: string;
  windowHours: number;
  tasks: {
    total: number;
    failed: number;
    failures: Array<{ taskName: string; count: number; lastError: string | null }>;
  };
  youtube: NightlyReceiptInput['youtube'];
  library: NightlyReceiptInput['library'];
  quarantine: NightlyReceiptInput['quarantine'];
}

/** Pure aggregation: counts + failures grouped by task name (the join key). */
export function buildEngineNightlyReceipt(
  input: NightlyReceiptInput,
  now: Date = new Date(),
): NightlyReceipt {
  const failures = new Map<string, { count: number; lastError: string | null }>();
  for (const execution of input.taskExecutions) {
    if (execution.status !== 'FAILED') continue;
    const entry = failures.get(execution.taskName) ?? { count: 0, lastError: null };
    entry.count += 1;
    if (execution.errorMessage) entry.lastError = execution.errorMessage;
    failures.set(execution.taskName, entry);
  }
  return {
    at: now.toISOString(),
    windowHours: input.windowHours,
    tasks: {
      total: input.taskExecutions.length,
      failed: [...failures.values()].reduce((sum, entry) => sum + entry.count, 0),
      failures: [...failures.entries()]
        .map(([taskName, entry]) => ({ taskName, count: entry.count, lastError: entry.lastError }))
        .sort((a, b) => b.count - a.count || a.taskName.localeCompare(b.taskName)),
    },
    youtube: input.youtube,
    library: input.library,
    quarantine: input.quarantine,
  };
}

/** One-line summary for the scheduler log. */
export function formatEngineNightlyReceipt(receipt: NightlyReceipt): string {
  const failed = receipt.tasks.failed === 0
    ? 'no failed tasks'
    : `${receipt.tasks.failed} failed run(s) across ${receipt.tasks.failures.length} task(s)`;
  return `Nightly receipt: ${receipt.tasks.total} task run(s), ${failed}; `
    + `youtube ${receipt.youtube.available} available / ${receipt.youtube.pending} pending; `
    + `library ${receipt.library.movies} movies, ${receipt.library.series} series, ${receipt.library.episodes} episodes.`;
}
