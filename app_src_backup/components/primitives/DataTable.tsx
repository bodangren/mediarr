import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import { Table } from './Table';
import { TableBody } from './TableBody';
import { TableHeader, type TableColumn } from './TableHeader';
import { TablePager } from './TablePager';

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

export const DataTable = memo(function DataTable<RowType>({
  data,
  columns,
  getRowId,
  rowActions,
  pagination,
  sort,
  onSort,
  onRowClick,
  mobileCardView = false,
  renderMobileCard,
}: DataTableProps<RowType>) {
  const memoizedRowActions = useMemo(() => rowActions, [rowActions]);
  const memoizedOnSort = useMemo(() => onSort, [onSort]);
  const memoizedOnRowClick = useMemo(() => onRowClick, [onRowClick]);
  const memoizedGetRowId = useMemo(() => getRowId, [getRowId]);

  return (
    <div className="space-y-3">
      {/* Mobile card view - shown only on small screens if enabled */}
      {mobileCardView && renderMobileCard && (
        <div className="space-y-3 lg:hidden">
          {data.map(row => (
            <div
              key={getRowId(row)}
              className="rounded-md border border-border-subtle bg-surface-1 p-4"
            >
              {renderMobileCard(row)}
            </div>
          ))}
        </div>
      )}

      {/* Table view - always rendered, columns hidden via CSS */}
      <div className={mobileCardView ? 'hidden lg:block' : ''}>
        <Table>
          <TableHeader<RowType>
            columns={columns}
            sort={sort}
            onSort={memoizedOnSort}
            showActions={Boolean(memoizedRowActions)}
          />
          <TableBody<RowType>
            data={data}
            columns={columns}
            getRowId={memoizedGetRowId}
            rowActions={memoizedRowActions}
            onRowClick={memoizedOnRowClick}
          />
        </Table>
      </div>

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
}) as <RowType>(props: DataTableProps<RowType>) => ReactNode;
