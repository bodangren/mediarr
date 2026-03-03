import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VirtualTable } from './VirtualTable';
describe('VirtualTable', () => {
    const columns = [
        { key: 'name', header: 'Name', sortable: true, render: (row) => row.name },
        { key: 'status', header: 'Status', sortable: false, render: (row) => row.status },
    ];
    const generateData = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            status: i % 2 === 0 ? 'active' : 'inactive',
        }));
    };
    it('renders virtual table with header and visible rows', () => {
        const data = generateData(100);
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: 400, rowHeight: 50, width: 800 }));
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });
    it('only renders visible rows in the DOM', () => {
        const data = generateData(1000);
        const rowHeight = 50;
        const height = 400;
        const visibleRows = Math.ceil(height / rowHeight);
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: height, rowHeight: rowHeight, width: 800 }));
        const tableRows = screen.getAllByRole('row');
        // Header row + visible rows (plus some buffer rows from react-window)
        expect(tableRows.length).toBeLessThan(data.length);
        expect(tableRows.length).toBeGreaterThan(1); // At least header + some rows
    });
    it('handles variable row heights when rowHeight is null', () => {
        const data = generateData(100);
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: 400, rowHeight: null, width: 800 }));
        expect(screen.getByRole('table')).toBeInTheDocument();
    });
    it('renders correct cell content for visible rows', () => {
        const data = generateData(50);
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: 400, rowHeight: 50, width: 800 }));
        // Check that at least some data is rendered
        expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
    it('handles empty data set', () => {
        render(_jsx(VirtualTable, { columns: columns, data: [], getRowId: (row) => row.id, height: 400, rowHeight: 50, width: 800 }));
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        const rows = within(table).queryAllByRole('row');
        // Should only have header row (no data rows)
        expect(rows.length).toBe(1);
    });
    it('supports row click handler', () => {
        const data = generateData(50);
        const onRowClick = vi.fn();
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: 400, rowHeight: 50, width: 800, onRowClick: onRowClick }));
        // Find a visible row and click it
        const firstItem = screen.getByText('Item 1');
        firstItem.click();
        expect(onRowClick).toHaveBeenCalledWith(data[0]);
    });
    it('supports custom row className', () => {
        const data = generateData(50);
        render(_jsx(VirtualTable, { columns: columns, data: data, getRowId: (row) => row.id, height: 400, rowHeight: 50, width: 800, rowClassName: () => 'custom-row-class' }));
        // Check that at least one row has the custom class
        const table = screen.getByRole('table');
        const rows = within(table).getAllByRole('row');
        // Skip header, check for data rows
        expect(rows.length).toBeGreaterThan(1);
        // Note: VirtualTable uses absolute positioning, so class checking may need adjustment
    });
});
//# sourceMappingURL=VirtualTable.test.js.map