import type { ReactNode } from 'react';
import { Table } from './Table';
import { TableBody } from './TableBody';
import { TableHeader, type TableColumn } from './TableHeader';
import { TablePager } from './TablePager';

export type DataTableColumn<RowType> = TableColumn<RowType>;

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

interface DataTableProps<RowType> {
  data: RowType[];
  columns: DataTableColumn<RowType>[];
  getRowId: (row: RowType) => string | number;
  rowActions?: (row: RowType) => ReactNode;
  pagination?: DataTablePagination;
  sort?: DataTableSort;
  onSort?: (key: string) => void;
  onRowClick?: (row: RowType) => void;
}

export function DataTable<RowType>({
  data,
  columns,
  getRowId,
  rowActions,
  pagination,
  sort,
  onSort,
  onRowClick,
}: DataTableProps<RowType>) {
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader<RowType> columns={columns} sort={sort} onSort={onSort} showActions={Boolean(rowActions)} />
        <TableBody<RowType> data={data} columns={columns} getRowId={getRowId} rowActions={rowActions} onRowClick={onRowClick} />
      </Table>

      {pagination ? (
        <TablePager
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageSizeOptions={pagination.pageSizeOptions}
          onPrev={pagination.onPrev}
          onNext={pagination.onNext}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
