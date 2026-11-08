import { describe, expect, it } from 'vitest';
import { wantedForGaps } from './SubtitleCoverageWanted';

describe('wantedForGaps', () => {
  it('queues only the missing language per variant', () => {
    expect(wantedForGaps([
      { variantId: 1, english: 1, chinese: 1 },
      { variantId: 2, english: 1, chinese: 0 },
      { variantId: 3, english: 0, chinese: 1 },
      { variantId: 4, english: 0, chinese: 0 },
    ])).toEqual([
      { variantId: 2, languageCode: 'zho' },
      { variantId: 3, languageCode: 'en' },
      { variantId: 4, languageCode: 'en' },
      { variantId: 4, languageCode: 'zho' },
    ]);
  });

  it('returns nothing for fully covered variants', () => {
    expect(wantedForGaps([{ variantId: 9, english: 2, chinese: 3 }])).toEqual([]);
  });
});
