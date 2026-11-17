import { describe, expect, it } from 'vitest';
import { pickPrimaryVariant } from './SubtitleInventoryApiService';

/**
 * Regression cover for the HTTP 500 the TV client hit on 2026-11-17: "Search
 * Subtitles" on a movie with two files threw
 * `variantId is required when multiple variants exist for this movie`, which the
 * detail screen showed as "Search failed". Manual subtitle actions now resolve to
 * the primary (largest) file instead of failing.
 */
describe('pickPrimaryVariant', () => {
  it('returns null when there is nothing to choose from', () => {
    expect(pickPrimaryVariant([])).toBeNull();
  });

  it('returns the single variant unchanged', () => {
    expect(pickPrimaryVariant([{ id: 7, fileSize: 100 }])?.id).toBe(7);
  });

  it('picks the largest file, which is the main feature', () => {
    const variants = [
      { id: 3, fileSize: 1_000 },
      { id: 4, fileSize: 9_000_000 },
      { id: 5, fileSize: 500 },
    ];
    expect(pickPrimaryVariant(variants)?.id).toBe(4);
  });

  it('breaks ties by id so the choice is deterministic', () => {
    const variants = [
      { id: 9, fileSize: 100 },
      { id: 2, fileSize: 100 },
    ];
    expect(pickPrimaryVariant(variants)?.id).toBe(2);
  });

  it('treats a missing file size as zero instead of NaN', () => {
    const variants = [
      { id: 1, fileSize: null },
      { id: 2, fileSize: 42 },
    ];
    expect(pickPrimaryVariant(variants as Array<{ id: number; fileSize: number | null }>)?.id).toBe(2);
  });
});
