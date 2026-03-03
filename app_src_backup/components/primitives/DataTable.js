import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
import { Table } from './Table';
import { TableBody } from './TableBody';
import { TableHeader } from './TableHeader';
import { TablePager } from './TablePager';
export const DataTable = memo(function DataTable({ data, columns, getRowId, rowActions, pagination, sort, onSort, onRowClick, mobileCardView = false, renderMobileCard, }) {
    const memoizedRowActions = useMemo(() => rowActions, [rowActions]);
    const memoizedOnSort = useMemo(() => onSort, [onSort]);
    const memoizedOnRowClick = useMemo(() => onRowClick, [onRowClick]);
    const memoizedGetRowId = useMemo(() => getRowId, [getRowId]);
    return (_jsxs("div", { className: "space-y-3", children: [mobileCardView && renderMobileCard && (_jsx("div", { className: "space-y-3 lg:hidden", children: data.map(row => (_jsx("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-4", children: renderMobileCard(row) }, getRowId(row)))) })), _jsx("div", { className: mobileCardView ? 'hidden lg:block' : '', children: _jsxs(Table, { children: [_jsx(TableHeader, { columns: columns, sort: sort, onSort: memoizedOnSort, showActions: Boolean(memoizedRowActions) }), _jsx(TableBody, { data: data, columns: columns, getRowId: memoizedGetRowId, rowActions: memoizedRowActions, onRowClick: memoizedOnRowClick })] }) }), pagination ? (_jsx(TablePager, { page: pagination.page, totalPages: pagination.totalPages, pageSize: pagination.pageSize, pageSizeOptions: pagination.pageSizeOptions, onPrev: pagination.onPrev, onNext: pagination.onNext, onPageSizeChange: pagination.onPageSizeChange })) : null] }));
});
//# sourceMappingURL=DataTable.js.map