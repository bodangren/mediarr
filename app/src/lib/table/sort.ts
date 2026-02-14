export type SortDirection = 'asc' | 'desc';

export interface SortState<Key extends string> {
  key: Key;
  direction: SortDirection;
}

type PrimitiveSortValue = string | number | Date;
type RowGetter<Row> = (row: Row) => PrimitiveSortValue;

interface FallbackComparator<Row, Key extends string> {
  key: Key;
  direction: SortDirection;
  getter: RowGetter<Row>;
}

export function nextSortState<Key extends string>(current: SortState<Key>, nextKey: Key): SortState<Key> {
  if (current.key === nextKey) {
    return {
      key: current.key,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  return {
    key: nextKey,
    direction: 'asc',
  };
}

function comparePrimitive(left: PrimitiveSortValue, right: PrimitiveSortValue): number {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = left instanceof Date ? left.getTime() : new Date(left).getTime();
    const rightTime = right instanceof Date ? right.getTime() : new Date(right).getTime();
    return leftTime - rightTime;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function createStringSorter<Row>(getter: (row: Row) => string): RowGetter<Row> {
  return getter;
}

export function createSortComparator<Row, Key extends string>(
  sort: SortState<Key>,
  sorters: Record<Key, RowGetter<Row>>,
  fallbacks: Array<FallbackComparator<Row, Key>> = [],
): (left: Row, right: Row) => number {
  const primarySorter = sorters[sort.key];

  return (left, right) => {
    const base = comparePrimitive(primarySorter(left), primarySorter(right));
    if (base !== 0) {
      return sort.direction === 'asc' ? base : -base;
    }

    for (const fallback of fallbacks) {
      const result = comparePrimitive(fallback.getter(left), fallback.getter(right));
      if (result !== 0) {
        return fallback.direction === 'asc' ? result : -result;
      }
    }

    return 0;
  };
}
