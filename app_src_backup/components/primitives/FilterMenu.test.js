import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterMenu } from './FilterMenu';
describe('FilterMenu', () => {
    const mockOnChange = vi.fn();
    const mockOnCustomFilter = vi.fn();
    const defaultOptions = [
        { key: 'all', label: 'All' },
        { key: 'monitored', label: 'Monitored' },
        { key: 'missing', label: 'Missing' },
    ];
    beforeEach(() => {
        mockOnChange.mockClear();
        mockOnCustomFilter.mockClear();
    });
    it('renders correctly with initial value', () => {
        render(_jsx(FilterMenu, { label: "Filter", value: "all", options: defaultOptions, onChange: mockOnChange }));
        expect(screen.getByLabelText('Filter')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter')).toHaveValue('all');
    });
    it('renders with custom label', () => {
        render(_jsx(FilterMenu, { label: "Status", value: "monitored", options: defaultOptions, onChange: mockOnChange }));
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });
    it('renders all options in select dropdown', () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(3);
        expect(options[0]).toHaveValue('all');
        expect(options[0]).toHaveTextContent('All');
        expect(options[1]).toHaveValue('monitored');
        expect(options[1]).toHaveTextContent('Monitored');
        expect(options[2]).toHaveValue('missing');
        expect(options[2]).toHaveTextContent('Missing');
    });
    it('calls onChange when select value changes', async () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        await userEvent.selectOptions(select, 'monitored');
        expect(mockOnChange).toHaveBeenCalledWith('monitored');
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnCustomFilter).not.toHaveBeenCalled();
    });
    it('calls onCustomFilter when custom option is selected', async () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter }));
        const select = screen.getByLabelText(/filter/i);
        await userEvent.selectOptions(select, 'custom');
        expect(mockOnCustomFilter).toHaveBeenCalled();
        expect(mockOnCustomFilter).toHaveBeenCalledTimes(1);
        expect(mockOnChange).not.toHaveBeenCalled();
    });
    it('renders custom option when onCustomFilter is provided', () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter }));
        const select = screen.getByLabelText(/filter/i);
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(4);
        expect(options[3]).toHaveValue('custom');
        expect(options[3]).toHaveTextContent('Custom...');
    });
    it('does not render custom option when onCustomFilter is not provided', () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(3);
        expect(Array.from(options).find(opt => opt.value === 'custom')).toBeUndefined();
    });
    it('shows custom as selected when customFilterActive is true', () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: true }));
        const select = screen.getByLabelText(/filter/i);
        expect(select).toHaveValue('custom');
    });
    it('shows original value when customFilterActive is false', () => {
        render(_jsx(FilterMenu, { value: "monitored", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: false }));
        const select = screen.getByLabelText(/filter/i);
        expect(select).toHaveValue('monitored');
    });
    it('applies correct styling', () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        expect(select).toHaveClass('rounded-sm', 'border', 'border-border-subtle', 'bg-surface-1');
    });
    it('handles multiple value changes', async () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        await userEvent.selectOptions(select, 'monitored');
        expect(mockOnChange).toHaveBeenLastCalledWith('monitored');
        await userEvent.selectOptions(select, 'missing');
        expect(mockOnChange).toHaveBeenLastCalledWith('missing');
        await userEvent.selectOptions(select, 'all');
        expect(mockOnChange).toHaveBeenLastCalledWith('all');
        expect(mockOnChange).toHaveBeenCalledTimes(3);
    });
    it('handles mixed selections with custom option', async () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter }));
        const select = screen.getByLabelText(/filter/i);
        // Select standard option
        await userEvent.selectOptions(select, 'monitored');
        expect(mockOnChange).toHaveBeenCalledWith('monitored');
        // Select custom option
        await userEvent.selectOptions(select, 'custom');
        expect(mockOnCustomFilter).toHaveBeenCalled();
        // Select another standard option
        await userEvent.selectOptions(select, 'missing');
        expect(mockOnChange).toHaveBeenLastCalledWith('missing');
    });
    it('respects the label prop for accessibility', () => {
        render(_jsx(FilterMenu, { label: "Movie Status", value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText('Movie Status');
        expect(select).toBeInTheDocument();
        expect(select).toHaveAccessibleName('Movie Status');
    });
    it('works without onCustomFilter prop', async () => {
        render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        await userEvent.selectOptions(select, 'monitored');
        expect(mockOnChange).toHaveBeenCalledWith('monitored');
        expect(mockOnCustomFilter).not.toHaveBeenCalled();
    });
    describe('custom filter integration', () => {
        it('maintains custom selection when customFilterActive remains true', () => {
            const { rerender } = render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: true }));
            const select = screen.getByLabelText(/filter/i);
            expect(select).toHaveValue('custom');
            // Re-render with same props
            rerender(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: true }));
            expect(select).toHaveValue('custom');
        });
        it('switches back to standard filter when customFilterActive becomes false', () => {
            const { rerender } = render(_jsx(FilterMenu, { value: "all", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: true }));
            const select = screen.getByLabelText(/filter/i);
            expect(select).toHaveValue('custom');
            // Switch customFilterActive to false
            rerender(_jsx(FilterMenu, { value: "monitored", options: defaultOptions, onChange: mockOnChange, onCustomFilter: mockOnCustomFilter, customFilterActive: false }));
            expect(select).toHaveValue('monitored');
        });
    });
    it('handles empty options array', () => {
        render(_jsx(FilterMenu, { value: "", options: [], onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(0);
    });
    it('handles single option', () => {
        const singleOption = [{ key: 'all', label: 'All' }];
        render(_jsx(FilterMenu, { value: "all", options: singleOption, onChange: mockOnChange }));
        const select = screen.getByLabelText(/filter/i);
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveValue('all');
    });
});
//# sourceMappingURL=FilterMenu.test.js.map