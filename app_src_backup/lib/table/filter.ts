export type FilterPredicate<Row> = (row: Row) => boolean;

export interface FilterGroup<Row> {
  operator: 'and' | 'or';
  predicates: FilterPredicate<Row>[];
}

export function containsFilter<Row>(field: keyof Row, query: string): FilterPredicate<Row> {
  const normalized = query.trim().toLowerCase();
  return (row: Row) => String(row[field] ?? '').toLowerCase().includes(normalized);
}

export function equalsFilter<Row>(field: keyof Row, value: unknown): FilterPredicate<Row> {
  return (row: Row) => row[field] === value;
}

export function greaterThanFilter<Row>(field: keyof Row, value: number): FilterPredicate<Row> {
  return (row: Row) => {
    const candidate = Number(row[field]);
    return Number.isFinite(candidate) && candidate > value;
  };
}

export function applyFilterGroup<Row>(rows: Row[], group: FilterGroup<Row>): Row[] {
  if (group.predicates.length === 0) {
    return rows;
  }

  if (group.operator === 'and') {
    return rows.filter(row => group.predicates.every(predicate => predicate(row)));
  }

  return rows.filter(row => group.predicates.some(predicate => predicate(row)));
}
