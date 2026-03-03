import type { ReactNode } from 'react';
export interface TableColumn<RowType> {
    key: string;
    header: string;
    sortable?: boolean;
    render: (row: RowType) => ReactNode;
    className?: string;
    /** Whether to hide this column on small screens (mobile) */
    hideOnMobile?: boolean;
    /** Whether to hide this column on medium screens (tablets) */
    hideOnTablet?: boolean;
}
interface TableSort {
    key: string;
    direction: 'asc' | 'desc';
}
interface TableHeaderProps<RowType> {
    columns: TableColumn<RowType>[];
    sort?: TableSort;
    onSort?: (key: string) => void;
    showActions?: boolean;
}
export declare const TableHeader: <RowType>(props: TableHeaderProps<RowType>) => ReactNode;
export declare function renderTextCell(value: string | number | null | undefined): string;
export declare function renderDateCell(value: string | Date | null | undefined): string;
export declare const renderStatusCell: import("react").MemoExoticComponent<(status: string) => ReactNode>;
export {};
//# sourceMappingURL=TableHeader.d.ts.map