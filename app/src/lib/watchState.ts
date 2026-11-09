/** Playback state carried on movie/episode rows by the detail APIs. */
export interface PlaybackState {
  isWatched?: boolean | null;
  progress?: number | null;
}

export interface WatchChip {
  label: string;
  /** Tailwind classes for the chip. */
  className: string;
}

/**
 * Watched/continue chip for a movie or episode row, matching the TV client's vocabulary
 * (✓ watched, ▶ n%). Returns null when the item has no playback state so rows stay uncluttered.
 */
export function watchChip(state: PlaybackState | null | undefined): WatchChip | null {
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
