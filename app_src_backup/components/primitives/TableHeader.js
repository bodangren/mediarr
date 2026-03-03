import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
import { StatusBadge } from './StatusBadge';
export const TableHeader = memo(function TableHeader({ columns, sort, onSort, showActions = false }) {
    const memoizedOnSort = useMemo(() => onSort, [onSort]);
    return (_jsx("thead", { className: "bg-surface-2 text-text-secondary", children: _jsxs("tr", { children: [columns.map(column => {
                    const isActiveSort = sort?.key === column.key;
                    // Add responsive classes for column visibility
                    const responsiveClasses = [
                        column.hideOnMobile ? 'hidden md:table-cell' : '',
                        column.hideOnTablet ? 'hidden lg:table-cell' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    return (_jsx("th", { className: `px-3 py-2 font-semibold ${responsiveClasses} ${column.className || ''}`, children: column.sortable && memoizedOnSort ? (_jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-left", onClick: () => memoizedOnSort(column.key), "aria-label": `Sort by ${column.header}`, children: [column.header, _jsx("span", { "aria-hidden": "true", children: isActiveSort ? (sort?.direction === 'asc' ? '↑' : '↓') : '↕' })] })) : (column.header) }, column.key));
                }), showActions ? (_jsx("th", { className: "hidden px-3 py-2 text-right font-semibold sm:table-cell", children: "Actions" })) : null] }) }));
});
export function renderTextCell(value) {
    return value == null ? '-' : String(value);
}
export function renderDateCell(value) {
    if (!value) {
        return '-';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString();
}
export const renderStatusCell = memo(function renderStatusCell(status) {
    return _jsx(StatusBadge, { status: status });
});
//# sourceMappingURL=TableHeader.js.map