export type FilterPredicate<Row> = (row: Row) => boolean;
export interface FilterGroup<Row> {
    operator: 'and' | 'or';
    predicates: FilterPredicate<Row>[];
}
export declare function containsFilter<Row>(field: keyof Row, query: string): FilterPredicate<Row>;
export declare function equalsFilter<Row>(field: keyof Row, value: unknown): FilterPredicate<Row>;
export declare function greaterThanFilter<Row>(field: keyof Row, value: number): FilterPredicate<Row>;
export declare function applyFilterGroup<Row>(rows: Row[], group: FilterGroup<Row>): Row[];
//# sourceMappingURL=filter.d.ts.map