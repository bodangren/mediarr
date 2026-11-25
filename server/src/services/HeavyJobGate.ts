/**
 * One process-wide single-flight gate for heavy maintenance jobs.
 *
 * Measured 2026-11-26 06:23–06:33: `folder-import`, `episode-thumbnails`,
 * `embedded-track-sweep`, `youtube-download` and `subtitle-sidecar-register` overlapped, each
 * spawning ffmpeg/ffprobe or walking the whole USB library. The engine's event loop stalled up to
 * 31.1 s, `GET /api/health` took 7.48 s, node-cron missed executions, and the TV could not open a
 * stream — it retried three times and gave up. The jobs only checked playback *before* starting, so
 * nothing prevented them from piling up on each other.
 *
 * These are periodic sweeps: skipping one cycle costs nothing, while overlapping cycles cost
 * playback. The gate makes them single-flight.
 */
export class HeavyJobGate {
  private running: string | null = null;

  /** Claims the gate for `job`; false when another heavy job already holds it. */
  tryEnter(job: string): boolean {
    if (this.running !== null) return false;
    this.running = job;
    return true;
  }

  /** Releases the gate; a non-owner cannot clear somebody else's claim. */
  leave(job: string): void {
    if (this.running === job) this.running = null;
  }

  owner(): string | null {
    return this.running;
  }
}

/**
 * Runs `body` only when no other heavy job is in flight. Returns true when it ran, false when the
 * cycle was skipped (the caller's scheduler job then simply ends). The gate is always released,
 * including when the body throws, so one failed sweep cannot block the whole maintenance class.
 */
export async function runExclusiveHeavyJob(
  gate: HeavyJobGate,
  job: string,
  body: () => Promise<void>,
  log: (message: string) => void,
): Promise<boolean> {
  if (!gate.tryEnter(job)) {
    log(`${job}: deferred while ${gate.owner()} is running a heavy maintenance pass.`);
    return false;
  }
  try {
    await body();
    return true;
  } finally {
    gate.leave(job);
  }
}
