import { describe, expect, it } from 'vitest';
import { watchChip } from './watchState';

describe('watchChip', () => {
  it('shows a watched chip for a watched episode', () => {
    expect(watchChip({ isWatched: true, progress: 1 })?.label).toBe('✓ Watched');
  });

  it('shows a progress chip for a part-watched episode and caps the percentage', () => {
    expect(watchChip({ isWatched: false, progress: 0.42 })?.label).toBe('▶ 42%');
    expect(watchChip({ progress: 1.4 })?.label).toBe('▶ 100%');
  });

  it('returns null without playback state or with negligible progress', () => {
    expect(watchChip(null)).toBeNull();
    expect(watchChip({ progress: 0.01 })).toBeNull();
  });
});
