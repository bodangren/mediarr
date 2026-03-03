import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterBuilder } from './FilterBuilder';
describe('FilterBuilder', () => {
    it('builds and submits AND/OR filter groups', () => {
        const onApply = vi.fn();
        render(_jsx(FilterBuilder, { fields: [
                { key: 'title', label: 'Title' },
                { key: 'year', label: 'Year' },
            ], onApply: onApply }));
        fireEvent.change(screen.getByLabelText('Group operator'), { target: { value: 'or' } });
        fireEvent.change(screen.getByLabelText('Field 1'), { target: { value: 'title' } });
        fireEvent.change(screen.getByLabelText('Operator 1'), { target: { value: 'contains' } });
        fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: 'release' } });
        fireEvent.click(screen.getByRole('button', { name: /add condition/i }));
        fireEvent.change(screen.getByLabelText('Field 2'), { target: { value: 'year' } });
        fireEvent.change(screen.getByLabelText('Operator 2'), { target: { value: 'gt' } });
        fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: '2020' } });
        fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
        expect(onApply).toHaveBeenCalledWith({
            operator: 'or',
            conditions: [
                { field: 'title', operator: 'contains', value: 'release' },
                { field: 'year', operator: 'gt', value: '2020' },
            ],
        });
    });
});
//# sourceMappingURL=filter-builder.test.js.map