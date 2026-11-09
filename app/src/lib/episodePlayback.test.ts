import { describe, expect, it } from 'vitest';
import { episodeWatchChip } from './episodePlayback';

describe('episodeWatchChip', () => {
  it('shows a watched chip for a watched episode', () => {
    expect(episodeWatchChip({ isWatched: true, progress: 1 })?.label).toBe('✓ Watched');
  });

  it('shows a progress chip for a part-watched episode and caps the percentage', () => {
    expect(episodeWatchChip({ isWatched: false, progress: 0.42 })?.label).toBe('▶ 42%');
    expect(episodeWatchChip({ progress: 1.4 })?.label).toBe('▶ 100%');
  });

  it('returns null without playback state or with negligible progress', () => {
    expect(episodeWatchChip(null)).toBeNull();
    expect(episodeWatchChip({ progress: 0.01 })).toBeNull();
  });
});
