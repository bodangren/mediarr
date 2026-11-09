/** Playback state carried on episode rows by the series detail API. */
export interface EpisodePlaybackState {
  isWatched?: boolean | null;
  progress?: number | null;
}

export interface EpisodeWatchChip {
  label: string;
  /** Tailwind classes for the chip. */
  className: string;
}

/**
 * Watched/continue chip for an episode row, matching the TV client's vocabulary (✓ watched, ▶ n%).
 * Returns null when the episode has no playback state so the row stays uncluttered.
 */
export function episodeWatchChip(state: EpisodePlaybackState | null | undefined): EpisodeWatchChip | null {
  if (!state) return null;
  if (state.isWatched) {
    return {
      label: '✓ Watched',
      className: 'bg-status-completed/20 text-status-completed',
    };
  }
  const progress = state.progress ?? 0;
  if (progress > 0.02) {
    return {
      label: `▶ ${Math.round(Math.min(progress, 1) * 100)}%`,
      className: 'bg-accent-primary/20 text-accent-primary',
    };
  }
  return null;
}
