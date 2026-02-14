import { describe, expect, it } from 'vitest';
import { clampPage, nextPageState, paginateRows, type PaginationState } from './pagination';

describe('pagination utilities', () => {
  it('computes pagination state transitions', () => {
    const current: PaginationState = { page: 2, pageSize: 25 };

    expect(nextPageState(current, { type: 'next', totalPages: 4 })).toEqual({ page: 3, pageSize: 25 });
    expect(nextPageState(current, { type: 'prev', totalPages: 4 })).toEqual({ page: 1, pageSize: 25 });
    expect(nextPageState(current, { type: 'setPage', page: 10, totalPages: 4 })).toEqual({ page: 4, pageSize: 25 });
    expect(nextPageState(current, { type: 'setPageSize', pageSize: 50 })).toEqual({ page: 1, pageSize: 50 });
  });

  it('paginates row slices by page and size', () => {
    const rows = Array.from({ length: 12 }).map((_, index) => ({ id: index + 1 }));
    const paged = paginateRows(rows, { page: 2, pageSize: 5 });
    expect(paged.map(row => row.id)).toEqual([6, 7, 8, 9, 10]);
  });

  it('clamps pages to a safe range', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(7, 3)).toBe(3);
  });
});
