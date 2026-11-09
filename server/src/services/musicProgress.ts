export interface MusicTrackProgress {
  position: number;
  isPlayed: boolean;
  playCount: number;
  lastPlayedAt: Date | null;
}

export interface MusicProgressUpdate {
  position: number;
  isPlayed: boolean;
  playCount: number;
  lastPlayedAt: Date;
}

const COMPLETE_RATIO = 0.9;

/**
 * Applies a client music heartbeat. `playCount` increments once per completed play (crossing the 90 %
 * threshold), not on every 15-second heartbeat, so "recently listened" stays meaningful for the weekly
 * recommendation pass.
 */
export function applyMusicProgress(
  current: MusicTrackProgress,
  heartbeat: { position: number; duration: number },
  now: Date = new Date(),
): MusicProgressUpdate {
  const duration = Number.isFinite(heartbeat.duration) && heartbeat.duration > 0 ? heartbeat.duration : 0;
  const position = Math.max(0, Math.min(Number.isFinite(heartbeat.position) ? heartbeat.position : 0, duration || Number.MAX_SAFE_INTEGER));
  const completed = duration > 0 && position / duration >= COMPLETE_RATIO;
  return {
    position,
    isPlayed: completed || current.isPlayed,
    playCount: completed && !current.isPlayed ? current.playCount + 1 : current.playCount,
    lastPlayedAt: now,
  };
}
