import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeriesMonitoringOptionsPopover, MONITORING_OPTIONS, } from './SeriesMonitoringOptionsPopover';
describe('SeriesMonitoringOptionsPopover', () => {
    it('renders with default selected option', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        expect(screen.getByText('All Episodes')).toBeInTheDocument();
    });
    it('displays the correct label for each monitoring option', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "future", onChange: onChange }));
        expect(screen.getByText('Future Episodes')).toBeInTheDocument();
    });
    it('opens popover when button is clicked', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        expect(screen.getByRole('listbox', { name: /monitoring options/i })).toBeInTheDocument();
    });
    it('displays all monitoring options when open', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        MONITORING_OPTIONS.forEach(option => {
            // Use getAllByText since the button also contains the text
            const labels = screen.getAllByText(option.label);
            expect(labels.length).toBeGreaterThan(0);
            expect(screen.getByText(option.description)).toBeInTheDocument();
        });
    });
    it('calls onChange when an option is selected', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        fireEvent.click(screen.getByRole('option', { name: /missing episodes/i }));
        expect(onChange).toHaveBeenCalledWith('missing');
    });
    it('closes popover after selecting an option', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        fireEvent.click(screen.getByRole('option', { name: /pilot episode/i }));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    it('closes popover when clicking outside', () => {
        const onChange = vi.fn();
        render(_jsxs("div", { children: [_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }), _jsx("div", { "data-testid": "outside", children: "Outside" })] }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        fireEvent.mouseDown(screen.getByTestId('outside'));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    it('closes popover when pressing Escape', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    it('disables button when disabled prop is true', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange, disabled: true }));
        expect(screen.getByRole('button')).toBeDisabled();
    });
    it('does not open popover when disabled', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "all", onChange: onChange, disabled: true }));
        fireEvent.click(screen.getByRole('button', { name: /all episodes/i }));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    it('shows aria-selected for the selected option', () => {
        const onChange = vi.fn();
        render(_jsx(SeriesMonitoringOptionsPopover, { value: "none", onChange: onChange }));
        fireEvent.click(screen.getByRole('button', { name: /none/i }));
        const selectedOption = screen.getByRole('option', { name: /none/i, selected: true });
        expect(selectedOption).toBeInTheDocument();
    });
    it.each(['all', 'future', 'missing', 'existing', 'pilot', 'firstSeason', 'none'])('displays correct label for %s option', option => {
        const onChange = vi.fn();
        const config = MONITORING_OPTIONS.find(o => o.value === option);
        render(_jsx(SeriesMonitoringOptionsPopover, { value: option, onChange: onChange }));
        expect(screen.getByText(config.label)).toBeInTheDocument();
    });
});
//# sourceMappingURL=SeriesMonitoringOptionsPopover.test.js.map