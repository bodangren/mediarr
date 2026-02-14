import type { ReactNode } from 'react';
import { Table } from './Table';
import { TableBody } from './TableBody';
import { TableHeader, type TableColumn } from './TableHeader';

export type DataTableColumn<RowType> = TableColumn<RowType>;

interface DataTablePagination {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
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
}

export function DataTable<RowType>({
  data,
  columns,
  getRowId,
  rowActions,
  pagination,
  sort,
  onSort,
}: DataTableProps<RowType>) {
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader<RowType> columns={columns} sort={sort} onSort={onSort} showActions={Boolean(rowActions)} />
        <TableBody<RowType> data={data} columns={columns} getRowId={getRowId} rowActions={rowActions} />
      </Table>

      {pagination ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary disabled:opacity-50"
            onClick={pagination.onPrev}
            disabled={pagination.page <= 1}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-xs text-text-secondary">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary disabled:opacity-50"
            onClick={pagination.onNext}
            disabled={pagination.page >= Math.max(1, pagination.totalPages)}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
