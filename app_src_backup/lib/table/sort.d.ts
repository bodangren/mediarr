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
export declare function nextSortState<Key extends string>(current: SortState<Key>, nextKey: Key): SortState<Key>;
export declare function createStringSorter<Row>(getter: (row: Row) => string): RowGetter<Row>;
export declare function createSortComparator<Row, Key extends string>(sort: SortState<Key>, sorters: Record<Key, RowGetter<Row>>, fallbacks?: Array<FallbackComparator<Row, Key>>): (left: Row, right: Row) => number;
export {};
//# sourceMappingURL=sort.d.ts.map