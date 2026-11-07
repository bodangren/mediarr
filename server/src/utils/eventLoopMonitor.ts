/**
 * Event-loop lag monitor.
 *
 * The API process is single-threaded and better-sqlite3 is synchronous, so a
 * slow disk or a long synchronous operation freezes *every* in-flight request
 * (and delays node-cron timers) until it returns. On 2026-11-07 the TV reported
 * "Failed to open" for streams that served HTTP 206 from the host while
 * node-cron logged "missed execution ... possible blocking IO".
 *
 * This measures the lag directly so a stall is attributable to the server
 * instead of being guessed at, and exposes it in `/api/health`.
 */
export interface EventLoopHealth {
  /** Lag of the most recent sample, in ms. */
  lastLagMs: number;
  /** Worst lag observed since the process started, in ms. */
  maxLagMs: number;
  /** Number of samples whose lag exceeded the warning threshold. */
  stallCount: number;
  /** Monotonic time of the worst observed stall (ISO), or null. */
  worstAt: string | null;
  /** Samples taken so far. */
  samples: number;
}

const state: EventLoopHealth = {
  lastLagMs: 0,
  maxLagMs: 0,
  stallCount: 0,
  worstAt: null,
  samples: 0,
};

let timer: ReturnType<typeof setInterval> | null = null;

export interface MonitorOptions {
  intervalMs?: number;
  warnThresholdMs?: number;
  onStall?: (lagMs: number) => void;
}

/**
 * Starts sampling. Idempotent, so a test or a second server instance in the
 * same process cannot stack timers.
 */
export function startEventLoopMonitor(options: MonitorOptions = {}): void {
  if (timer) return;
  const intervalMs = options.intervalMs ?? 500;
  const warnThresholdMs = options.warnThresholdMs ?? 250;

  let expected = Date.now() + intervalMs;
  timer = setInterval(() => {
    const now = Date.now();
    // A negative value means the timer fired early (clock adjustment); ignore.
    const lag = Math.max(0, now - expected);
    expected = now + intervalMs;

    state.lastLagMs = lag;
    state.samples += 1;
    if (lag > state.maxLagMs) {
      state.maxLagMs = lag;
      state.worstAt = new Date().toISOString();
    }
    if (lag >= warnThresholdMs) {
      state.stallCount += 1;
      if (options.onStall) {
        options.onStall(lag);
      } else {
        console.warn(
          `[event-loop] stalled ${lag} ms (max ${state.maxLagMs} ms) — ` +
            'requests and scheduled timers are delayed',
        );
      }
    }
  }, intervalMs);
  timer.unref?.();
}

export function stopEventLoopMonitor(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getEventLoopHealth(): EventLoopHealth {
  return { ...state };
}

/** Test helper: clears the recorded samples. */
export function resetEventLoopHealth(): void {
  state.lastLagMs = 0;
  state.maxLagMs = 0;
  state.stallCount = 0;
  state.worstAt = null;
  state.samples = 0;
}
