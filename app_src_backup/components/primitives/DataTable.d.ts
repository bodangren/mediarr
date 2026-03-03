import type { ReactNode } from 'react';
import { type TableColumn } from './TableHeader';
export type DataTableColumn<RowType> = TableColumn<RowType> & {
    /** Whether to hide this column on small screens (mobile) */
    hideOnMobile?: boolean;
    /** Whether to hide this column on medium screens (tablets) */
    hideOnTablet?: boolean;
};
interface DataTablePagination {
    page: number;
    totalPages: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPrev: () => void;
    onNext: () => void;
    onPageSizeChange?: (pageSize: number) => void;
}
interface DataTableSort {
    key: string;
    direction: 'asc' | 'desc';
}
export interface DataTableProps<RowType> {
    data: RowType[];
    columns: DataTableColumn<RowType>[];
    getRowId: (row: RowType) => string | number;
    rowActions?: (row: RowType) => ReactNode;
    pagination?: DataTablePagination;
    sort?: DataTableSort;
    onSort?: (key: string) => void;
    onRowClick?: (row: RowType) => void;
    /** Whether to enable card view on mobile instead of table view */
    mobileCardView?: boolean;
    /** Custom renderer for mobile card view */
    renderMobileCard?: (row: RowType) => ReactNode;
}
export declare const DataTable: <RowType>(props: DataTableProps<RowType>) => ReactNode;
export {};
//# sourceMappingURL=DataTable.d.ts.map