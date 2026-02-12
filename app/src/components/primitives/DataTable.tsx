import type { ReactNode } from 'react';

export interface DataTableColumn<RowType> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: RowType) => ReactNode;
  className?: string;
}

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
      <div data-testid="table-overflow" className="overflow-x-auto rounded-md border border-border-subtle">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-2 text-text-secondary">
            <tr>
              {columns.map(column => {
                const isActiveSort = sort?.key === column.key;
                return (
                  <th key={column.key} className="px-3 py-2 font-semibold">
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left"
                        onClick={() => onSort(column.key)}
                        aria-label={`Sort by ${column.header}`}
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {isActiveSort ? (sort?.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? <th className="px-3 py-2 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface-1">
            {data.map(row => (
              <tr key={getRowId(row)}>
                {columns.map(column => (
                  <td key={column.key} className={`px-3 py-2 text-text-primary ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
                {rowActions ? <td className="px-3 py-2 text-right">{rowActions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
