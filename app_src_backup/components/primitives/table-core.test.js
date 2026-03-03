import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table } from './Table';
import { TableBody, TableCell, TableRow } from './TableBody';
import { renderDateCell, renderStatusCell, renderTextCell, TableHeader } from './TableHeader';
describe('table core primitives', () => {
    it('renders base table wrapper with sortable headers and rows', () => {
        const onSort = vi.fn();
        const columns = [
            { key: 'name', header: 'Name', sortable: true, render: row => renderTextCell(row.name) },
            { key: 'createdAt', header: 'Created', sortable: false, render: row => renderDateCell(row.createdAt) },
            { key: 'status', header: 'Status', sortable: false, render: row => renderStatusCell(row.status) },
        ];
        render(_jsxs(Table, { children: [_jsx(TableHeader, { columns: columns, onSort: onSort, sort: { key: 'name', direction: 'asc' } }), _jsx(TableBody, { data: [{ id: 1, name: 'Indexer A', createdAt: '2026-02-14T10:00:00Z', status: 'completed' }], columns: columns, getRowId: row => row.id })] }));
        expect(screen.getByTestId('table-overflow')).toHaveClass('overflow-x-auto');
        expect(screen.getByRole('button', { name: /sort by name/i })).toBeInTheDocument();
        expect(screen.getByText('Indexer A')).toBeInTheDocument();
    });
    it('renders date and status cell helpers', () => {
        render(_jsx("table", { children: _jsx("tbody", { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: renderDateCell('2026-02-14T10:00:00Z') }), _jsx(TableCell, { children: renderStatusCell('warning') })] }) }) }));
        expect(screen.getByText(/2026/i)).toBeInTheDocument();
        expect(screen.getByText('warning')).toBeInTheDocument();
    });
});
//# sourceMappingURL=table-core.test.js.map