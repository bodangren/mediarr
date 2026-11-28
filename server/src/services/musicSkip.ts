/**
 * Skip signal for the weekly music discovery run (owner request 2026-11-28: *"You should track which
 * music I skip as an anti-indicator of what I want."*).
 *
 * The skip rule is deliberately the complement of `applyMusicProgress`: a listen that reaches 90 % of
 * the duration increments `playCount`, so leaving a track before that threshold is exactly the
 * moment the owner rejected it. A track can therefore never be both "played" and "skipped" for the
 * same listen. Skips are further split at the halfway point because an early skip (before 50 %, or
 * before 30 s when the duration is not known yet) is the strong anti-indicator.
 */

export interface MusicSkipState {
  skipCount: number;
  earlySkipCount: number;
  lastSkippedAt: Date | null;
}

export interface MusicSkipUpdate {
  skipCount: number;
  earlySkipCount: number;
  lastSkippedAt: Date | null;
}

/** The same completion threshold `applyMusicProgress` uses to count a play. */
const COMPLETE_RATIO = 0.9;
/** Leaving before half the track is an early (strong) skip. */
const EARLY_FRACTION = 0.5;
/** Floor for an early skip when the client has not learned the duration yet. */
const EARLY_SECONDS_FLOOR = 30;

function clampPosition(position: number): number {
  return Number.isFinite(position) && position > 0 ? position : 0;
}

function knownDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

/** True when the listen stopped early enough to be a strong negative signal. */
export function isEarlySkip(heartbeat: { position: number; duration: number }): boolean {
  const position = clampPosition(heartbeat.position);
  const duration = knownDuration(heartbeat.duration);
  if (duration > 0) return position < duration * EARLY_FRACTION;
  return position < EARLY_SECONDS_FLOOR;
}

/**
 * Applies a client "left this track" report. A completed listen is not a skip; anything else
 * increments the counters and stamps the time. Pure, so the threshold table is testable.
 */
export function applyMusicSkip(
  current: MusicSkipState,
  heartbeat: { position: number; duration: number },
  now: Date = new Date(),
): MusicSkipUpdate {
  const duration = knownDuration(heartbeat.duration);
  const position = clampPosition(heartbeat.position);
  const completed = duration > 0 && position / duration >= COMPLETE_RATIO;
  if (completed) {
    return {
      skipCount: current.skipCount,
      earlySkipCount: current.earlySkipCount,
      lastSkippedAt: current.lastSkippedAt,
    };
  }
  const early = isEarlySkip({ position, duration });
  return {
    skipCount: current.skipCount + 1,
    earlySkipCount: current.earlySkipCount + (early ? 1 : 0),
    lastSkippedAt: now,
  };
}
