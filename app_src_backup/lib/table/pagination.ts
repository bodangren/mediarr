export interface PaginationState {
  page: number;
  pageSize: number;
}

type PaginationAction =
  | { type: 'next'; totalPages: number }
  | { type: 'prev'; totalPages: number }
  | { type: 'setPage'; page: number; totalPages: number }
  | { type: 'setPageSize'; pageSize: number };

export function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(Math.max(1, totalPages), page));
}

export function nextPageState(current: PaginationState, action: PaginationAction): PaginationState {
  if (action.type === 'setPageSize') {
    return {
      page: 1,
      pageSize: action.pageSize,
    };
  }

  if (action.type === 'next') {
    return {
      ...current,
      page: clampPage(current.page + 1, action.totalPages),
    };
  }

  if (action.type === 'prev') {
    return {
      ...current,
      page: clampPage(current.page - 1, action.totalPages),
    };
  }

  return {
    ...current,
    page: clampPage(action.page, action.totalPages),
  };
}

export function paginateRows<Row>(rows: Row[], state: PaginationState): Row[] {
  const start = (Math.max(1, state.page) - 1) * Math.max(1, state.pageSize);
  const end = start + Math.max(1, state.pageSize);
  return rows.slice(start, end);
}
