export interface PaginationState {
    page: number;
    pageSize: number;
}
type PaginationAction = {
    type: 'next';
    totalPages: number;
} | {
    type: 'prev';
    totalPages: number;
} | {
    type: 'setPage';
    page: number;
    totalPages: number;
} | {
    type: 'setPageSize';
    pageSize: number;
};
export declare function clampPage(page: number, totalPages: number): number;
export declare function nextPageState(current: PaginationState, action: PaginationAction): PaginationState;
export declare function paginateRows<Row>(rows: Row[], state: PaginationState): Row[];
export {};
//# sourceMappingURL=pagination.d.ts.map