import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterBuilder } from './FilterBuilder';
describe('FilterBuilder', () => {
    it('adds conditions and applies custom filters', () => {
        const onApply = vi.fn();
        render(_jsx(FilterBuilder, { isOpen: true, onClose: vi.fn(), onApply: onApply, onSave: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined) }));
        fireEvent.change(screen.getByLabelText('Field 1'), { target: { value: 'network' } });
        fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: 'HBO' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Condition' }));
        fireEvent.change(screen.getByLabelText('Field 2'), { target: { value: 'status' } });
        fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: 'continuing' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        expect(onApply).toHaveBeenCalledWith({
            operator: 'and',
            conditions: [
                { field: 'network', operator: 'contains', value: 'HBO' },
                { field: 'status', operator: 'contains', value: 'continuing' },
            ],
        });
    });
    it('saves and deletes a named filter', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const onDelete = vi.fn().mockResolvedValue(undefined);
        render(_jsx(FilterBuilder, { isOpen: true, activeFilter: {
                id: 7,
                name: 'My Filter',
                type: 'series',
                conditions: {
                    operator: 'and',
                    conditions: [{ field: 'status', operator: 'contains', value: 'continuing' }],
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, onClose: vi.fn(), onApply: vi.fn(), onSave: onSave, onDelete: onDelete }));
        fireEvent.change(screen.getByDisplayValue('My Filter'), { target: { value: 'Updated Filter' } });
        fireEvent.click(screen.getByRole('button', { name: 'Update Filter' }));
        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({
                id: 7,
                name: 'Updated Filter',
                conditions: {
                    operator: 'and',
                    conditions: [{ field: 'status', operator: 'contains', value: 'continuing' }],
                },
            });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Delete Filter' }));
        await waitFor(() => {
            expect(onDelete).toHaveBeenCalledWith(7);
        });
    });
});
//# sourceMappingURL=FilterBuilder.test.js.map