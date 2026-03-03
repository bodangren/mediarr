import type { ReactNode } from 'react';
import type { TableColumn } from './TableHeader';
interface VirtualTableProps<RowType> {
    columns: TableColumn<RowType>[];
    data: RowType[];
    getRowId: (row: RowType) => string | number;
    height: number;
    rowHeight: number | null;
    width: number | string;
    onRowClick?: (row: RowType) => void;
    rowClassName?: (row: RowType) => string;
}
export declare const VirtualTable: <RowType>(props: VirtualTableProps<RowType>) => ReactNode;
export {};
//# sourceMappingURL=VirtualTable.d.ts.map