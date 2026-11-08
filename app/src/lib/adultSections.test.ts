import { describe, expect, it } from 'vitest';
import { adultSectionTotals } from './adultSections';

describe('adultSectionTotals', () => {
  it('splits the whole filtered library, not the loaded page', () => {
    expect(adultSectionTotals({ totalCount: 197, needsReview: 8, pageSize: 50 })).toEqual({
      review: 8,
      library: 189,
      paginated: true,
      itemsOnPage: 50,
    });
  });

  it('is not paginated when everything fits and tolerates bad counts', () => {
    expect(adultSectionTotals({ totalCount: 3, needsReview: 0, pageSize: 50 })).toMatchObject({ paginated: false, review: 0, library: 3 });
    expect(adultSectionTotals({ totalCount: -5, needsReview: 10, pageSize: 50 })).toMatchObject({ review: 0, library: 0 });
  });
});
