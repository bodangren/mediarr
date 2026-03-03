import type { ReactNode } from 'react';
import type { TableColumn } from './TableHeader';
interface TableBodyProps<RowType> {
    data: RowType[];
    columns: TableColumn<RowType>[];
    getRowId: (row: RowType) => string | number;
    rowActions?: (row: RowType) => ReactNode;
    onRowClick?: (row: RowType) => void;
}
interface TableCellProps {
    className?: string;
    children: ReactNode;
}
interface TableRowProps {
    children: ReactNode;
    onClick?: () => void;
}
export declare function TableBody<RowType>({ data, columns, getRowId, rowActions, onRowClick }: TableBodyProps<RowType>): import("react/jsx-runtime").JSX.Element;
export declare const TableRow: import("react").NamedExoticComponent<TableRowProps>;
export declare const TableCell: import("react").NamedExoticComponent<TableCellProps>;
export {};
//# sourceMappingURL=TableBody.d.ts.map