/** Section totals for the Adult library page (tech-debt 2026-11-08: counts were page-scoped). */
export interface AdultSectionTotals {
  review: number;
  library: number;
  /** True when the page shows only part of the filtered library. */
  paginated: boolean;
  itemsOnPage: number;
}

export function adultSectionTotals(input: {
  totalCount: number;
  needsReview: number;
  pageSize: number;
}): AdultSectionTotals {
  const total = Math.max(0, input.totalCount);
  const review = Math.max(0, Math.min(input.needsReview, total));
  return {
    review,
    library: Math.max(0, total - review),
    paginated: total > input.pageSize,
    itemsOnPage: Math.min(total, input.pageSize),
  };
}
